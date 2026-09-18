import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { JsonSchema, OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract, resolveOrvalPackage } from './support/orval-contract';
import { coreApiUrls, elearningApiUrls, group, sessionResponse, userBffUrls } from './support/user-fixtures';

// Les contrats des services amont sont reconstruits depuis les paquets @mairie360/*-openapi installés :
// monter la version dans package.json suffit à tester le BFF contre le nouveau contrat.

const PACKAGES = [
  { name: '@mairie360/bff-user-openapi', title: /^bff_user$/, dependencies: 'devDependencies' },
  { name: '@mairie360/core-api-openapi', title: /^Core API/, dependencies: 'dependencies' },
  { name: '@mairie360/elearning-api-openapi', title: /^ELearning API/, dependencies: 'dependencies' },
] as const;

const userBff = loadOrvalContract('@mairie360/bff-user-openapi');
const coreApi = loadOrvalContract('@mairie360/core-api-openapi');
const elearningApi = loadOrvalContract('@mairie360/elearning-api-openapi');

// Opérations amont réellement appelées par le BFF (src/routes/Elearning/auth.ts, src/routes/check_apis.ts),
// adressées par les helpers d'URL des clients générés.
const CONSUMED = [
  { contract: userBff, operationId: 'getMe', method: 'get', url: userBffUrls.getGetMeUrl() },
  { contract: coreApi, operationId: 'health', method: 'get', url: coreApiUrls.getHealthUrl() },
  { contract: elearningApi, operationId: 'health', method: 'get', url: elearningApiUrls.getHealthUrl() },
] as const;

function responseSchema(contract: OpenApiContract, method: string, url: string, status: number): JsonSchema {
  const match = contract.match(method, new URL(url, 'http://upstream').pathname);
  if (!match) throw new Error(`${method} ${url} absent de ${contract.title}`);
  const { schema } = contract.responseSchema(match, status);
  if (!schema) throw new Error(`Pas de schéma JSON pour ${status} ${method} ${url}`);
  return schema;
}

describe('upstream contracts from the installed @mairie360 OpenAPI packages', () => {
  const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as Record<string, Record<string, string>>;

  test.each(PACKAGES)('$name is $title at the version pinned in package.json', ({ name, title, dependencies }) => {
    expect(loadOrvalContract(name).title).toMatch(title);
    expect(resolveOrvalPackage(name).version).toBe(packageJson[dependencies][name]);
  });

  test.each(CONSUMED)('$contract.title routes $method $url to $operationId', ({ contract, operationId, method, url }) => {
    const { match, errors } = contract.validateRequest(method, new URL(url, 'http://upstream'));
    expect(errors).toEqual([]);
    expect((match?.operation as { operationId?: string } | undefined)?.operationId).toBe(operationId);
  });

  test('GET /me takes no parameter and returns a SessionResponse; errors are not typed by orval', () => {
    const me = userBff.match('GET', userBffUrls.getGetMeUrl())!;
    expect(me.operation.parameters).toEqual([]);
    expect(userBff.responseSchema(me, 200)).toEqual({ documented: true, schema: { $ref: '#/components/schemas/SessionResponse' } });
    expect(userBff.responseSchema(me, 401).documented).toBe(false);
    expect(userBff.schema('SessionResponse')).toMatchObject({ required: ['user', 'groups', 'roles'] });
  });
});

describe('upstream fixtures conform to the upstream contracts', () => {
  test.each([
    ['a regular agent', sessionResponse()],
    ['an administrator without phone nor group', sessionResponse({ role: 'Admin', phone: null }, [])],
    ['a user without role', sessionResponse({ role: undefined }, [group(9)])],
  ])('BFF User GET /me 200 for %s', (_name, body) => {
    expect(userBff.validate(responseSchema(userBff, 'get', userBffUrls.getGetMeUrl(), 200), JSON.parse(JSON.stringify(body)))).toEqual([]);
  });
});

describe('contract validator', () => {
  test('reports missing required properties and wrong types in a session', () => {
    const invalid = { user: { first_name: 'Alice', email: 42, status: 'active' }, groups: [{ id: '1', name: 'Urbanisme' }] };
    expect(userBff.validate(responseSchema(userBff, 'get', userBffUrls.getGetMeUrl(), 200), invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('$.roles: propriété requise manquante'),
      expect.stringContaining('$.user.last_name: propriété requise manquante'),
      expect.stringContaining('$.user.email: type string attendu'),
      expect.stringContaining('$.groups[0].id: type number attendu'),
      expect.stringContaining('$.groups[0].owner_id: propriété requise manquante'),
    ]));
  });

  test('rejects operations absent from the contract', () => {
    expect(userBff.validateRequest('POST', new URL(userBffUrls.getGetMeUrl(), 'http://bff-user')).errors)
      .toEqual([expect.stringContaining(`n'existe pas dans le contrat ${userBff.title}`)]);
    expect(userBff.match('GET', '/elearning/catalog')).toBeUndefined();
  });
});
