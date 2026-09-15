import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { JsonSchema, OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract, resolveOrvalPackage } from './support/orval-contract';
import { group, sessionResponse } from './support/user-fixtures';

// Les contrats des services amont sont reconstruits depuis les paquets @mairie360/*-openapi installés :
// monter la version dans package.json suffit à tester le BFF contre le nouveau contrat.

const PACKAGES = [
  { name: '@mairie360/bff-user-openapi', title: 'bff_user', dependencies: 'devDependencies' },
  { name: '@mairie360/core-api-openapi', title: 'core_api', dependencies: 'dependencies' },
  { name: '@mairie360/elearning-api-openapi', title: 'elearning_api', dependencies: 'dependencies' },
] as const;

// Opérations amont réellement appelées par le BFF (src/routes/Elearning/auth.ts, src/routes/check_apis.ts).
const CONSUMED = [
  { pkg: '@mairie360/bff-user-openapi', operationId: 'getMe', method: 'get', template: '/me' },
  { pkg: '@mairie360/core-api-openapi', operationId: 'health', method: 'get', template: '/health' },
  { pkg: '@mairie360/elearning-api-openapi', operationId: 'health', method: 'get', template: '/health' },
] as const;

const userBff = loadOrvalContract('@mairie360/bff-user-openapi');

function responseSchema(contract: OpenApiContract, method: string, pathname: string, status: number): JsonSchema {
  const match = contract.match(method, pathname);
  if (!match) throw new Error(`${method} ${pathname} absent de ${contract.title}`);
  const { schema } = contract.responseSchema(match, status);
  if (!schema) throw new Error(`Pas de schéma JSON pour ${status} ${method} ${pathname}`);
  return schema;
}

describe('upstream contracts from the installed @mairie360 OpenAPI packages', () => {
  const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as Record<string, Record<string, string>>;

  test.each(PACKAGES)('$name is $title at the version pinned in package.json', ({ name, title, dependencies }) => {
    expect(loadOrvalContract(name).title).toBe(title);
    expect(resolveOrvalPackage(name).version).toBe(packageJson[dependencies][name]);
  });

  test.each(CONSUMED)('$pkg declares $operationId as $method $template', ({ pkg, operationId, method, template }) => {
    const operation = loadOrvalContract(pkg).document.paths[template]?.[method] as { operationId?: string } | undefined;
    expect(operation?.operationId).toBe(operationId);
  });

  test('GET /me takes no parameter and returns a SessionResponse; errors are not typed by orval', () => {
    const me = userBff.match('GET', '/me')!;
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
    expect(userBff.validate(responseSchema(userBff, 'get', '/me', 200), JSON.parse(JSON.stringify(body)))).toEqual([]);
  });
});

describe('contract validator', () => {
  test('reports missing required properties and wrong types in a session', () => {
    const invalid = { user: { first_name: 'Alice', email: 42, status: 'active' }, groups: [{ id: '1', name: 'Urbanisme' }] };
    expect(userBff.validate(responseSchema(userBff, 'get', '/me', 200), invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('$.roles: propriété requise manquante'),
      expect.stringContaining('$.user.last_name: propriété requise manquante'),
      expect.stringContaining('$.user.email: type string attendu'),
      expect.stringContaining('$.groups[0].id: type number attendu'),
      expect.stringContaining('$.groups[0].owner_id: propriété requise manquante'),
    ]));
  });

  test('rejects operations absent from the contract', () => {
    expect(userBff.validateRequest('POST', new URL('http://bff-user/me')).errors)
      .toEqual([expect.stringContaining("n'existe pas dans le contrat bff_user")]);
    expect(userBff.match('GET', '/elearning/catalog')).toBeUndefined();
  });
});
