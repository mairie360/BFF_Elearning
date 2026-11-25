import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import app from '../src/app';
import { ContractMockServer, unreachableUrl, type MockReply } from './support/contract-mock-server';
import { OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract } from './support/orval-contract';
import type { CatalogFile } from '@mairie360/elearning-api-openapi/model';
import {
  bearer, catalogFile, catalogFormation, catalogModule, coreApiUrls, coreMe, elearningApiUrls, formation, group, moduleFile,
} from './support/user-fixtures';
import { captureLogs } from './support/logs';

// The whole app is tested with the real axios clients against real HTTP servers standing in for Core API (profile and
// roles, /check_apis) and E-learning API (courses, progress, /check_apis). No other BFF is called
// (MAIR-525). Their
// contracts are rebuilt from the installed @mairie360/*-openapi packages (versions pinned in package.json): each mock
// rejects routes and parameters absent from the upstream contract and validates its success answers. Errors are not
// typed by orval: every mocked error reply is marked `outOfContract`. Every BFF answer is validated against
// contracts/openapi.json. Mocked bodies are typed by the generated models and the expected paths come from the URL
// helpers of the generated clients.

const coreApi = new ContractMockServer('CORE_API', loadOrvalContract('@mairie360/core-api-openapi'));
const elearningApi = new ContractMockServer('ELEARNING_API', loadOrvalContract('@mairie360/elearning-api-openapi'));
const mocks = [coreApi, elearningApi];
// Templates of the upstream contracts (mock keys); the concrete expected paths come from the URL helpers.
const CORE = { me: '/api/v1/user/me/' } as const;
const ELEARNING = {
  catalog: '/api/v1/formations/catalog/',
  module: '/api/v1/formations/{formationId}/{moduleId}/',
  attachment: '/api/v1/formations/{formationId}/{moduleId}/{attachmentId}/',
  rating: '/api/v1/formations/{formationId}/rating/',
  summary: '/api/v1/formations/summary/',
  certificate: '/api/v1/formations/{formationId}/certificate/',
  certificates: '/api/v1/formations/certificates/',
  adminFormations: '/api/v1/admin/formations/',
  adminFormation: '/api/v1/admin/formations/{formationId}/',
  reminders: '/api/v1/admin/formations/{formationId}/reminders/',
  stats: '/api/v1/admin/stats/',
  users: '/api/v1/admin/users/',
  userFormations: '/api/v1/admin/users/{userId}/',
  userFormation: '/api/v1/admin/users/{userId}/{formationId}/',
  learners: '/api/v1/admin/formations/{formationId}/learners/',
} as const;
const PDF = '%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n';
const pdfReply = (headers: Record<string, string> = {}): MockReply => ({ raw: PDF, contentType: 'application/pdf', headers });
const HEALTH = '/health';
const bffContract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));

beforeAll(async () => { await Promise.all(mocks.map((mock) => mock.start())); });
afterAll(async () => { await Promise.all(mocks.map((mock) => mock.stop())); });
beforeEach(() => {
  for (const mock of mocks) mock.reset();
  // Every upstream URL is read on each request. The APIs are configured as host + port (the docker-compose form);
  // the `http://host:port` form is covered by the /check_apis tests.
  for (const api of [coreApi, elearningApi]) {
    const url = new URL(api.url);
    process.env[`${api.service}_URL`] = url.hostname;
    process.env[`${api.service}_PORT`] = url.port;
  }
});
afterEach(() => {
  jest.restoreAllMocks();
  expect(mocks.flatMap((mock) => mock.violations)).toEqual([]);
});

function expectBffContract(method: string, pathname: string, response: request.Response) {
  const match = bffContract.match(method, pathname);
  expect(match?.template).toBeDefined();
  const { documented, schema } = bffContract.responseSchema(match!, response.status);
  expect({ status: response.status, documented }).toEqual({ status: response.status, documented: true });
  if (schema) expect(bffContract.validate(schema, response.body)).toEqual([]);
}

/** Core API error: a text/plain body, not typed by orval. */
const coreError = (status: number): MockReply => ({ status, raw: 'Session invalide', contentType: 'text/plain', outOfContract: true });
/** E-learning API error: a text/plain body, not typed by orval. */
const elearningError = (status: number): MockReply => ({ status, raw: `upstream detail ${status}`, contentType: 'text/plain', outOfContract: true });

const withSession = (call: request.Test, sub: string | number, claims: object = {}) => call.set('Authorization', bearer(sub, claims));

describe('BFF E-learning with contract-driven upstream mocks', () => {
  describe('caller profile read from Core GET /api/v1/user/me/ (MAIR-525: never through BFF User)', () => {
    test('forwards the caller session to Core and maps its profile', async () => {
      coreApi.on('get', CORE.me, { body: coreMe() });

      const response = await withSession(request(app).get('/elearning/profile'), 2);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user).toEqual({
        id: '2',
        name: 'Alice Martin',
        initials: 'AM',
        email: 'alice.martin@mairie.test',
        phone: '+33123456789',
        service: 'Service urbanisme, Direction générale',
        role: 'User',
        isAdmin: false,
      });
      const [me] = coreApi.calls(CORE.me, 'get');
      expect(coreApi.requests).toHaveLength(1);
      expect(me.url.pathname).toBe(coreApiUrls.getGetMeUrl());
      expect(me.headers.authorization).toBe(bearer(2));
      expect(me.headers.accept).toBe('application/json');
      expect(me.undeclaredQuery).toEqual([]);
    });

    test('omits null optional fields and defaults the role to Guest for a user without role', async () => {
      coreApi.on('get', CORE.me, { body: coreMe({ phone: null, role: '', roles: [] }, []) });

      const response = await withSession(request(app).get('/elearning/profile'), 2);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user).toEqual({
        id: '2', name: 'Alice Martin', initials: 'AM', email: 'alice.martin@mairie.test', role: 'Guest', isAdmin: false,
      });
    });

    test('an admin role anywhere in Core roles makes an administrator, like Core\'s own guard', async () => {
      coreApi.on('get', CORE.me, { body: coreMe({ role: 'User', roles: ['User', 'admin'] }) });

      const response = await withSession(request(app).get('/elearning/profile'), 2);

      expect(response.body.user).toMatchObject({ role: 'User', isAdmin: true });
    });

    test.each([
      ['no Authorization header', undefined],
      ['a non-Bearer scheme', 'Basic YWxpY2U6c2VjcmV0'],
      ['an empty Bearer token', 'Bearer '],
    ])('answers 401 without calling Core for %s', async (_label, authorization) => {
      const call = request(app).get('/elearning/catalog');
      const response = await (authorization ? call.set('Authorization', authorization) : call);

      expect(response.status).toBe(401);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Invalid session.', details: [] } });
      expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
    });

    // MAIR-474: the caller is the `sub` of the token the BFF verified, never an id read from an answer.
    test('takes the user id from the verified token', async () => {
      coreApi.on('get', CORE.me, { body: coreMe() });

      const response = await withSession(request(app).get('/elearning/profile'), 99);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user.id).toBe('99');
    });

    test.each([401, 403])('turns a Core %i into a 401', async (status) => {
      coreApi.on('get', CORE.me, coreError(status));

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-expired');

      expect(response.status).toBe(401);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Invalid session.', details: [] } });
    });

    test('maps a Core 5xx to 502 without leaking the upstream body', async () => {
      coreApi.on('get', CORE.me, { status: 500, raw: 'panic in handler', contentType: 'text/plain', outOfContract: true });

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-500');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
      expect(JSON.stringify(response.body)).not.toContain('panic');
    });

    test.each([404, 409, 422])('turns an undeclared Core %i into a 502', async (status) => {
      coreApi.on('get', CORE.me, coreError(status));

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-odd');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
    });

    test('mair_562 a persistent Core 429 is answered 429 with Retry-After, not 502', async () => {
      coreApi.on('get', CORE.me, { ...coreError(429), headers: { 'Retry-After': '30' } });

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-odd');

      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBe('30');
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.error.code).toBe('TOO_MANY_REQUESTS');
    });

    test.each<[string, MockReply, string]>([
      ['a dropped connection', { dropConnection: true }, 'The CORE_API service is unavailable.'],
      ['a text body', { raw: 'OK', contentType: 'text/plain', outOfContract: true }, 'The CORE_API answer is invalid.'],
      ['a JSON body that is not a profile', { body: { groups: [], roles: [] }, outOfContract: true }, 'The CORE_API answer is invalid.'],
    ])('answers 502 when Core returns %s', async (_label, reply, message) => {
      captureLogs();
      coreApi.on('get', CORE.me, reply);

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-broken');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message, details: [] } });
    });

    test('retries GET /api/v1/user/me/ once on a transient Core failure', async () => {
      let calls = 0;
      coreApi.on('get', CORE.me, () => (++calls === 1 ? coreError(503) : { body: coreMe() }));

      const response = await withSession(request(app).get('/elearning/profile'), 2);

      expect(response.status).toBe(200);
      expect(coreApi.calls(CORE.me, 'get')).toHaveLength(2);
    });

    test('answers 503 when CORE_API_URL is not configured, instead of calling localhost', async () => {
      delete process.env.CORE_API_URL;
      captureLogs();

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-unconfigured');

      expect(response.status).toBe(503);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The CORE_API service is not configured.', details: [] } });
      expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
    });

    test('answers 401 rather than 503 to a caller without session, even when nothing is configured', async () => {
      delete process.env.CORE_API_URL;

      const response = await request(app).get('/elearning/profile');

      expect(response.status).toBe(401);
    });

    test('answers 502 when Core is unreachable', async () => {
      process.env.CORE_API_PORT = new URL(await unreachableUrl()).port;

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-offline');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'The CORE_API service is unavailable.', details: [] } });
    });
  });

  describe('session-bound routes', () => {
    // Every operation that needs a session, with a valid request so that only the session decides the answer.
    const SESSION_ROUTES = [
      ['get', '/elearning/catalog', '/elearning/catalog', undefined],
      ['get', '/elearning/profile', '/elearning/profile', undefined],
      ['post', '/elearning/courses/4/start', '/elearning/courses/{courseId}/start', {}],
      ['post', '/elearning/courses/4/contents/27/complete', '/elearning/courses/{courseId}/contents/{contentId}/complete', { chapterId: '11', completed: true }],
      ['post', '/elearning/courses/4/rating', '/elearning/courses/{courseId}/rating', { rating: 5 }],
      ['post', '/elearning/admin/courses', '/elearning/admin/courses', { id: 'new-course', title: 'Accessibilité', description: 'Cours', duration: '45 min' }],
      ['patch', '/elearning/admin/courses/4', '/elearning/admin/courses/{courseId}', { id: '4', title: 'Accessibilité', description: 'Cours', duration: '45 min' }],
      ['delete', '/elearning/admin/courses/4', '/elearning/admin/courses/{courseId}', undefined],
    ] as const;

    function send(method: string, url: string, body: object | undefined, headers: Record<string, string>) {
      let call = (request(app) as unknown as Record<string, (path: string) => request.Test>)[method](url);
      for (const [name, value] of Object.entries(headers)) call = call.set(name, value);
      return body === undefined ? call : call.send(body);
    }

    test.each(SESSION_ROUTES)('%s %s answers 401 before any upstream call without a Bearer token', async (method, url, template, body) => {
      const response = await send(method, url, body, {});

      expect(response.status).toBe(401);
      expectBffContract(method, template, response);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Invalid session.', details: [] } });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
    });

    test.each([
      ['an accessToken cookie', { Cookie: `accessToken=${bearer(2).slice('Bearer '.length)}` }],
      ['a session cookie', { Cookie: `session=${bearer(2).slice('Bearer '.length)}` }],
      ['an x-session-token header', { 'x-session-token': bearer(2).slice('Bearer '.length) }],
      ['a raw token without the Bearer scheme', { Authorization: bearer(2).slice('Bearer '.length) }],
    ])('ignores %s: only the Authorization Bearer header is a session', async (_label, headers) => {
      const response = await send('get', '/elearning/catalog', undefined, headers);

      expect(response.status).toBe(401);
      expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
    });

    test('forwards the token normalised to `Bearer <token>`', async () => {
      coreApi.on('get', CORE.me, { body: coreMe() });
      const token = bearer(2).slice('Bearer '.length);

      const response = await send('get', '/elearning/profile', undefined, { Authorization: `bearer   ${token}` });

      expect(response.status).toBe(200);
      expect(coreApi.calls(CORE.me, 'get')[0].headers.authorization).toBe(`Bearer ${token}`);
    });

    test('marks session-bound answers as not cacheable, and leaves public ones alone', async () => {
      coreApi.on('get', CORE.me, { body: coreMe() });

      const profile = await withSession(request(app).get('/elearning/profile'), 2);
      const health = await request(app).get('/health');

      expect(profile.headers['cache-control']).toBe('no-store');
      expect(health.headers['cache-control']).toBeUndefined();
    });
  });

  describe('learner routes, served by the E-learning API', () => {
    // Enrolments of the caller as the E-learning API returns them: formation 4 is half done (module 11 completed),
    // formation 9 is not started. PATCH .../{moduleId}/ marks a module completed, as the API does.
    type Enrolment = {
      formation: ReturnType<typeof catalogFormation>;
      chapters: Array<{ module: ReturnType<typeof catalogModule>; files: CatalogFile[] }>;
    };
    let enrolments: Enrolment[];

    beforeEach(() => {
      coreApi.on('get', CORE.me, { body: coreMe() });
      enrolments = [
        {
          formation: catalogFormation(4, 'RGPD pour les agents', 'InProgress'),
          chapters: [
            { module: catalogModule(11, 'Les principes', true), files: [catalogFile(27, 'principes.pdf'), catalogFile(28, 'intro.mp4', 'video', { sort_order: 2 })] },
            { module: catalogModule(12, 'Les obligations'), files: [catalogFile(29, 'registre.pdf')] },
          ],
        },
        { formation: catalogFormation(9, 'Accueil du public'), chapters: [{ module: catalogModule(31, 'Posture'), files: [] }] },
      ];
      const enrolment = (id: string) => enrolments.find((entry) => String(entry.formation.id) === id);
      const chapter = (formationId: string, moduleId: string) =>
        enrolment(formationId)?.chapters.find((entry) => String(entry.module.id) === moduleId);

      elearningApi.on('get', ELEARNING.catalog, () => ({
        body: {
          formations: enrolments.map((entry) => ({
            ...entry.formation,
            modules: entry.chapters.map((chapter) => ({ ...chapter.module, files: chapter.files })),
          })),
        },
      }));
      elearningApi.on('get', ELEARNING.module, ({ pathParams }) => {
        if (!enrolment(pathParams.formationId)) return elearningError(403);
        const found = chapter(pathParams.formationId, pathParams.moduleId);
        return found ? { body: { files: found.files.map(moduleFile) } } : elearningError(404);
      });
      elearningApi.on('patch', ELEARNING.module, ({ pathParams }) => {
        const found = chapter(pathParams.formationId, pathParams.moduleId);
        if (!found) return elearningError(404);
        found.module.completed = true;
        return {};
      });
    });

    test('GET /elearning/catalog shapes the enrolments, chapters and contents of the caller', async () => {
      const response = await withSession(request(app).get('/elearning/catalog'), 2);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body.user).toMatchObject({ id: '2', isAdmin: false });
      expect(response.body.notifications).toEqual({ unreadCount: 0 });
      expect(response.body.catalog).toMatchObject({
        certificationCount: 0,
        categories: [{ label: 'Toutes les categories', value: 'all' }],
        stats: [
          { label: 'Formations disponibles', value: 2 },
          { label: 'En cours', value: 1 },
          { label: 'Terminees', value: 0 },
        ],
      });
      expect(response.body.catalog.adminStats).toBeUndefined();
      const [rgpd, accueil] = response.body.catalog.courses;
      expect(rgpd).toEqual({
        id: '4',
        title: 'RGPD pour les agents',
        description: 'RGPD pour les agents description',
        ratingCount: 0,
        chapters: 2,
        learners: 1,
        mandatory: false,
        source: 'internal',
        statusValue: 'in-progress',
        statusBadge: { label: 'En cours', variant: 'inProgress' },
        progress: 50,
        details: {
          title: 'RGPD pour les agents',
          description: 'RGPD pour les agents description',
          progress: 50,
          completed: false,
          completionRating: { submitted: false, max: 5 },
          chapters: [
            {
              id: '11',
              title: 'Les principes',
              description: 'Les principes description',
              completed: true,
              active: false,
              contents: [
                { id: '27', title: 'principes.pdf', type: 'pdf', fileName: 'principes.pdf', completed: true, required: true },
                { id: '28', title: 'intro.mp4', type: 'video', fileName: 'intro.mp4', completed: true, required: true },
              ],
            },
            {
              id: '12',
              title: 'Les obligations',
              description: 'Les obligations description',
              completed: false,
              active: true,
              contents: [{ id: '29', title: 'registre.pdf', type: 'pdf', fileName: 'registre.pdf', completed: false, required: true }],
            },
          ],
        },
      });
      expect(accueil).toMatchObject({ id: '9', statusValue: 'not-started', progress: 0, chapters: 1 });

      // One E-learning call, on behalf of the caller, through the contract operation.
      expect(elearningApi.requests.map((call) => `${call.method} ${call.url.pathname}`)).toEqual([`GET ${elearningApiUrls.getGetMyCatalogUrl()}`]);
      expect(elearningApi.requests.every((call) => call.headers.authorization === bearer(2))).toBe(true);
    });

    // MAIR-552: reading each formation then each module cost 1 + N + N x M E-learning calls per catalogue (166 for a
    // learner of the perf seed) and saturated the BFF under load (k6 red on main).
    test('GET /elearning/catalog makes one E-learning call whatever the number of courses and chapters', async () => {
      enrolments = Array.from({ length: 15 }, (_, f) => ({
        formation: catalogFormation(100 + f, `Formation ${f}`, 'InProgress'),
        chapters: Array.from({ length: 10 }, (_unused, m) => ({
          module: catalogModule(1000 + 10 * f + m, `Module ${m}`, m < 5),
          files: [catalogFile(5000 + 10 * f + m, `support-${m}.pdf`)],
        })),
      }));

      const response = await withSession(request(app).get('/elearning/catalog?pageSize=50'), 2);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body.catalog.courses).toHaveLength(15);
      expect(response.body.catalog.courses[0]).toMatchObject({ chapters: 10, progress: 50 });
      expect(elearningApi.requests).toHaveLength(1);
    });

    test('answers 502 when a formation of the catalogue has no module list', async () => {
      captureLogs();
      elearningApi.on('get', ELEARNING.catalog, { body: { formations: [formation(4, 'RGPD pour les agents')] }, outOfContract: true });

      const response = await withSession(request(app).get('/elearning/catalog'), 'odd-agent');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'The ELEARNING_API answer is invalid.', details: [] } });
    });

    test('GET /elearning/catalog filters and pages the courses', async () => {
      const response = await withSession(request(app).get('/elearning/catalog?status=not-started&search=accueil&pageSize=10'), 2);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body.catalog.courses.map((course: { id: string }) => course.id)).toEqual(['9']);
    });

    test('GET /elearning/catalog answers an empty catalogue for a caller enrolled nowhere', async () => {
      enrolments = [];

      const response = await withSession(request(app).get('/elearning/catalog'), 'new-agent');

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body.catalog.courses).toEqual([]);
    });

    test('nothing is kept between requests: the catalogue always reflects the E-learning API', async () => {
      await withSession(request(app).get('/elearning/catalog'), 'agent-a');
      enrolments[1].chapters[0].module.completed = true;
      enrolments[1].formation.status = 'Completed';

      const response = await withSession(request(app).get('/elearning/catalog'), 'agent-a');

      expect(response.body.catalog.courses[1]).toMatchObject({ id: '9', statusValue: 'completed', progress: 100 });
    });

    test('validates the catalogue query before resolving the session', async () => {
      const response = await withSession(request(app).get('/elearning/catalog?pageSize=500'), 2);

      expect(response.status).toBe(400);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'BAD_REQUEST', message: 'Validation failed', details: [{ path: 'query.pageSize', message: expect.any(String) }] } });
      expect(coreApi.requests).toHaveLength(0);
      expect(elearningApi.requests).toHaveLength(0);
    });

    test('turns an E-learning API 401 into a 401', async () => {
      elearningApi.on('get', ELEARNING.catalog, elearningError(401));

      const response = await withSession(request(app).get('/elearning/catalog'), 'revoked-agent');

      expect(response.status).toBe(401);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: [] } });
    });

    test.each<[string, MockReply, string]>([
      ['a 500', elearningError(500), 'Upstream service error'],
      ['a dropped connection', { dropConnection: true }, 'The ELEARNING_API service is unavailable.'],
      ['a body without formations', { body: { courses: [] }, outOfContract: true }, 'The ELEARNING_API answer is invalid.'],
    ])('answers 502 without leaking anything when the E-learning API returns %s', async (_label, reply, message) => {
      captureLogs();
      elearningApi.on('get', ELEARNING.catalog, reply);

      const response = await withSession(request(app).get('/elearning/catalog'), 'outage-agent');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message, details: [] } });
      expect(JSON.stringify(response.body)).not.toContain('upstream detail');
    });

    test('retries an E-learning GET once on a transient failure', async () => {
      let calls = 0;
      elearningApi.on('get', ELEARNING.catalog, () => (++calls === 1 ? elearningError(503) : { body: { formations: [] } }));

      const response = await withSession(request(app).get('/elearning/catalog'), 'retry-agent');

      expect(response.status).toBe(200);
      expect(elearningApi.calls(ELEARNING.catalog, 'get')).toHaveLength(2);
    });

    test('never retries the completion PATCH', async () => {
      captureLogs();
      elearningApi.on('patch', ELEARNING.module, elearningError(503));

      const response = await withSession(request(app).post('/elearning/courses/4/contents/29/complete'), 'retry-agent')
        .send({ chapterId: '12', completed: true });

      expect(response.status).toBe(502);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', response);
      expect(elearningApi.calls(ELEARNING.module, 'patch')).toHaveLength(1);
    });

    test('answers 503 when ELEARNING_API_URL is not configured, instead of calling localhost', async () => {
      delete process.env.ELEARNING_API_URL;
      captureLogs();

      const response = await withSession(request(app).get('/elearning/catalog'), 'config-agent');

      expect(response.status).toBe(503);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body.error).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'The ELEARNING_API service is not configured.', details: [] });
      expect(elearningApi.requests).toHaveLength(0);
    });

    test('POST .../complete completes the chapter upstream and returns the progress read again', async () => {
      const response = await withSession(request(app).post('/elearning/courses/4/contents/29/complete'), 'progress-agent')
        .send({ chapterId: '12', completed: true });

      expect(response.status).toBe(200);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', response);
      expect(response.body).toMatchObject({
        progress: 100,
        completed: true,
        completedChapters: 2,
        totalChapters: 2,
        completedRequiredContents: 3,
        totalRequiredContents: 3,
        chapter: { id: '12', completed: true },
        content: { id: '29', completed: true },
      });
      const [complete] = elearningApi.calls(ELEARNING.module, 'patch');
      expect(complete.url.pathname).toBe(elearningApiUrls.getCompleteModuleUrl(4, 12));
      expect(complete.headers.authorization).toBe(bearer('progress-agent'));
    });

    test.each([
      ['a content of another chapter', '4', '27', '12', 'Content not found.', 'params.contentId'],
      ['a chapter of another course', '4', '29', '31', 'Chapter not found.', 'body.chapterId'],
      ['a course the caller is not enrolled in', '77', '29', '12', 'Course not found.', 'params.courseId'],
    ])('POST .../complete answers 404 for %s and writes nothing', async (_label, courseId, contentId, chapterId, message, path) => {
      const response = await withSession(request(app).post(`/elearning/courses/${courseId}/contents/${contentId}/complete`), 'missing-agent')
        .send({ chapterId, completed: true });

      expect(response.status).toBe(404);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', response);
      expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message, details: [{ path, message: expect.any(String) }] } });
      expect(elearningApi.calls(ELEARNING.module, 'patch')).toHaveLength(0);
    });

    test('POST .../complete answers 501 for completed: false, which the E-learning API cannot undo', async () => {
      captureLogs();

      const response = await withSession(request(app).post('/elearning/courses/4/contents/27/complete'), 'undo-agent')
        .send({ chapterId: '11', completed: false });

      expect(response.status).toBe(501);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', response);
      expect(response.body.error.message).toBe('The e-learning service cannot mark a chapter as not completed.');
      expect(elearningApi.requests).toHaveLength(0);
    });

    test('POST .../complete rejects non-numeric identifiers before any upstream call', async () => {
      const response = await withSession(request(app).post('/elearning/courses/accueil-agents/contents/27/complete'), 'odd-agent')
        .send({ chapterId: 'accueil-1', completed: true });

      expect(response.status).toBe(400);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', response);
      expect(response.body.error.details.map((detail: { path: string }) => detail.path)).toEqual(['params.courseId']);
      expect(coreApi.requests).toHaveLength(0);
      expect(elearningApi.requests).toHaveLength(0);
    });

    test('POST .../start returns the course and the next content without writing anything', async () => {
      const started = await withSession(request(app).post('/elearning/courses/4/start'), 'start-agent');

      expect(started.status).toBe(200);
      expectBffContract('post', '/elearning/courses/{courseId}/start', started);
      expect(started.body).toMatchObject({ course: { id: '4', progress: 50 }, nextContentId: '29', redirectUrl: '/courses/4' });
      expect(elearningApi.requests.every((call) => call.method === 'GET')).toBe(true);

      const missing = await withSession(request(app).post('/elearning/courses/77/start'), 'start-agent').send({ source: 'catalog' });
      expect(missing.status).toBe(404);
      expectBffContract('post', '/elearning/courses/{courseId}/start', missing);
      expect(missing.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Course not found.', details: [{ path: 'params.courseId', message: 'No course 77.' }] } });
    });

    // MAIR-1203: ZAP's SQL injection rule sent payloads in the free-text `source` and got 200s it could compare.
    test.each(["catalog' AND '1'='1", 'catalog" OR 1=1 --', 'Catalog', 'a'.repeat(33), '', '<b>'])(
      'MAIR-1203 POST .../start refuses the source %j with a 400, without any call',
      async (source) => {
        const response = await withSession(request(app).post('/elearning/courses/4/start'), 'start-agent').send({ source });

        expect(response.status).toBe(400);
        expectBffContract('post', '/elearning/courses/{courseId}/start', response);
        expect(response.body.error.details.map((detail: { path: string }) => detail.path)).toEqual(['body.source']);
        expect(elearningApi.requests).toHaveLength(0);
      },
    );

    test.each(['catalog', 'profile', 'my-courses', 'home_page'])('MAIR-1203 POST .../start still accepts the source %s', async (source) => {
      const response = await withSession(request(app).post('/elearning/courses/4/start'), 'start-agent').send({ source });

      expect(response.status).toBe(200);
    });

    test.each([
      ['the E-learning API', 500],
      ['the E-learning API', 503],
    ])('MAIR-537 POST .../start maps a %s %i to a documented 502 without its body', async (_api, status) => {
      elearningApi.on('get', ELEARNING.catalog, { status, raw: 'Database error formations', contentType: 'text/plain', outOfContract: true });

      const response = await withSession(request(app).post('/elearning/courses/4/start'), 'start-agent');

      expect(response.status).toBe(502);
      expectBffContract('post', '/elearning/courses/{courseId}/start', response);
      expect(response.body.error.code).toBe('BAD_GATEWAY');
      expect(JSON.stringify(response.body)).not.toContain('Database error');
      expect(elearningApi.requests.every((call) => call.method === 'GET')).toBe(true);
    });

    // MAIR-1150: every V2 field of the catalogue reaches the course, chapters and contents of the front.
    test('MAIR-1150 GET /elearning/catalog maps the E-learning V2 fields, in display order', async () => {
      enrolments = [{
        formation: catalogFormation(4, 'RGPD pour les agents', 'Completed', {
          category: 'Juridique', level: 'intermediate', is_mandatory: true, deadline: '2026-06-30', instructor: 'DPO de la mairie',
          learners: 40, rating_average: 4.25, rating_count: 12, my_rating: 4, source: 'platform',
          started_at: '2026-03-02T08:15:00Z', completed_at: '2026-03-20T16:40:00Z', last_activity_at: '2026-03-20T16:40:00Z',
          last_reminder_at: '2026-03-10T09:00:00Z',
        }),
        chapters: [
          {
            module: catalogModule(12, 'Les obligations', true, { sort_order: 2, duration_seconds: 4500 }),
            files: [
              catalogFile(31, 'quiz', 'quiz', { title: 'Quiz final', sort_order: 3, is_required: false, duration_seconds: 900 }),
              catalogFile(30, 'cnil', 'link', { title: 'Le site de la CNIL', url: 'https://www.cnil.fr/', sort_order: 1, duration_seconds: 600 }),
              catalogFile(32, 'podcast.mp3', 'audio', { title: 'Podcast', description: 'Entretien', sort_order: 2, duration_seconds: 3000 }),
            ],
          },
          {
            module: catalogModule(11, 'Les principes', true, { sort_order: 1, duration_seconds: 3600 }),
            files: [catalogFile(27, 'guide.docx', 'document', { title: 'Guide', duration_seconds: 3600 })],
          },
        ],
      }];

      const response = await withSession(request(app).get('/elearning/catalog'), 2);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body.catalog.categories).toEqual([
        { label: 'Toutes les categories', value: 'all' },
        { label: 'Juridique', value: 'Juridique' },
      ]);
      const [course] = response.body.catalog.courses;
      expect(course).toMatchObject({
        id: '4', category: 'Juridique', level: 'intermediate', levelBadge: { label: 'Intermédiaire', variant: 'intermediate' },
        mandatory: true, titleBadge: { label: 'Obligatoire', variant: 'mandatory' }, deadline: '2026-06-30', instructor: 'DPO de la mairie',
        learners: 40, rating: 4.25, ratingCount: 12, source: 'platform', duration: '2 h 15', durationSeconds: 8100,
        startedAt: '2026-03-02T08:15:00Z', completedAt: '2026-03-20T16:40:00Z', lastActivityAt: '2026-03-20T16:40:00Z',
        lastReminderAt: '2026-03-10T09:00:00Z', statusValue: 'completed', progress: 100,
      });
      expect(course.details).toMatchObject({
        instructor: 'DPO de la mairie', duration: '2 h 15', rating: 4.25, ratingLabel: '4,3 (12 avis)',
        completionRating: { submitted: true, initialValue: 4, max: 5 },
      });
      expect(course.details.chapters.map((chapter: { id: string; duration: string }) => [chapter.id, chapter.duration])).toEqual([['11', '1 h'], ['12', '1 h 15']]);
      expect(course.details.chapters[1].contents).toEqual([
        { id: '30', title: 'Le site de la CNIL', type: 'link', duration: '10 min', durationSeconds: 600, href: 'https://www.cnil.fr/', completed: true, required: true },
        { id: '32', title: 'Podcast', type: 'audio', description: 'Entretien', duration: '50 min', durationSeconds: 3000, fileName: 'podcast.mp3', completed: true, required: true },
        { id: '31', title: 'Quiz final', type: 'quiz', duration: '15 min', durationSeconds: 900, completed: true, required: false },
      ]);
      expect(course.details.chapters[0].contents[0]).toMatchObject({ type: 'document', fileName: 'guide.docx' });
    });

    describe('POST /elearning/courses/{courseId}/rating', () => {
      test('stores the rating upstream and returns the rating of the course', async () => {
        elearningApi.on('post', ELEARNING.rating, { body: { rating_average: 4.5, rating_count: 12, my_rating: 5 } });

        const response = await withSession(request(app).post('/elearning/courses/4/rating'), 'rating-agent').send({ rating: 5 });

        expect(response.status).toBe(200);
        expectBffContract('post', '/elearning/courses/{courseId}/rating', response);
        expect(response.body).toEqual({ rating: 4.5, ratingCount: 12, ratingLabel: '4,5 (12 avis)', myRating: 5, ratingDistribution: {}, submitted: true });
        const [call] = elearningApi.calls(ELEARNING.rating, 'post');
        expect(call.url.pathname).toBe(elearningApiUrls.getRateFormationUrl(4));
        expect(call.body).toEqual({ rating: 5 });
        expect(call.headers.authorization).toBe(bearer('rating-agent'));
        // MAIR-525: no profile read.
        expect(coreApi.requests).toHaveLength(0);
      });

      test.each([
        [403, 404, 'Course not found.'],
        [404, 404, 'Course not found.'],
        [409, 409, 'The course must be completed before it is rated.'],
      ])('maps an E-learning %i to %i', async (upstream, status, message) => {
        elearningApi.on('post', ELEARNING.rating, elearningError(upstream));

        const response = await withSession(request(app).post('/elearning/courses/4/rating'), 'rating-agent').send({ rating: 3 });

        expect(response.status).toBe(status);
        expectBffContract('post', '/elearning/courses/{courseId}/rating', response);
        expect(response.body.error.message).toBe(message);
        expect(elearningApi.calls(ELEARNING.rating, 'post')).toHaveLength(1);
      });

      test('validates the rating before any upstream call, and answers 502 to an unusable answer', async () => {
        captureLogs();
        const invalid = await withSession(request(app).post('/elearning/courses/4/rating'), 'rating-agent').send({ rating: 7 });
        expect(invalid.status).toBe(400);
        expectBffContract('post', '/elearning/courses/{courseId}/rating', invalid);
        expect(elearningApi.requests).toHaveLength(0);

        elearningApi.on('post', ELEARNING.rating, { body: { rating: 5 }, outOfContract: true });
        const broken = await withSession(request(app).post('/elearning/courses/4/rating'), 'rating-agent').send({ rating: 5 });
        expect(broken.status).toBe(502);
        expectBffContract('post', '/elearning/courses/{courseId}/rating', broken);
      });
    });

    describe('GET /elearning/training-time', () => {
      const summary = {
        year: 2026, annual_goal_minutes: 600, time_spent_seconds: 5400, completed_count: 1,
        formations: [
          { id: 4, name: 'RGPD pour les agents', status: 'Completed' as const, time_spent_seconds: 3600, completed_at: '2026-03-20T16:40:00Z' },
          { id: 9, name: 'Accueil du public', status: 'InProgress' as const, time_spent_seconds: 1800, completed_at: null },
          { id: 10, name: 'Archives', status: 'Error' as const, time_spent_seconds: 0 },
        ],
      };

      test('maps the yearly summary of the caller', async () => {
        elearningApi.on('get', ELEARNING.summary, { body: summary });

        const response = await withSession(request(app).get('/elearning/training-time?year=2026'), 'time-agent');

        expect(response.status).toBe(200);
        expectBffContract('get', '/elearning/training-time', response);
        expect(response.body).toEqual({
          year: 2026, goalMinutes: 600, timeSpentSeconds: 5400, completedCount: 1,
          courses: [
            { id: '4', title: 'RGPD pour les agents', status: 'completed', timeSpentSeconds: 3600, completedAt: '2026-03-20T16:40:00Z' },
            { id: '9', title: 'Accueil du public', status: 'in-progress', timeSpentSeconds: 1800, completedAt: null },
            { id: '10', title: 'Archives', status: 'not-started', timeSpentSeconds: 0, completedAt: null },
          ],
        });
        const [call] = elearningApi.calls(ELEARNING.summary, 'get');
        expect(call.url.searchParams.get('year')).toBe('2026');
        expect(call.undeclaredQuery).toEqual([]);
      });

      test('defaults to the current year of the E-learning API', async () => {
        elearningApi.on('get', ELEARNING.summary, { body: { ...summary, formations: [] } });

        const response = await withSession(request(app).get('/elearning/training-time'), 'time-agent');

        expect(response.status).toBe(200);
        expect(elearningApi.calls(ELEARNING.summary, 'get')[0].url.search).toBe('');
      });

      test.each(['1999', '2101', 'soon'])('refuses year=%s before any upstream call', async (year) => {
        const response = await withSession(request(app).get(`/elearning/training-time?year=${year}`), 'time-agent');

        expect(response.status).toBe(400);
        expectBffContract('get', '/elearning/training-time', response);
        expect(response.body.error.details[0].path).toBe('query.year');
        expect(elearningApi.requests).toHaveLength(0);
      });

      test('maps an E-learning 400 to a 400 on the year, and an unusable answer to a 502', async () => {
        captureLogs();
        elearningApi.on('get', ELEARNING.summary, elearningError(400));
        const refused = await withSession(request(app).get('/elearning/training-time?year=2026'), 'time-agent');
        expect(refused.status).toBe(400);
        expectBffContract('get', '/elearning/training-time', refused);
        expect(refused.body.error.details).toEqual([{ path: 'query.year', message: 'Expected a year from 2000 to 2100.' }]);

        elearningApi.on('get', ELEARNING.summary, { body: { year: 2026 }, outOfContract: true });
        const broken = await withSession(request(app).get('/elearning/training-time'), 'time-agent');
        expect(broken.status).toBe(502);
        expectBffContract('get', '/elearning/training-time', broken);
      });
    });

    describe('PDF attestations', () => {
      const binary = (call: request.Test) => call.buffer(true).parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });

      test('GET /elearning/courses/{courseId}/certificate streams the PDF with its file name', async () => {
        elearningApi.on('get', ELEARNING.certificate, pdfReply({ 'Content-Disposition': 'attachment; filename="attestation-4.pdf"' }));

        const response = await binary(withSession(request(app).get('/elearning/courses/4/certificate'), 'pdf-agent'));

        expect(response.status).toBe(200);
        expectBffContract('get', '/elearning/courses/{courseId}/certificate', response);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toBe('attachment; filename="attestation-4.pdf"');
        expect((response.body as Buffer).toString('latin1')).toBe(PDF);
        const [call] = elearningApi.calls(ELEARNING.certificate, 'get');
        expect(call.url.pathname).toBe(elearningApiUrls.getGetCertificateUrl(4));
        expect(call.headers.authorization).toBe(bearer('pdf-agent'));
        expect(call.headers.accept).toBe('application/pdf');
      });

      test('names the file itself when the E-learning API gives no safe name', async () => {
        elearningApi.on('get', ELEARNING.certificate, pdfReply({ 'Content-Disposition': 'attachment; filename="../../etc/passwd"' }));

        const response = await binary(withSession(request(app).get('/elearning/courses/4/certificate'), 'pdf-agent'));

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toBe('attachment; filename="attestation-4.pdf"');
      });

      test.each([
        [403, 404, 'Course not found.'],
        [404, 404, 'Course not found.'],
        [409, 409, 'The course is not completed yet.'],
      ])('maps an E-learning %i to %i', async (upstream, status, message) => {
        elearningApi.on('get', ELEARNING.certificate, elearningError(upstream));

        const response = await withSession(request(app).get('/elearning/courses/4/certificate'), 'pdf-agent');

        expect(response.status).toBe(status);
        expectBffContract('get', '/elearning/courses/{courseId}/certificate', response);
        expect(response.body.error.message).toBe(message);
      });

      test('answers 502 when the E-learning API does not answer a PDF', async () => {
        captureLogs();
        elearningApi.on('get', ELEARNING.certificate, { raw: '{"oops":true}', contentType: 'application/json' });

        const response = await withSession(request(app).get('/elearning/courses/4/certificate'), 'pdf-agent');

        expect(response.status).toBe(502);
        expectBffContract('get', '/elearning/courses/{courseId}/certificate', response);
        expect(response.body.error.message).toBe('The ELEARNING_API answer is invalid.');
      });

      test('GET /elearning/certificates streams the attestations of the year', async () => {
        elearningApi.on('get', ELEARNING.certificates, pdfReply());

        const response = await binary(withSession(request(app).get('/elearning/certificates?year=2026'), 'pdf-agent'));

        expect(response.status).toBe(200);
        expectBffContract('get', '/elearning/certificates', response);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toBe('attachment; filename="attestations-2026.pdf"');
        expect((response.body as Buffer).toString('latin1')).toBe(PDF);
        expect(elearningApi.calls(ELEARNING.certificates, 'get')[0].url.searchParams.get('year')).toBe('2026');
      });

      test('GET /elearning/certificates names the current year by default', async () => {
        elearningApi.on('get', ELEARNING.certificates, pdfReply());

        const response = await binary(withSession(request(app).get('/elearning/certificates'), 'pdf-agent'));

        expect(response.headers['content-disposition']).toBe(`attachment; filename="attestations-${new Date().getUTCFullYear()}.pdf"`);
      });

      test.each([
        [404, 404, 'No course completed during this year.'],
        [400, 400, 'Invalid year.'],
      ])('GET /elearning/certificates maps an E-learning %i to %i', async (upstream, status, message) => {
        elearningApi.on('get', ELEARNING.certificates, elearningError(upstream));

        const response = await withSession(request(app).get('/elearning/certificates?year=2025'), 'pdf-agent');

        expect(response.status).toBe(status);
        expectBffContract('get', '/elearning/certificates', response);
        expect(response.body.error.message).toBe(message);
      });
    });

    describe('GET /elearning/courses/{courseId}/chapters/{chapterId}/contents/{contentId}/file', () => {
      const route = '/elearning/courses/{courseId}/chapters/{chapterId}/contents/{contentId}/file';

      test('returns the signed URL of the stored file', async () => {
        elearningApi.on('get', ELEARNING.attachment, { body: { url: 'https://s3.example/principes.pdf?X-Amz-Signature=abc' } });

        const response = await withSession(request(app).get('/elearning/courses/4/chapters/11/contents/27/file'), 'file-agent');

        expect(response.status).toBe(200);
        expectBffContract('get', route, response);
        expect(response.body).toEqual({ url: 'https://s3.example/principes.pdf?X-Amz-Signature=abc' });
        const [call] = elearningApi.calls(ELEARNING.attachment, 'get');
        expect(call.url.pathname).toBe(elearningApiUrls.getGetAttachmentUrlUrl(4, 11, 27));
        expect(call.headers.authorization).toBe(bearer('file-agent'));
      });

      test.each([
        [403, 'Course not found.', 'params.courseId'],
        [404, 'File not found.', 'params.contentId'],
      ])('maps an E-learning %i to a 404', async (upstream, message, path) => {
        elearningApi.on('get', ELEARNING.attachment, elearningError(upstream));

        const response = await withSession(request(app).get('/elearning/courses/4/chapters/11/contents/30/file'), 'file-agent');

        expect(response.status).toBe(404);
        expectBffContract('get', route, response);
        expect(response.body.error).toMatchObject({ message, details: [{ path }] });
      });

      test('refuses non-numeric ids before any call, and an answer without URL', async () => {
        captureLogs();
        const invalid = await withSession(request(app).get('/elearning/courses/4/chapters/intro/contents/27/file'), 'file-agent');
        expect(invalid.status).toBe(400);
        expectBffContract('get', route, invalid);
        expect(elearningApi.requests).toHaveLength(0);

        elearningApi.on('get', ELEARNING.attachment, { body: { url: '' }, outOfContract: true });
        const broken = await withSession(request(app).get('/elearning/courses/4/chapters/11/contents/27/file'), 'file-agent');
        expect(broken.status).toBe(502);
      });
    });
  });

  describe('profile', () => {
    test('GET /elearning/profile returns the Core profile', async () => {
      coreApi.on('get', CORE.me, { body: coreMe() });

      const response = await withSession(request(app).get('/elearning/profile'), 2);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user).toMatchObject({ id: '2', email: 'alice.martin@mairie.test', phone: '+33123456789' });
      expect(coreApi.calls(CORE.me, 'patch')).toHaveLength(0);
    });

    // A user edits their own profile in Settings only. This BFF used to relay e-mail and phone changes to
    // Core without the current password, which Core refuses with a 403 the route did not declare: the agent got a 502.
    test('MAIR-684 PATCH /elearning/profile is not served and never reaches Core', async () => {
      coreApi.on('get', CORE.me, { body: coreMe() });

      const response = await withSession(request(app).patch('/elearning/profile'), 2).send({ email: 'new@mairie.test', phone: '+33612345678' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found', details: [] } });
      expect(coreApi.calls(CORE.me, 'patch')).toHaveLength(0);

      const reloaded = await withSession(request(app).get('/elearning/profile'), 2);
      expect(reloaded.status).toBe(200);
      expect(reloaded.body.user).toMatchObject({ email: 'alice.martin@mairie.test', phone: '+33123456789' });
    });

    test('MAIR-684 the contract declares the profile as read-only', () => {
      const contract = JSON.parse(readFileSync(path.join(__dirname, '..', 'contracts', 'openapi.json'), 'utf8')) as {
        paths: Record<string, Record<string, unknown>>;
        components: { schemas: Record<string, unknown> };
      };

      expect(Object.keys(contract.paths['/elearning/profile'])).toEqual(['get']);
      expect(contract.components.schemas).not.toHaveProperty('UpdateProfileBody');
      expect(contract.components.schemas).not.toHaveProperty('ProfileUpdateResponse');
    });

    // MAIR-290: the cause of an upstream 502 is the axios error, which holds the caller's Bearer token and the
    // response body. Whatever the BFF writes (JSON log lines on stdout, stderr, console) about the failure describes
    // it by its type and status, never by these values.
    test('MAIR-290 logs an upstream failure without the token or the upstream body', async () => {
      const stdout = captureLogs();
      const stderr: string[] = [];
      jest.spyOn(process.stderr, 'write').mockImplementation(((chunk: string | Uint8Array) => {
        stderr.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
        jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
          stderr.push(args.map((arg) => (arg instanceof Error ? `${arg.stack} ${JSON.stringify(arg)}` : typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
        });
      }
      const authorization = bearer(2);
      coreApi.on('get', CORE.me, { status: 500, raw: 'Lookup failed for Jeanne Marker-290', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/elearning/profile').set('Authorization', authorization);

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      const written = [...stdout.map((line) => JSON.stringify(line)), ...stderr].join('\n');
      expect(written).toContain('502');
      for (const value of [authorization.replace(/^Bearer /, ''), 'Marker-290']) {
        expect(written).not.toContain(value);
      }
    });

    test('hides unexpected errors behind a generic 500', async () => {
      captureLogs();
      coreApi.on('get', CORE.me, { body: coreMe() });
      const helpers = await import('../src/routes/Elearning/elearning_helpers');
      jest.spyOn(helpers, 'footer').mockImplementation(() => { throw new Error('secret stack detail'); });

      const response = await withSession(request(app).get('/elearning/profile'), 'crash-agent');

      expect(response.status).toBe(500);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: [] } });
      expect(JSON.stringify(response.body)).not.toContain('secret');
    });
  });

  describe('administration routes', () => {
    const course = {
      id: 'contract-mock-course',
      title: 'Accessibilité numérique',
      description: 'Rendre les démarches en ligne accessibles.',
      duration: '45 min',
    };

    test.each(['Admin', 'admin', 'ADMIN'])('a Core role %s creates, updates and deletes courses through the E-learning API', async (role) => {
      coreApi.on('get', CORE.me, { body: coreMe({ role: 'User', roles: ['User', role] }) });
      elearningApi.on('post', ELEARNING.adminFormations, { status: 200, body: { id: 42 } });
      elearningApi.on('patch', ELEARNING.adminFormation, { body: { id: 4 } });
      elearningApi.on('delete', ELEARNING.adminFormation, { status: 204 });

      const created = await withSession(request(app).post('/elearning/admin/courses'), 'admin-agent').send(course);
      const updated = await withSession(request(app).patch('/elearning/admin/courses/4'), 'admin-agent').send(course);
      const removed = await withSession(request(app).delete('/elearning/admin/courses/4'), 'admin-agent');

      expect(created.status).toBe(201);
      expectBffContract('post', '/elearning/admin/courses', created);
      expect(created.body).toMatchObject({ id: '42', course: { id: '42', title: course.title, mandatory: false, source: 'internal' } });
      expect(updated.status).toBe(200);
      expectBffContract('patch', '/elearning/admin/courses/{courseId}', updated);
      expect(updated.body.id).toBe('4');
      expect(removed.status).toBe(200);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', removed);
      expect(removed.body).toEqual({ deleted: true, courseId: '4' });
      expect(elearningApi.calls(ELEARNING.adminFormations, 'post')[0].body).toEqual({
        name: course.title, description: course.description, category: null, level: null, is_mandatory: false, deadline: null,
        source: 'internal', instructor: null, modules: [],
      });
      expect(elearningApi.calls(ELEARNING.adminFormation, 'delete')[0].url.pathname).toBe(elearningApiUrls.getDeleteFormationUrl(4));
      expect(elearningApi.requests.every((call) => call.headers.authorization === bearer('admin-agent'))).toBe(true);
    });

    // A course as the admin form of the front sends it: badges, human durations, a French deadline, ids of kept rows
    // (decimal) and of rows just added (anything else).
    const edited = {
      id: '4',
      title: '  RGPD pour les agents  ',
      description: 'Les bases',
      category: 'Juridique',
      levelBadge: { label: 'Avancé' },
      titleBadge: { label: 'Obligatoire', variant: 'mandatory' as const },
      deadline: '1er mars 2027',
      source: 'platform' as const,
      details: {
        title: 'RGPD', description: 'Les bases', instructor: 'DPO', chapters: [
          {
            id: '11', title: 'Les principes', contents: [
              { id: '27', title: 'Guide', type: 'pdf' as const, duration: '1 h 30', required: true },
              { id: 'new-1', title: 'CNIL', type: 'link' as const, href: 'https://www.cnil.fr/', duration: '12:30', required: false, description: 'Site' },
            ],
          },
          { id: 'chapter-new', title: 'Quiz', description: '  ', contents: [{ id: 'q', title: 'Quiz', type: 'quiz' as const, durationSeconds: 300 }] },
        ],
      },
    };

    test('MAIR-1150 PATCH maps the course of the front to the E-learning body and keeps the existing rows', async () => {
      elearningApi.on('patch', ELEARNING.adminFormation, { body: { id: 4 } });

      const response = await withSession(request(app).patch('/elearning/admin/courses/4'), 'jwt-admin', { role: 'admin' }).send(edited);

      expect(response.status).toBe(200);
      expectBffContract('patch', '/elearning/admin/courses/{courseId}', response);
      const [call] = elearningApi.calls(ELEARNING.adminFormation, 'patch');
      expect(call.url.pathname).toBe(elearningApiUrls.getUpdateFormationUrl(4));
      expect(call.body).toEqual({
        name: 'RGPD pour les agents', description: 'Les bases', category: 'Juridique', level: 'advanced', is_mandatory: true,
        deadline: '2027-03-01', source: 'platform', instructor: 'DPO',
        modules: [
          {
            id: 11, name: 'Les principes', description: null, files: [
              { id: 27, title: 'Guide', description: null, file_type: 'pdf', duration_seconds: 5400, is_required: true },
              { title: 'CNIL', description: 'Site', file_type: 'link', duration_seconds: 750, is_required: false, url: 'https://www.cnil.fr/' },
            ],
          },
          { name: 'Quiz', description: null, files: [{ title: 'Quiz', description: null, file_type: 'quiz', duration_seconds: 300, is_required: true }] },
        ],
      });
      expect(response.body.course).toMatchObject({
        id: '4', title: 'RGPD pour les agents', level: 'advanced', levelBadge: { label: 'Avancé', variant: 'advanced' },
        mandatory: true, titleBadge: { label: 'Obligatoire', variant: 'mandatory' }, deadline: '2027-03-01', source: 'platform', category: 'Juridique',
      });
      // MAIR-525: the role claim of the token is enough.
      expect(coreApi.requests).toHaveLength(0);
    });

    test('POST sends no id: every chapter and content of a new course is new', async () => {
      elearningApi.on('post', ELEARNING.adminFormations, { body: { id: 43 } });
      const fresh = {
        ...edited, level: 'beginner' as const, mandatory: false, deadline: '2027-01-15T00:00:00Z',
        details: { ...edited.details, chapters: [{ ...edited.details.chapters[0], contents: [edited.details.chapters[0].contents[1]] }] },
      };

      const response = await withSession(request(app).post('/elearning/admin/courses'), 'jwt-admin', { role: 'admin' }).send(fresh);

      expect(response.status).toBe(201);
      expectBffContract('post', '/elearning/admin/courses', response);
      const [call] = elearningApi.calls(ELEARNING.adminFormations, 'post');
      expect(call.body).toMatchObject({
        level: 'beginner', is_mandatory: false, deadline: '2027-01-15',
        modules: [{ name: 'Les principes', files: [{ title: 'CNIL', file_type: 'link', url: 'https://www.cnil.fr/' }] }],
      });
      expect((call.body as { modules: Array<Record<string, unknown>> }).modules[0]).not.toHaveProperty('id');
      expect(response.body).toMatchObject({ id: '43', course: { id: '43', level: 'beginner', mandatory: false } });
      expect(response.body.course).not.toHaveProperty('titleBadge');
    });

    test('refuses the values the E-learning API would refuse, naming each field, before any call', async () => {
      const invalid = {
        ...edited,
        title: ' ',
        deadline: 'bientôt',
        details: {
          ...edited.details,
          chapters: [{
            id: 'n', title: 'Nouveau', contents: [
              { id: 'n1', title: 'Vidéo', type: 'video' as const },
              { id: 'n2', title: 'Lien', type: 'link' as const, href: 'http://insecure.example' },
              { id: 'n3', title: 'Quiz', type: 'quiz' as const, duration: 'deux heures' },
            ],
          }],
        },
      };

      const response = await withSession(request(app).patch('/elearning/admin/courses/4'), 'jwt-admin', { role: 'admin' }).send(invalid);

      expect(response.status).toBe(400);
      expectBffContract('patch', '/elearning/admin/courses/{courseId}', response);
      expect(response.body.error.details.map((detail: { path: string }) => detail.path)).toEqual([
        'body.title',
        'body.deadline',
        'body.details.chapters.0.contents.0.type',
        'body.details.chapters.0.contents.1.href',
        'body.details.chapters.0.contents.2.duration',
      ]);
      expect(elearningApi.requests).toHaveLength(0);
    });

    test.each<[string, string | undefined]>([
      ['url must be an absolute https URL', 'body.href'],
      ['modules[0].files[1].duration_seconds is negative', 'body.duration'],
      ['invalid request', undefined],
    ])('maps an E-learning 400 "%s" to a 400 without relaying its text', async (text, path) => {
      elearningApi.on('post', ELEARNING.adminFormations, { status: 400, raw: text, contentType: 'text/plain', outOfContract: true });

      const response = await withSession(request(app).post('/elearning/admin/courses'), 'jwt-admin', { role: 'admin' }).send(course);

      expect(response.status).toBe(400);
      expectBffContract('post', '/elearning/admin/courses', response);
      expect(response.body.error.message).toBe('The e-learning service refused the course.');
      expect(response.body.error.details).toEqual(path ? [{ path, message: 'Refused by the e-learning service.' }] : []);
      expect(JSON.stringify(response.body)).not.toContain(text);
    });

    test.each([
      ['patch', 404, 404],
      ['patch', 403, 403],
      ['delete', 404, 404],
      ['delete', 403, 403],
    ] as const)('%s maps an E-learning %i to %i', async (method, upstream, status) => {
      elearningApi.on(method, ELEARNING.adminFormation, elearningError(upstream));

      const call = withSession(request(app)[method]('/elearning/admin/courses/4'), 'jwt-admin', { role: 'admin' });
      const response = await (method === 'patch' ? call.send(course) : call);

      expect(response.status).toBe(status);
      expectBffContract(method, '/elearning/admin/courses/{courseId}', response);
    });

    describe('POST /elearning/admin/courses/{courseId}/reminders', () => {
      const route = '/elearning/admin/courses/{courseId}/reminders';

      test('reminds every late agent without a body, the given agents otherwise', async () => {
        elearningApi.on('post', ELEARNING.reminders, { body: { sent: 3 } });

        const all = await withSession(request(app).post('/elearning/admin/courses/1010/reminders'), 'jwt-admin', { role: 'admin' });
        const some = await withSession(request(app).post('/elearning/admin/courses/1010/reminders'), 'jwt-admin', { role: 'admin' }).send({ userIds: ['42', '7'] });

        for (const response of [all, some]) {
          expect(response.status).toBe(200);
          expectBffContract('post', route, response);
          expect(response.body).toEqual({ sent: 3 });
        }
        const calls = elearningApi.calls(ELEARNING.reminders, 'post');
        expect(calls[0].url.pathname).toBe(elearningApiUrls.getSendRemindersUrl(1010));
        expect(calls.map((call) => call.body)).toEqual([{}, { user_ids: [42, 7] }]);
      });

      test.each([
        [404, 404, 'Course not found.'],
        [409, 409, 'Reminders are only sent for a mandatory course.'],
        [403, 403, 'This action is restricted to administrators.'],
      ])('maps an E-learning %i to %i', async (upstream, status, message) => {
        elearningApi.on('post', ELEARNING.reminders, elearningError(upstream));

        const response = await withSession(request(app).post('/elearning/admin/courses/4/reminders'), 'jwt-admin', { role: 'admin' }).send({});

        expect(response.status).toBe(status);
        expectBffContract('post', route, response);
        expect(response.body.error.message).toBe(message);
      });

      test('forbids non-administrators and refuses non-numeric user ids before any call', async () => {
        const agent = await withSession(request(app).post('/elearning/admin/courses/4/reminders'), 'jwt-agent', { role: 'User' }).send({});
        expect(agent.status).toBe(403);
        expectBffContract('post', route, agent);

        const invalid = await withSession(request(app).post('/elearning/admin/courses/4/reminders'), 'jwt-admin', { role: 'admin' }).send({ userIds: ['alice'] });
        expect(invalid.status).toBe(400);
        expectBffContract('post', route, invalid);
        expect(invalid.body.error.details[0].path).toBe('body.userIds.0');
        expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
      });
    });

    describe('GET /elearning/admin/stats', () => {
      test('maps the indicators of the E-learning API', async () => {
        elearningApi.on('get', ELEARNING.stats, {
          body: {
            internal_courses: 12, platform_courses: 30, mandatory_internal_courses: 3, agents: 120, participants: 95,
            participation_rate: 79.2, average_completion: 61.4, late_mandatory: 1,
            by_service: [
              { service_id: 3, service_name: 'Urbanisme', agents: 25, participants: 20, participation_rate: 80 },
              { service_id: null, service_name: null, agents: 5, participants: 1, participation_rate: 20 },
            ],
            by_formation: [{ id: 4, name: 'RGPD', source: 'internal', is_mandatory: true, enrolled: 40, completed: 12, average_progress: 47.5 }],
            late_agents: [{
              user_id: 42, first_name: 'Alice', last_name: 'Martin', formation_id: 4, formation_name: 'RGPD', deadline: '2026-06-30',
              progress: 50, last_reminder_at: null,
            }],
          },
        });

        const response = await withSession(request(app).get('/elearning/admin/stats'), 'jwt-admin', { role: 'admin' });

        expect(response.status).toBe(200);
        expectBffContract('get', '/elearning/admin/stats', response);
        expect(response.body).toEqual({
          internalCourses: 12, platformCourses: 30, mandatoryInternalCourses: 3, agents: 120, participants: 95,
          participationRate: 79.2, averageCompletion: 61.4, lateMandatory: 1,
          byService: [
            { serviceId: '3', serviceName: 'Urbanisme', agents: 25, participants: 20, participationRate: 80 },
            { serviceId: null, serviceName: null, agents: 5, participants: 1, participationRate: 20 },
          ],
          byCourse: [{ id: '4', title: 'RGPD', source: 'internal', mandatory: true, enrolled: 40, completed: 12, averageProgress: 47.5 }],
          lateAgents: [{
            userId: '42', firstName: 'Alice', lastName: 'Martin', courseId: '4', courseTitle: 'RGPD', deadline: '2026-06-30',
            progress: 50, lastReminderAt: null,
          }],
        });
        expect(elearningApi.calls(ELEARNING.stats, 'get')[0].headers.authorization).toBe(bearer('jwt-admin', { role: 'admin' }));
      });

      test('forbids non-administrators without calling the E-learning API', async () => {
        const response = await withSession(request(app).get('/elearning/admin/stats'), 'jwt-agent', { role: 'User' });

        expect(response.status).toBe(403);
        expectBffContract('get', '/elearning/admin/stats', response);
        expect(elearningApi.requests).toHaveLength(0);
      });

      test('relays an E-learning 403 and answers 502 to an unusable answer', async () => {
        captureLogs();
        elearningApi.on('get', ELEARNING.stats, elearningError(403));
        const refused = await withSession(request(app).get('/elearning/admin/stats'), 'jwt-admin', { role: 'admin' });
        expect(refused.status).toBe(403);
        expectBffContract('get', '/elearning/admin/stats', refused);

        elearningApi.on('get', ELEARNING.stats, { body: { agents: 1 }, outOfContract: true });
        const broken = await withSession(request(app).get('/elearning/admin/stats'), 'jwt-admin', { role: 'admin' });
        expect(broken.status).toBe(502);
        expectBffContract('get', '/elearning/admin/stats', broken);
      });
    });

    describe('MAIR-817 enrolment of agents by an administrator', () => {
      const asAdmin = (call: request.Test) => withSession(call, 'jwt-admin', { role: 'admin' });
      const asAgent = (call: request.Test) => withSession(call, 'jwt-agent', { role: 'User' });
      const enrolment = (id: number, status: 'NotStarted' | 'InProgress' | 'Completed', fields: object = {}) => ({
        id, name: `Formation ${id}`, description: '', progress_status: status, started_at: null, completed_at: null, ...fields,
      });

      describe('GET /elearning/admin/courses/{courseId}/learners', () => {
        const route = '/elearning/admin/courses/{courseId}/learners';
        const learner = (userId: number, firstName: string, lastName: string, fields: object = {}) => ({
          user_id: userId, first_name: firstName, last_name: lastName, status: 'NotStarted', progress: 0,
          started_at: null, completed_at: null, last_activity_at: null, last_reminder_at: null, ...fields,
        });

        test('relays one page of learners with their status, progress and dates, in one call', async () => {
          elearningApi.on('get', ELEARNING.learners, {
            body: {
              formation_id: 4, total: 11, limit: 3, offset: 8,
              learners: [
                learner(1, 'Security', 'Admin', {
                  status: 'Completed', progress: 100, started_at: '2026-03-02T09:15:00', completed_at: '2026-03-04T10:00:00',
                  last_activity_at: '2026-03-04T10:00:00',
                }),
                learner(2, 'Jean Pierre', 'Durand', {
                  status: 'InProgress', progress: 33, started_at: '2026-03-05T08:00:00', last_activity_at: '2026-03-05T08:00:00',
                  last_reminder_at: '2026-03-10T07:30:00',
                }),
                learner(5, 'Nina', 'Roy'),
              ],
            },
          });

          const response = await asAdmin(request(app).get('/elearning/admin/courses/4/learners?limit=3&offset=8'));

          expect(response.status).toBe(200);
          expectBffContract('get', route, response);
          expect(response.body).toEqual({
            courseId: '4',
            total: 11,
            limit: 3,
            offset: 8,
            nextOffset: null,
            learners: [
              {
                userId: '1', name: 'Security Admin', firstName: 'Security', lastName: 'Admin', status: 'completed', progress: 100,
                startedAt: '2026-03-02T09:15:00', completedAt: '2026-03-04T10:00:00', lastActivityAt: '2026-03-04T10:00:00', lastReminderAt: null,
              },
              {
                userId: '2', name: 'Jean Pierre Durand', firstName: 'Jean Pierre', lastName: 'Durand', status: 'in-progress', progress: 33,
                startedAt: '2026-03-05T08:00:00', completedAt: null, lastActivityAt: '2026-03-05T08:00:00', lastReminderAt: '2026-03-10T07:30:00',
              },
              {
                userId: '5', name: 'Nina Roy', firstName: 'Nina', lastName: 'Roy', status: 'not-started', progress: 0,
                startedAt: null, completedAt: null, lastActivityAt: null, lastReminderAt: null,
              },
            ],
          });
          const calls = elearningApi.requests;
          expect(calls).toHaveLength(1);
          expect(calls[0].url.pathname + calls[0].url.search).toBe(elearningApiUrls.getGetFormationLearnersUrl(4, { limit: 3, offset: 8 }));
          expect(calls[0].headers.authorization).toBe(bearer('jwt-admin', { role: 'admin' }));
        });

        test('defaults to 50 learners from 0, and gives the next offset while learners remain', async () => {
          elearningApi.on('get', ELEARNING.learners, ({ url }) => ({
            body: {
              formation_id: 4, total: 120, limit: Number(url.searchParams.get('limit')), offset: Number(url.searchParams.get('offset')),
              learners: Array.from({ length: 50 }, (_, index) => learner(index + 1, 'Agent', String(index + 1))),
            },
          }));

          const response = await asAdmin(request(app).get('/elearning/admin/courses/4/learners'));

          expect(response.status).toBe(200);
          expectBffContract('get', route, response);
          expect(response.body).toMatchObject({ total: 120, limit: 50, offset: 0, nextOffset: 50 });
          expect(response.body.learners).toHaveLength(50);
          expect(elearningApi.calls(ELEARNING.learners, 'get')[0].url.search).toBe('?limit=50&offset=0');
        });

        test('ends the list past the last learner', async () => {
          elearningApi.on('get', ELEARNING.learners, { body: { formation_id: 4, total: 3, limit: 50, offset: 500, learners: [] } });

          const response = await asAdmin(request(app).get('/elearning/admin/courses/4/learners?offset=500'));

          expect(response.status).toBe(200);
          expect(response.body).toMatchObject({ learners: [], total: 3, nextOffset: null });
        });

        test('answers 404 for an unknown course', async () => {
          elearningApi.on('get', ELEARNING.learners, elearningError(404));

          const response = await asAdmin(request(app).get('/elearning/admin/courses/404/learners'));

          expect(response.status).toBe(404);
          expectBffContract('get', route, response);
          expect(response.body.error.message).toBe('Course not found.');
        });

        test('answers 502 to an unusable answer', async () => {
          captureLogs();
          elearningApi.on('get', ELEARNING.learners, { body: { formation_id: 4, total: 1, learners: [{ user_id: 'one' }] }, outOfContract: true });

          const response = await asAdmin(request(app).get('/elearning/admin/courses/4/learners'));

          expect(response.status).toBe(502);
          expectBffContract('get', route, response);
        });

        test.each(['/elearning/admin/courses/abc/learners', '/elearning/admin/courses/4/learners?limit=0', '/elearning/admin/courses/4/learners?limit=201', '/elearning/admin/courses/4/learners?offset=-1'])(
          'refuses %s with a 400 before any call',
          async (url) => {
            const response = await asAdmin(request(app).get(url));

            expect(response.status).toBe(400);
            expectBffContract('get', route, response);
            expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
          },
        );

        test('forbids non-administrators without any call, and relays an E-learning 403', async () => {
          const response = await asAgent(request(app).get('/elearning/admin/courses/4/learners'));

          expect(response.status).toBe(403);
          expectBffContract('get', route, response);
          expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);

          elearningApi.on('get', ELEARNING.learners, elearningError(403));
          const refused = await asAdmin(request(app).get('/elearning/admin/courses/4/learners'));
          expect(refused.status).toBe(403);
          expectBffContract('get', route, refused);
        });
      });

      describe('GET /elearning/admin/agents', () => {
        const route = '/elearning/admin/agents';
        const agent = (id: number, firstName: string, lastName: string) => ({ id, name: `${firstName} ${lastName}`, first_name: firstName, last_name: lastName });

        test('reads one page of agents, with the names of the accounts', async () => {
          elearningApi.on('get', ELEARNING.users, { body: { users: [agent(150, 'Alice', 'Martin'), agent(151, 'Jean Pierre', 'Durand')] } });

          const response = await asAdmin(request(app).get('/elearning/admin/agents?limit=2&offset=149'));

          expect(response.status).toBe(200);
          expectBffContract('get', route, response);
          expect(response.body).toEqual({
            agents: [
              { userId: '150', name: 'Alice Martin', firstName: 'Alice', lastName: 'Martin' },
              { userId: '151', name: 'Jean Pierre Durand', firstName: 'Jean Pierre', lastName: 'Durand' },
            ],
            limit: 2,
            offset: 149,
            nextOffset: 151,
          });
          expect(elearningApi.calls(ELEARNING.users, 'get')[0].url.search).toBe('?limit=2&offset=149');
        });

        test('ends the list on a short page', async () => {
          elearningApi.on('get', ELEARNING.users, { body: { users: [agent(441, 'Agent', '441')] } });

          const response = await asAdmin(request(app).get('/elearning/admin/agents?offset=440'));

          expect(response.status).toBe(200);
          expect(response.body).toMatchObject({ limit: 50, offset: 440, nextOffset: null });
        });

        test('hands the search and the excluded course to the E-learning API, in one call', async () => {
          elearningApi.on('get', ELEARNING.users, { body: { users: [agent(150, 'Alice', 'Martin')] } });

          const response = await asAdmin(request(app).get('/elearning/admin/agents?search=%20martin%20&limit=10&excludeCourseId=7'));

          expect(response.status).toBe(200);
          expectBffContract('get', route, response);
          expect(response.body).toMatchObject({ agents: [{ userId: '150' }], nextOffset: null });
          const calls = elearningApi.calls(ELEARNING.users, 'get');
          expect(calls).toHaveLength(1);
          expect(calls[0].url.pathname + calls[0].url.search)
            .toBe(elearningApiUrls.getGetUsersUrl({ limit: 10, offset: 0, search: 'martin', exclude_formation_id: 7 }));
        });

        test('answers 502 to an agent without names', async () => {
          captureLogs();
          elearningApi.on('get', ELEARNING.users, { body: { users: [{ id: 2, name: 'Perf Tester' }] }, outOfContract: true });

          const response = await asAdmin(request(app).get('/elearning/admin/agents'));

          expect(response.status).toBe(502);
          expectBffContract('get', route, response);
        });

        test.each(['limit=0', 'limit=201', 'offset=-1', 'search=', `search=${'a'.repeat(101)}`, 'excludeCourseId=0', 'excludeCourseId=abc'])('refuses %s with a 400', async (query) => {
          const response = await asAdmin(request(app).get(`/elearning/admin/agents?${query}`));

          expect(response.status).toBe(400);
          expectBffContract('get', route, response);
          expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
        });

        // MAIR-1203: ZAP sent a search holding a NUL byte; the API refused it (400) and the BFF answered 502.
        test.each(['%00', 'mar%00tin', '%27%22%00%3CscrIpt%3E', 'a%1Fb', 'a%7Fb'])('MAIR-1203 refuses the control characters of search=%s with a 400, without any call', async (search) => {
          const response = await asAdmin(request(app).get(`/elearning/admin/agents?search=${search}`));

          expect(response.status).toBe(400);
          expectBffContract('get', route, response);
          expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
        });

        test('forbids non-administrators, and relays an E-learning 403', async () => {
          const forbidden = await asAgent(request(app).get('/elearning/admin/agents'));
          expect(forbidden.status).toBe(403);
          expectBffContract('get', route, forbidden);
          expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);

          elearningApi.on('get', ELEARNING.users, elearningError(403));
          const refused = await asAdmin(request(app).get('/elearning/admin/agents'));
          expect(refused.status).toBe(403);
          expectBffContract('get', route, refused);
        });
      });

      describe('POST /elearning/admin/courses/{courseId}/learners', () => {
        const route = '/elearning/admin/courses/{courseId}/learners';

        test('enrols the new agents, reports those enrolled already and the failures, each agent once', async () => {
          captureLogs();
          elearningApi.on('get', ELEARNING.adminFormation, { body: { modules: [] } });
          elearningApi.on('get', ELEARNING.userFormations, ({ pathParams }) => {
            if (pathParams.userId === '5') return elearningError(500);
            return { body: { formations: pathParams.userId === '2' ? [enrolment(7, 'InProgress')] : [enrolment(4, 'Completed')] } };
          });
          elearningApi.on('post', ELEARNING.adminFormation, ({ body }) =>
            ((body as { user_id: number }).user_id === 999 ? elearningError(404) : { status: 200 }));

          const response = await asAdmin(request(app).post('/elearning/admin/courses/7/learners')).send({ userIds: ['3', '2', '999', '3', '5'] });

          expect(response.status).toBe(200);
          expectBffContract('post', route, response);
          expect(response.body).toEqual({ courseId: '7', enrolled: ['3'], alreadyEnrolled: ['2'], failed: ['999', '5'] });
          const registrations = elearningApi.calls(ELEARNING.adminFormation, 'post');
          expect(registrations.map((call) => call.body)).toEqual(expect.arrayContaining([{ user_id: 3 }, { user_id: 999 }]));
          expect(registrations).toHaveLength(2);
          expect(registrations[0].url.pathname).toBe(elearningApiUrls.getRegisterUserToFormationUrl(7));
        });

        test('enrols 5 agents at a time at most', async () => {
          elearningApi.on('get', ELEARNING.adminFormation, { body: { modules: [] } });
          elearningApi.on('get', ELEARNING.userFormations, { body: { formations: [] }, delayMs: 20 });
          elearningApi.on('post', ELEARNING.adminFormation, { status: 200, delayMs: 20 });
          const userIds = Array.from({ length: 12 }, (_, index) => String(index + 10));

          const response = await asAdmin(request(app).post('/elearning/admin/courses/7/learners')).send({ userIds });

          expect(response.status).toBe(200);
          expect(response.body.enrolled).toEqual(userIds);
          expect(elearningApi.maxInFlight).toBeGreaterThan(1);
          expect(elearningApi.maxInFlight).toBeLessThanOrEqual(5);
        });

        test('answers 404 for an unknown course without enrolling anybody', async () => {
          elearningApi.on('get', ELEARNING.adminFormation, elearningError(404));

          const response = await asAdmin(request(app).post('/elearning/admin/courses/404/learners')).send({ userIds: ['2'] });

          expect(response.status).toBe(404);
          expectBffContract('post', route, response);
          expect(elearningApi.calls(ELEARNING.adminFormation, 'post')).toHaveLength(0);
        });

        test('answers 401 when the E-learning API refuses the session', async () => {
          elearningApi.on('get', ELEARNING.adminFormation, { body: { modules: [] } });
          elearningApi.on('get', ELEARNING.userFormations, { body: { formations: [] } });
          elearningApi.on('post', ELEARNING.adminFormation, elearningError(401));

          const response = await asAdmin(request(app).post('/elearning/admin/courses/7/learners')).send({ userIds: ['2', '3'] });

          expect(response.status).toBe(401);
          expectBffContract('post', route, response);
        });

        test.each<[string, unknown, string]>([
          ['no agent', { userIds: [] }, 'body.userIds'],
          ['more than 200 agents', { userIds: Array.from({ length: 201 }, (_, index) => String(index + 1)) }, 'body.userIds'],
          ['a non-numeric id', { userIds: ['alice'] }, 'body.userIds.0'],
          ['no body', undefined, 'body'],
        ])('refuses %s with a 400 before any call', async (_label, body, path) => {
          const call = asAdmin(request(app).post('/elearning/admin/courses/7/learners'));
          const response = await (body === undefined ? call : call.send(body as object));

          expect(response.status).toBe(400);
          expectBffContract('post', route, response);
          expect(response.body.error.details[0].path).toBe(path);
          expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
        });

        test('forbids non-administrators without any call', async () => {
          const response = await asAgent(request(app).post('/elearning/admin/courses/7/learners')).send({ userIds: ['2'] });

          expect(response.status).toBe(403);
          expectBffContract('post', route, response);
          expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
        });
      });

      describe('DELETE /elearning/admin/courses/{courseId}/learners/{userId}', () => {
        const route = '/elearning/admin/courses/{courseId}/learners/{userId}';

        test('unenrols the agent', async () => {
          elearningApi.on('delete', ELEARNING.userFormation, { status: 204 });

          const response = await asAdmin(request(app).delete('/elearning/admin/courses/7/learners/2'));

          expect(response.status).toBe(200);
          expectBffContract('delete', route, response);
          expect(response.body).toEqual({ removed: true, courseId: '7', userId: '2' });
          expect(elearningApi.calls(ELEARNING.userFormation, 'delete')[0].url.pathname).toBe(elearningApiUrls.getUnsubFormationUrl(2, 7));
        });

        test.each([[404, 404, 'Enrolment not found.'], [403, 403, 'This action is restricted to administrators.']])(
          'maps an E-learning %i to %i',
          async (upstream, status, message) => {
            elearningApi.on('delete', ELEARNING.userFormation, elearningError(upstream));

            const response = await asAdmin(request(app).delete('/elearning/admin/courses/7/learners/2'));

            expect(response.status).toBe(status);
            expectBffContract('delete', route, response);
            expect(response.body.error.message).toBe(message);
          },
        );

        test('refuses invalid ids and non-administrators before any call', async () => {
          const invalid = await asAdmin(request(app).delete('/elearning/admin/courses/7/learners/0'));
          expect(invalid.status).toBe(400);
          expectBffContract('delete', route, invalid);
          expect(invalid.body.error.details[0].path).toBe('params.userId');

          const agent = await asAgent(request(app).delete('/elearning/admin/courses/7/learners/2'));
          expect(agent.status).toBe(403);
          expectBffContract('delete', route, agent);
          expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
        });
      });
    });

    test('forbids non-administrators', async () => {
      coreApi.on('get', CORE.me, { body: coreMe({ role: 'Stagiaire', roles: ['Stagiaire'] }, [group(1, 'admin')]) });

      const created = await withSession(request(app).post('/elearning/admin/courses'), 'fake-admin').send(course);
      const removed = await withSession(request(app).delete('/elearning/admin/courses/4'), 'fake-admin');

      for (const [response, method, template] of [[created, 'post', '/elearning/admin/courses'], [removed, 'delete', '/elearning/admin/courses/{courseId}']] as const) {
        expect(response.status).toBe(403);
        expectBffContract(method, template, response);
        expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: 'This action is restricted to administrators.', details: [] } });
      }
    });

    test('MAIR-537 forbids a non-administrator on PATCH /elearning/admin/courses/:id', async () => {
      coreApi.on('get', CORE.me, { body: coreMe({ role: 'Stagiaire', roles: ['Stagiaire'] }, [group(1, 'admin')]) });

      const response = await withSession(request(app).patch('/elearning/admin/courses/4'), 'fake-admin').send(course);

      expect(response.status).toBe(403);
      expectBffContract('patch', '/elearning/admin/courses/{courseId}', response);
      expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: 'This action is restricted to administrators.', details: [] } });
      expect(elearningApi.requests).toHaveLength(0);
    });

    test('validates the request before resolving the session', async () => {
      const response = await withSession(request(app).patch('/elearning/admin/courses/not-a-number'), 'admin-agent').send(course);

      expect(response.status).toBe(400);
      expectBffContract('patch', '/elearning/admin/courses/{courseId}', response);
      expect(coreApi.requests).toHaveLength(0);
    });

    test('MAIR-525: reads the admin role in the token without calling Core', async () => {
      elearningApi.on('delete', ELEARNING.adminFormation, { status: 204 });

      const response = await withSession(request(app).delete('/elearning/admin/courses/4'), 'jwt-admin', { role: 'admin' });

      expect(response.status).toBe(200);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', response);
      expect(coreApi.requests).toHaveLength(0);
    });

    test('MAIR-525: forbids a token whose role is not admin, without calling Core', async () => {
      coreApi.on('get', CORE.me, { body: coreMe({ role: 'admin', roles: ['admin'] }) });

      const response = await withSession(request(app).delete('/elearning/admin/courses/4'), 'jwt-agent', { role: 'User' });

      expect(response.status).toBe(403);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', response);
      expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
    });

    test('MAIR-529: reads the role from Core for an empty `role` claim', async () => {
      coreApi.on('get', CORE.me, { body: coreMe({ role: 'admin', roles: ['admin'] }) });
      elearningApi.on('delete', ELEARNING.adminFormation, { status: 204 });

      const response = await withSession(request(app).delete('/elearning/admin/courses/4'), 'jwt-empty-role', { role: '' });

      expect(response.status).toBe(200);
      expect(coreApi.requests).toHaveLength(1);
    });

    test('MAIR-529: ignores a `roles` claim and reads the role from Core', async () => {
      coreApi.on('get', CORE.me, { body: coreMe() });

      const response = await withSession(request(app).delete('/elearning/admin/courses/4'), 'jwt-roles-only', { roles: ['admin'] });

      expect(response.status).toBe(403);
      expect(coreApi.requests).toHaveLength(1);
    });

    test('propagates a Core outage as 502 for a token without role claim', async () => {
      coreApi.on('get', CORE.me, { dropConnection: true });

      const response = await withSession(request(app).delete('/elearning/admin/courses/4'), 'admin-offline');

      expect(response.status).toBe(502);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', response);
    });
  });

  describe('GET /check_apis', () => {
    beforeEach(() => {
      coreApi.on('get', HEALTH, { raw: 'OK', contentType: 'text/plain' });
      elearningApi.on('get', HEALTH, { raw: 'OK', contentType: 'text/plain' });
    });

    test('reports every upstream connected through their contract /health operations', async () => {
      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(200);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'OK', core_api: 'Connected', elearning_api: 'Connected' });
      expect(coreApi.requests.map((call) => call.url.pathname)).toEqual([coreApiUrls.getHealthUrl()]);
      expect(elearningApi.requests.map((call) => call.url.pathname)).toEqual([elearningApiUrls.getHealthUrl()]);
      expect(mocks.flatMap((mock) => mock.requests).every((call) => call.headers.authorization === undefined)).toBe(true);
    });

    test('reports each upstream independently and leaks no network detail', async () => {
      captureLogs();
      process.env.CORE_API_PORT = new URL(await unreachableUrl()).port;

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'Error', core_api: 'Unreachable', elearning_api: 'Connected' });
    });

    test('accepts URLs that already carry their scheme and port', async () => {
      process.env.CORE_API_URL = coreApi.url;
      process.env.ELEARNING_API_URL = `${elearningApi.url}/`;
      delete process.env.CORE_API_PORT;
      delete process.env.ELEARNING_API_PORT;

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'OK', core_api: 'Connected', elearning_api: 'Connected' });
      expect(elearningApi.requests.map((call) => call.url.pathname)).toEqual([elearningApiUrls.getHealthUrl()]);
    });

    test.each([
      ['ELEARNING_API', 'elearning_api'],
    ])('reports %s without configured URL as unreachable', async (service, key) => {
      captureLogs();
      delete process.env[`${service}_URL`];

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toMatchObject({ status: 'Error', core_api: 'Connected', [key]: 'Unreachable' });
    });

    test.each<[string, ContractMockServer]>([
      ['E-learning API', elearningApi],
    ])('reports %s unreachable when it answers an error', async (_label, mock) => {
      captureLogs();
      mock.on('get', HEALTH, { status: 503, raw: 'down', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body.status).toBe('Error');
      expect(JSON.stringify(response.body)).not.toContain('down');
    });
  });

  describe('security headers', () => {
    test('API answers carry the strict API-only headers and no X-Powered-By', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-security-policy']).toBe("default-src 'none'");
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('/docs keeps the shared CSP that lets Swagger UI load', async () => {
      const response = await request(app).get('/docs/');

      expect(response.headers['content-security-policy']).not.toBe("default-src 'none'");
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('final handlers', () => {
    test('answers an unknown route with the 404 envelope', async () => {
      const response = await request(app).get('/unknown');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found', details: [] } });
    });

    test('answers an unparsable JSON body with the 400 envelope, before resolving the session', async () => {
      const response = await withSession(request(app).post('/elearning/courses/4/rating'), 'broken-json')
        .set('Content-Type', 'application/json')
        .send('{"rating"');

      expect(response.status).toBe(400);
      expectBffContract('post', '/elearning/courses/{courseId}/rating', response);
      expect(response.body).toEqual({ error: { code: 'BAD_REQUEST', message: 'Invalid request', details: [] } });
      expect(coreApi.requests).toHaveLength(0);
    });
  });
});
