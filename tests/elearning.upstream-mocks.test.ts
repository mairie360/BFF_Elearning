import path from 'node:path';
import request from 'supertest';
import app from '../src/app';
import { ContractMockServer, unreachableUrl, type MockReply } from './support/contract-mock-server';
import { OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract } from './support/orval-contract';
import {
  attachment, bearer, coreApiUrls, elearningApiUrls, formation, group, learnerModule, sessionResponse, userBffUrls,
} from './support/user-fixtures';

// The whole app is tested with the real axios clients against real HTTP servers standing in for BFF User (session
// resolution), Core API (profile writes, /check_apis) and E-learning API (courses, progress, /check_apis). Their
// contracts are rebuilt from the installed @mairie360/*-openapi packages (versions pinned in package.json): each mock
// rejects routes and parameters absent from the upstream contract and validates its success answers. Errors are not
// typed by orval: every mocked error reply is marked `outOfContract`. Every BFF answer is validated against
// contracts/openapi.json. Mocked bodies are typed by the generated models and the expected paths come from the URL
// helpers of the generated clients.

const userBff = new ContractMockServer('USER_BFF', loadOrvalContract('@mairie360/bff-user-openapi'));
const coreApi = new ContractMockServer('CORE_API', loadOrvalContract('@mairie360/core-api-openapi'));
const elearningApi = new ContractMockServer('ELEARNING_API', loadOrvalContract('@mairie360/elearning-api-openapi'));
const mocks = [userBff, coreApi, elearningApi];
// Templates of the upstream contracts (mock keys); the concrete expected paths come from the URL helpers.
const USER_BFF = { me: '/me' } as const;
const CORE = { me: '/api/v1/user/me/' } as const;
const ELEARNING = {
  formations: '/api/v1/formations/',
  formation: '/api/v1/formations/{formationId}/',
  module: '/api/v1/formations/{formationId}/{moduleId}/',
} as const;
const HEALTH = '/health';
const bffContract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));

beforeAll(async () => { await Promise.all(mocks.map((mock) => mock.start())); });
afterAll(async () => { await Promise.all(mocks.map((mock) => mock.stop())); });
beforeEach(() => {
  for (const mock of mocks) mock.reset();
  // Every upstream URL is read on each request. The APIs are configured as host + port (the docker-compose form);
  // the `http://host:port` form is covered by the /check_apis tests.
  process.env.USER_BFF_URL = userBff.url;
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

/** BFF User error: not typed by orval, hence out of contract. */
const userBffError = (status: number): MockReply => ({ status, body: { message: 'Session invalide' }, outOfContract: true });
/** E-learning API error: a text/plain body, not typed by orval. */
const elearningError = (status: number): MockReply => ({ status, raw: `upstream detail ${status}`, contentType: 'text/plain', outOfContract: true });

const withSession = (call: request.Test, sub: string | number) => call.set('Authorization', bearer(sub));

describe('BFF E-learning with contract-driven upstream mocks', () => {
  describe('session resolution through BFF User GET /me', () => {
    test('forwards the caller session to the contract /me operation and maps the SessionResponse', async () => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-42');

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
      const [me] = userBff.calls(USER_BFF.me, 'get');
      expect(userBff.requests).toHaveLength(1);
      expect(me.url.pathname).toBe(userBffUrls.getGetMeUrl());
      expect(me.headers.authorization).toBe(bearer('agent-42'));
      expect(me.headers.accept).toBe('application/json');
      expect(me.undeclaredQuery).toEqual([]);
    });

    test('omits null or missing optional fields and defaults the role to Guest', async () => {
      const body = sessionResponse({ phone: null }, []);
      delete body.user.role;
      userBff.on('get', USER_BFF.me, { body });

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-guest');

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user).toEqual({
        id: '2', name: 'Alice Martin', initials: 'AM', email: 'alice.martin@mairie.test', role: 'Guest', isAdmin: false,
      });
    });

    test.each([
      ['no Authorization header', undefined],
      ['a non-Bearer scheme', 'Basic YWxpY2U6c2VjcmV0'],
      ['an empty Bearer token', 'Bearer '],
    ])('answers 401 without calling BFF User for %s', async (_label, authorization) => {
      const call = request(app).get('/elearning/catalog');
      const response = await (authorization ? call.set('Authorization', authorization) : call);

      expect(response.status).toBe(401);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Invalid session.', details: [] } });
      expect(userBff.requests).toHaveLength(0);
    });

    test('takes the user id from BFF User, never from the unverified token', async () => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse({ id: 57 }) });

      const response = await withSession(request(app).get('/elearning/profile'), 1);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('57');
    });

    test('falls back to the user name when BFF User returns no id', async () => {
      const body = sessionResponse();
      delete body.user.id;
      userBff.on('get', USER_BFF.me, { body });

      const response = await withSession(request(app).get('/elearning/profile'), 99);

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user.id).toBe('Alice Martin');
    });

    test.each([401, 403])('turns a BFF User %i into a 401', async (status) => {
      userBff.on('get', USER_BFF.me, userBffError(status));

      const response = await withSession(request(app).get('/elearning/catalog'), 'agent-expired');

      expect(response.status).toBe(401);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Invalid session.', details: [] } });
    });

    test('maps a BFF User 5xx to 502 without leaking the upstream body', async () => {
      userBff.on('get', USER_BFF.me, { status: 500, body: { message: 'panic in handler' }, outOfContract: true });

      const response = await withSession(request(app).get('/elearning/catalog'), 'agent-500');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
      expect(JSON.stringify(response.body)).not.toContain('panic');
    });

    test.each([404, 409, 422, 429])('turns an undeclared BFF User %i into a 502', async (status) => {
      userBff.on('get', USER_BFF.me, userBffError(status));

      const response = await withSession(request(app).get('/elearning/catalog'), 'agent-odd');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
    });

    test.each<[string, MockReply, string]>([
      ['a dropped connection', { dropConnection: true }, 'The USER_BFF service is unavailable.'],
      ['a text body', { raw: 'OK', contentType: 'text/plain', outOfContract: true }, 'The USER_BFF answer is invalid.'],
      ['a JSON body without user', { body: { groups: [], roles: [] }, outOfContract: true }, 'The USER_BFF answer is invalid.'],
    ])('answers 502 when BFF User returns %s', async (_label, reply, message) => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      userBff.on('get', USER_BFF.me, reply);

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-broken');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message, details: [] } });
    });

    test('retries GET /me once on a transient BFF User failure', async () => {
      let calls = 0;
      userBff.on('get', USER_BFF.me, () => (++calls === 1 ? { status: 503, body: { message: 'busy' }, outOfContract: true } : { body: sessionResponse() }));

      const response = await withSession(request(app).get('/elearning/profile'), 2);

      expect(response.status).toBe(200);
      expect(userBff.calls(USER_BFF.me, 'get')).toHaveLength(2);
    });

    test('answers 503 when USER_BFF_URL is not configured, instead of calling localhost', async () => {
      delete process.env.USER_BFF_URL;
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-unconfigured');

      expect(response.status).toBe(503);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The USER_BFF service is not configured.', details: [] } });
      expect(mocks.flatMap((mock) => mock.requests)).toHaveLength(0);
    });

    test('answers 401 rather than 503 to a caller without session, even when nothing is configured', async () => {
      delete process.env.USER_BFF_URL;

      const response = await request(app).get('/elearning/profile');

      expect(response.status).toBe(401);
    });

    test('answers 502 when BFF User is unreachable', async () => {
      process.env.USER_BFF_URL = await unreachableUrl();

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-offline');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'The USER_BFF service is unavailable.', details: [] } });
    });
  });

  describe('session-bound routes', () => {
    // Every operation that needs a session, with a valid request so that only the session decides the answer.
    const SESSION_ROUTES = [
      ['get', '/elearning/catalog', '/elearning/catalog', undefined],
      ['get', '/elearning/profile', '/elearning/profile', undefined],
      ['patch', '/elearning/profile', '/elearning/profile', { email: 'new@mairie.test' }],
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
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });
      const token = bearer(2).slice('Bearer '.length);

      const response = await send('get', '/elearning/profile', undefined, { Authorization: `bearer   ${token}` });

      expect(response.status).toBe(200);
      expect(userBff.calls(USER_BFF.me, 'get')[0].headers.authorization).toBe(`Bearer ${token}`);
    });

    test('marks session-bound answers as not cacheable, and leaves public ones alone', async () => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });

      const profile = await withSession(request(app).get('/elearning/profile'), 2);
      const health = await request(app).get('/health');

      expect(profile.headers['cache-control']).toBe('no-store');
      expect(health.headers['cache-control']).toBeUndefined();
    });
  });

  describe('learner routes, served by the E-learning API', () => {
    // Enrolments of the caller as the E-learning API returns them: formation 4 is half done (module 11 completed),
    // formation 9 is not started. PATCH .../{moduleId}/ marks a module completed, as the API does.
    let enrolments: Array<{ formation: ReturnType<typeof formation>; chapters: Array<{ module: ReturnType<typeof learnerModule>; files: ReturnType<typeof attachment>[] }> }>;

    beforeEach(() => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });
      enrolments = [
        {
          formation: formation(4, 'RGPD pour les agents', 'InProgress'),
          chapters: [
            { module: learnerModule(11, 'Les principes', true), files: [attachment(27, 'principes.pdf'), attachment(28, 'intro.mp4', 'Video')] },
            { module: learnerModule(12, 'Les obligations'), files: [attachment(29, 'registre.pdf')] },
          ],
        },
        { formation: formation(9, 'Accueil du public'), chapters: [{ module: learnerModule(31, 'Posture'), files: [] }] },
      ];
      const enrolment = (id: string) => enrolments.find((entry) => String(entry.formation.id) === id);
      const chapter = (formationId: string, moduleId: string) =>
        enrolment(formationId)?.chapters.find((entry) => String(entry.module.id) === moduleId);

      elearningApi.on('get', ELEARNING.formations, () => ({ body: { formations: enrolments.map((entry) => entry.formation) } }));
      elearningApi.on('get', ELEARNING.formation, ({ pathParams }) => {
        const found = enrolment(pathParams.formationId);
        return found ? { body: { modules: found.chapters.map((entry) => entry.module) } } : elearningError(403);
      });
      elearningApi.on('get', ELEARNING.module, ({ pathParams }) => {
        if (!enrolment(pathParams.formationId)) return elearningError(403);
        const found = chapter(pathParams.formationId, pathParams.moduleId);
        return found ? { body: { files: found.files } } : elearningError(404);
      });
      elearningApi.on('patch', ELEARNING.module, ({ pathParams }) => {
        const found = chapter(pathParams.formationId, pathParams.moduleId);
        if (!found) return elearningError(404);
        found.module.completed = true;
        return {};
      });
    });

    test('GET /elearning/catalog shapes the enrolments, chapters and contents of the caller', async () => {
      const response = await withSession(request(app).get('/elearning/catalog'), 'catalog-agent');

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
        chapters: 2,
        statusValue: 'in-progress',
        statusBadge: { label: 'En cours', variant: 'inProgress' },
        progress: 50,
        details: {
          title: 'RGPD pour les agents',
          description: 'RGPD pour les agents description',
          progress: 50,
          completed: false,
          chapters: [
            {
              id: '11',
              title: 'Les principes',
              description: 'Les principes description',
              completed: true,
              active: false,
              contents: [
                { id: '27', title: 'principes.pdf', type: 'pdf', fileName: 'principes.pdf', completed: true },
                { id: '28', title: 'intro.mp4', type: 'video', fileName: 'intro.mp4', completed: true },
              ],
            },
            {
              id: '12',
              title: 'Les obligations',
              description: 'Les obligations description',
              completed: false,
              active: true,
              contents: [{ id: '29', title: 'registre.pdf', type: 'pdf', fileName: 'registre.pdf', completed: false }],
            },
          ],
        },
      });
      expect(accueil).toMatchObject({ id: '9', statusValue: 'not-started', progress: 0, chapters: 1 });

      // Every E-learning call is made on behalf of the caller, through the contract operations.
      expect(elearningApi.requests.map((call) => `${call.method} ${call.url.pathname}`).sort()).toEqual([
        `GET ${elearningApiUrls.getGetMyFormationsUrl()}`,
        `GET ${elearningApiUrls.getGetMyFormationByIdUrl(4)}`,
        `GET ${elearningApiUrls.getGetMyFormationByIdUrl(9)}`,
        `GET ${elearningApiUrls.getGetModuleUrl(4, 11)}`,
        `GET ${elearningApiUrls.getGetModuleUrl(4, 12)}`,
        `GET ${elearningApiUrls.getGetModuleUrl(9, 31)}`,
      ].sort());
      expect(elearningApi.requests.every((call) => call.headers.authorization === bearer('catalog-agent'))).toBe(true);
    });

    test('GET /elearning/catalog filters and pages the courses', async () => {
      const response = await withSession(request(app).get('/elearning/catalog?status=not-started&search=accueil&pageSize=10'), 'catalog-agent');

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
      const response = await withSession(request(app).get('/elearning/catalog?pageSize=500'), 'catalog-agent');

      expect(response.status).toBe(400);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'BAD_REQUEST', message: 'Validation failed', details: [{ path: 'query.pageSize', message: expect.any(String) }] } });
      expect(userBff.requests).toHaveLength(0);
      expect(elearningApi.requests).toHaveLength(0);
    });

    test('turns an E-learning API 401 into a 401', async () => {
      elearningApi.on('get', ELEARNING.formations, elearningError(401));

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
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      elearningApi.on('get', ELEARNING.formations, reply);

      const response = await withSession(request(app).get('/elearning/catalog'), 'outage-agent');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message, details: [] } });
      expect(JSON.stringify(response.body)).not.toContain('upstream detail');
    });

    test('retries an E-learning GET once on a transient failure', async () => {
      let calls = 0;
      elearningApi.on('get', ELEARNING.formations, () => (++calls === 1 ? elearningError(503) : { body: { formations: [] } }));

      const response = await withSession(request(app).get('/elearning/catalog'), 'retry-agent');

      expect(response.status).toBe(200);
      expect(elearningApi.calls(ELEARNING.formations, 'get')).toHaveLength(2);
    });

    test('never retries the completion PATCH', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      elearningApi.on('patch', ELEARNING.module, elearningError(503));

      const response = await withSession(request(app).post('/elearning/courses/4/contents/29/complete'), 'retry-agent')
        .send({ chapterId: '12', completed: true });

      expect(response.status).toBe(502);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', response);
      expect(elearningApi.calls(ELEARNING.module, 'patch')).toHaveLength(1);
    });

    test('answers 503 when ELEARNING_API_URL is not configured, instead of calling localhost', async () => {
      delete process.env.ELEARNING_API_URL;
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

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
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

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
      expect(userBff.requests).toHaveLength(0);
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

    test('POST .../rating answers 501 instead of keeping the rating in memory, and validates first', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const rated = await withSession(request(app).post('/elearning/courses/4/rating'), 'rating-agent').send({ rating: 5 });

      expect(rated.status).toBe(501);
      expectBffContract('post', '/elearning/courses/{courseId}/rating', rated);
      expect(rated.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Course ratings are not stored by the e-learning service yet.', details: [] } });
      expect(elearningApi.requests).toHaveLength(0);

      userBff.reset();
      const invalid = await withSession(request(app).post('/elearning/courses/4/rating'), 'rating-agent').send({ rating: 7 });
      expect(invalid.status).toBe(400);
      expectBffContract('post', '/elearning/courses/{courseId}/rating', invalid);
      expect(userBff.requests).toHaveLength(0);
    });
  });

  describe('profile', () => {
    test('GET /elearning/profile returns the BFF User session as is', async () => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });

      const response = await withSession(request(app).get('/elearning/profile'), 'profile-agent');

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user).toMatchObject({ id: '2', email: 'alice.martin@mairie.test', phone: '+33123456789' });
      expect(coreApi.requests).toHaveLength(0);
    });

    test('PATCH /elearning/profile saves e-mail and phone through Core, then reads the profile again', async () => {
      let saved = false;
      userBff.on('get', USER_BFF.me, () => ({ body: sessionResponse(saved ? { email: 'new@mairie.test', phone: '0262000000' } : {}) }));
      coreApi.on('patch', CORE.me, () => { saved = true; return {}; });

      const response = await withSession(request(app).patch('/elearning/profile'), 'profile-agent')
        .send({ email: 'new@mairie.test', phone: '0262000000', role: 'Admin', isAdmin: true });

      expect(response.status).toBe(200);
      expectBffContract('patch', '/elearning/profile', response);
      expect(response.body.user).toMatchObject({ id: '2', email: 'new@mairie.test', phone: '0262000000', role: 'User', isAdmin: false });
      const [patch] = coreApi.calls(CORE.me, 'patch');
      expect(patch.url.pathname).toBe(coreApiUrls.getPatchMeUrl());
      expect(patch.headers.authorization).toBe(bearer('profile-agent'));
      expect(patch.body).toEqual({ email: 'new@mairie.test', phone: '0262000000' });
      expect(userBff.requests).toHaveLength(2);
    });

    test('PATCH /elearning/profile answers 501 for address or city and writes nothing', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });

      const response = await withSession(request(app).patch('/elearning/profile'), 'profile-agent')
        .send({ phone: '0262000000', city: 'Saint-Paul' });

      expect(response.status).toBe(501);
      expectBffContract('patch', '/elearning/profile', response);
      expect(response.body.error.message).toBe('Address and city are not stored by any service yet: nothing was saved.');
      expect(coreApi.requests).toHaveLength(0);

      const reloaded = await withSession(request(app).get('/elearning/profile'), 'profile-agent');
      expect(reloaded.body.user.city).toBeUndefined();
    });

    test('PATCH /elearning/profile with nothing to save does not call Core', async () => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });

      const response = await withSession(request(app).patch('/elearning/profile'), 'profile-agent').send({});

      expect(response.status).toBe(200);
      expectBffContract('patch', '/elearning/profile', response);
      expect(coreApi.requests).toHaveLength(0);
    });

    test.each([
      [400, 400, 'BAD_REQUEST', 'Invalid request'],
      [401, 401, 'UNAUTHORIZED', 'Authentication required'],
      [409, 409, 'CONFLICT', 'Conflict with the current state of the resource'],
      [500, 502, 'BAD_GATEWAY', 'Upstream service error'],
      [422, 502, 'BAD_GATEWAY', 'Upstream service error'],
    ])('PATCH /elearning/profile maps a Core %i to %i without its body', async (coreStatus, status, code, message) => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });
      coreApi.on('patch', CORE.me, { status: coreStatus, raw: 'core internal detail', contentType: 'text/plain', outOfContract: true });

      const response = await withSession(request(app).patch('/elearning/profile'), 'profile-agent').send({ email: 'taken@mairie.test' });

      expect(response.status).toBe(status);
      expectBffContract('patch', '/elearning/profile', response);
      expect(response.body).toEqual({ error: { code, message, details: [] } });
    });

    test('PATCH /elearning/profile answers 503 when CORE_API_URL is not configured, and writes nothing', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });
      delete process.env.CORE_API_URL;

      const response = await withSession(request(app).patch('/elearning/profile'), 'profile-agent').send({ email: 'new@mairie.test' });

      expect(response.status).toBe(503);
      expectBffContract('patch', '/elearning/profile', response);
      expect(response.body.error).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'The CORE_API service is not configured.', details: [] });
      expect(coreApi.requests).toHaveLength(0);
    });

    test('hides unexpected errors behind a generic 500', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      userBff.on('get', USER_BFF.me, { body: sessionResponse() });
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

    test.each(['Admin', 'admin', 'ADMIN'])('answers 501 to a BFF User role %s: the E-learning API cannot edit courses', async (role) => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      userBff.on('get', USER_BFF.me, { body: sessionResponse({ role }) });

      const responses = [
        [await withSession(request(app).post('/elearning/admin/courses'), 'admin-agent').send(course), 'post', '/elearning/admin/courses'],
        [await withSession(request(app).patch('/elearning/admin/courses/4'), 'admin-agent').send(course), 'patch', '/elearning/admin/courses/{courseId}'],
        [await withSession(request(app).delete('/elearning/admin/courses/4'), 'admin-agent'), 'delete', '/elearning/admin/courses/{courseId}'],
      ] as const;

      for (const [response, method, template] of responses) {
        expect(response.status).toBe(501);
        expectBffContract(method, template, response);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
        expect(response.body.error.message).toMatch(/^Course administration is not available/);
      }
      expect(elearningApi.requests).toHaveLength(0);
    });

    test('forbids non-administrators', async () => {
      userBff.on('get', USER_BFF.me, { body: sessionResponse({ role: 'Administrateur' }, [group(1, 'admin')]) });

      const created = await withSession(request(app).post('/elearning/admin/courses'), 'fake-admin').send(course);
      const removed = await withSession(request(app).delete('/elearning/admin/courses/4'), 'fake-admin');

      for (const [response, method, template] of [[created, 'post', '/elearning/admin/courses'], [removed, 'delete', '/elearning/admin/courses/{courseId}']] as const) {
        expect(response.status).toBe(403);
        expectBffContract(method, template, response);
        expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: 'This action is restricted to administrators.', details: [] } });
      }
    });

    test('validates the request before resolving the session', async () => {
      const response = await withSession(request(app).patch('/elearning/admin/courses/not-a-number'), 'admin-agent').send(course);

      expect(response.status).toBe(400);
      expectBffContract('patch', '/elearning/admin/courses/{courseId}', response);
      expect(userBff.requests).toHaveLength(0);
    });

    test('propagates a BFF User outage as 502', async () => {
      userBff.on('get', USER_BFF.me, { dropConnection: true });

      const response = await withSession(request(app).delete('/elearning/admin/courses/4'), 'admin-offline');

      expect(response.status).toBe(502);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', response);
    });
  });

  describe('GET /check_apis', () => {
    beforeEach(() => {
      coreApi.on('get', HEALTH, { raw: 'OK', contentType: 'text/plain' });
      elearningApi.on('get', HEALTH, { raw: 'OK', contentType: 'text/plain' });
      userBff.on('get', HEALTH, {});
    });

    test('reports every upstream connected through their contract /health operations', async () => {
      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(200);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'OK', core_api: 'Connected', elearning_api: 'Connected', user_bff: 'Connected' });
      expect(coreApi.requests.map((call) => call.url.pathname)).toEqual([coreApiUrls.getHealthUrl()]);
      expect(elearningApi.requests.map((call) => call.url.pathname)).toEqual([elearningApiUrls.getHealthUrl()]);
      expect(userBff.requests.map((call) => call.url.pathname)).toEqual([userBffUrls.getGetHealthUrl()]);
      expect(mocks.flatMap((mock) => mock.requests).every((call) => call.headers.authorization === undefined)).toBe(true);
    });

    test('reports each upstream independently and leaks no network detail', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.CORE_API_PORT = new URL(await unreachableUrl()).port;

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'Error', core_api: 'Unreachable', elearning_api: 'Connected', user_bff: 'Connected' });
    });

    test('accepts URLs that already carry their scheme and port', async () => {
      process.env.CORE_API_URL = coreApi.url;
      process.env.ELEARNING_API_URL = `${elearningApi.url}/`;
      delete process.env.CORE_API_PORT;
      delete process.env.ELEARNING_API_PORT;

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'OK', core_api: 'Connected', elearning_api: 'Connected', user_bff: 'Connected' });
      expect(elearningApi.requests.map((call) => call.url.pathname)).toEqual([elearningApiUrls.getHealthUrl()]);
    });

    test.each([
      ['ELEARNING_API', 'elearning_api'],
      ['USER_BFF', 'user_bff'],
    ])('reports %s without configured URL as unreachable', async (service, key) => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      delete process.env[`${service}_URL`];

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toMatchObject({ status: 'Error', core_api: 'Connected', [key]: 'Unreachable' });
    });

    test.each<[string, ContractMockServer]>([
      ['E-learning API', elearningApi],
      ['BFF User', userBff],
    ])('reports %s unreachable when it answers an error', async (_label, mock) => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
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
      expect(userBff.requests).toHaveLength(0);
    });
  });
});
