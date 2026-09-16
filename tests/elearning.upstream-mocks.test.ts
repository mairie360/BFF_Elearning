import path from 'node:path';
import request from 'supertest';
import app from '../src/app';
import { ContractMockServer, unreachableUrl, type MockReply } from './support/contract-mock-server';
import { OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract } from './support/orval-contract';
import { bearer, group, sessionResponse } from './support/user-fixtures';

// Toute l'application est testée avec le vrai client axios contre de vrais serveurs HTTP simulant BFF User
// (résolution de session), Core API et E-learning API (/check_apis). Leurs contrats sont reconstruits depuis les
// paquets @mairie360/*-openapi installés (versions épinglées dans package.json) : chaque mock refuse les routes et
// paramètres absents du contrat amont et valide ses réponses de succès. Les erreurs ne sont pas typées par orval :
// toute réponse d'erreur simulée est marquée `outOfContract`. Chaque réponse du BFF est validée contre
// contracts/openapi.json.

const userBff = new ContractMockServer('USER_BFF', loadOrvalContract('@mairie360/bff-user-openapi'));
const coreApi = new ContractMockServer('CORE_API', loadOrvalContract('@mairie360/core-api-openapi'));
const elearningApi = new ContractMockServer('ELEARNING_API', loadOrvalContract('@mairie360/elearning-api-openapi'));
const mocks = [userBff, coreApi, elearningApi];
const bffContract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));

beforeAll(async () => { await Promise.all(mocks.map((mock) => mock.start())); });
afterAll(async () => { await Promise.all(mocks.map((mock) => mock.stop())); });
beforeEach(() => {
  for (const mock of mocks) mock.reset();
  // auth.ts relit USER_BFF_URL à chaque requête, check_apis relit hôte et port des API.
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

/** Erreur BFF User : non typée par orval, donc hors contrat. */
const userBffError = (status: number): MockReply => ({ status, body: { message: 'Session invalide' }, outOfContract: true });

const withSession = (call: request.Test, sub: string | number) => call.set('Authorization', bearer(sub));

describe('BFF E-learning with contract-driven upstream mocks', () => {
  describe('session resolution through BFF User GET /me', () => {
    test('forwards the caller session to the contract /me operation and maps the SessionResponse', async () => {
      userBff.on('get', '/me', { body: sessionResponse() });

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-42');

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user).toEqual({
        id: 'agent-42',
        name: 'Alice Martin',
        initials: 'AM',
        email: 'alice.martin@mairie.test',
        phone: '+33123456789',
        service: 'Service urbanisme, Direction générale',
        role: 'User',
        isAdmin: false,
      });
      const [me] = userBff.calls('/me', 'get');
      expect(userBff.requests).toHaveLength(1);
      expect(me.headers.authorization).toBe(bearer('agent-42'));
      expect(me.headers.accept).toBe('application/json');
      expect(me.undeclaredQuery).toEqual([]);
    });

    test('omits null or missing optional fields and defaults the role to Guest', async () => {
      const body = sessionResponse({ phone: null }, []);
      delete (body.user as { role?: string }).role;
      userBff.on('get', '/me', { body });

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-guest');

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body.user).toEqual({
        id: 'agent-guest', name: 'Alice Martin', initials: 'AM', email: 'alice.martin@mairie.test', role: 'Guest', isAdmin: false,
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
      expect(response.body).toMatchObject({ code: 'UNAUTHORIZED' });
      expect(userBff.requests).toHaveLength(0);
    });

    test.each([401, 403])('turns a BFF User %i into a 401', async (status) => {
      userBff.on('get', '/me', userBffError(status));

      const response = await withSession(request(app).get('/elearning/catalog'), 'agent-expired');

      expect(response.status).toBe(401);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ code: 'UNAUTHORIZED', message: 'Session expirée ou invalide.', details: {} });
    });

    test('maps a BFF User 5xx to 502 without leaking the upstream body', async () => {
      userBff.on('get', '/me', { status: 500, body: { message: 'panic in handler' }, outOfContract: true });

      const response = await withSession(request(app).get('/elearning/catalog'), 'agent-500');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toEqual({ code: 'USER_SERVICE_UNAVAILABLE', message: 'Le service utilisateur est indisponible.', details: { status: 500 } });
      expect(JSON.stringify(response.body)).not.toContain('panic');
    });

    test.each<[string, MockReply]>([
      ['a dropped connection', { dropConnection: true }],
      ['a text body', { raw: 'OK', contentType: 'text/plain', outOfContract: true }],
      ['a JSON body without user', { body: { groups: [], roles: [] }, outOfContract: true }],
    ])('answers 502 when BFF User returns %s', async (_label, reply) => {
      userBff.on('get', '/me', reply);

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-broken');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toMatchObject({ code: 'USER_SERVICE_UNAVAILABLE' });
    });

    test('answers 502 when BFF User is unreachable', async () => {
      process.env.USER_BFF_URL = await unreachableUrl();

      const response = await withSession(request(app).get('/elearning/profile'), 'agent-offline');

      expect(response.status).toBe(502);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toMatchObject({ code: 'USER_SERVICE_UNAVAILABLE' });
    });
  });

  describe('learner routes', () => {
    beforeEach(() => { userBff.on('get', '/me', { body: sessionResponse() }); });

    test('GET /elearning/catalog returns a contract-valid, filtered catalogue', async () => {
      const response = await withSession(request(app).get('/elearning/catalog?status=not-started&pageSize=10'), 'catalog-agent');

      expect(response.status).toBe(200);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body.user).toMatchObject({ id: 'catalog-agent', isAdmin: false });
      expect(response.body.catalog.courses.length).toBeGreaterThan(0);
      expect(response.body.catalog.courses.every((course: { statusValue: string }) => course.statusValue === 'not-started')).toBe(true);
    });

    test('validates the catalogue query before resolving the session', async () => {
      const response = await withSession(request(app).get('/elearning/catalog?pageSize=500'), 'catalog-agent');

      expect(response.status).toBe(400);
      expectBffContract('get', '/elearning/catalog', response);
      expect(response.body).toMatchObject({ code: 'BAD_REQUEST' });
      expect(userBff.requests).toHaveLength(0);
    });

    test('PATCH /elearning/profile keeps role and identity from BFF User', async () => {
      const response = await withSession(request(app).patch('/elearning/profile'), 'profile-agent')
        .send({ city: 'Saint-Paul', phone: '0262000000', role: 'Admin', isAdmin: true });

      expect(response.status).toBe(200);
      expectBffContract('patch', '/elearning/profile', response);
      expect(response.body.user).toMatchObject({ id: 'profile-agent', city: 'Saint-Paul', phone: '0262000000', role: 'User', isAdmin: false });

      const reloaded = await withSession(request(app).get('/elearning/profile'), 'profile-agent');
      expect(reloaded.body.user).toMatchObject({ city: 'Saint-Paul', phone: '0262000000' });
      expect(userBff.requests).toHaveLength(2);
    });

    test('POST .../complete updates the progress of the session subject only', async () => {
      const complete = await withSession(request(app).post('/elearning/courses/rgpd-collectivites/contents/rgpd-1-video/complete'), 'progress-a')
        .send({ chapterId: 'rgpd-1', completed: true });

      expect(complete.status).toBe(200);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', complete);
      expect(complete.body.content).toMatchObject({ id: 'rgpd-1-video', completed: true });

      const other = await withSession(request(app).get('/elearning/catalog'), 'progress-b');
      const course = other.body.catalog.courses.find((entry: { id: string }) => entry.id === 'rgpd-collectivites');
      expect(course.details.chapters[0].contents.find((entry: { id: string }) => entry.id === 'rgpd-1-video').completed).not.toBe(true);
    });

    test.each([
      ['an unknown chapter', 'rgpd-collectivites', 'rgpd-1-video', { chapterId: 'nope', completed: true }, 'CHAPTER_NOT_FOUND'],
      ['an unknown content', 'rgpd-collectivites', 'nope', { chapterId: 'rgpd-1', completed: true }, 'CONTENT_NOT_FOUND'],
      ['an unknown course', 'nope', 'rgpd-1-video', { chapterId: 'rgpd-1', completed: true }, 'COURSE_NOT_FOUND'],
    ])('POST .../complete answers 404 for %s', async (_label, courseId, contentId, body, code) => {
      const response = await withSession(request(app).post(`/elearning/courses/${courseId}/contents/${contentId}/complete`), 'missing-agent').send(body);

      expect(response.status).toBe(404);
      expectBffContract('post', '/elearning/courses/{courseId}/contents/{contentId}/complete', response);
      expect(response.body.code).toBe(code);
    });

    test('POST .../rating records a contract-valid rating and rejects out-of-range values before BFF User', async () => {
      const rated = await withSession(request(app).post('/elearning/courses/accueil-agents/rating'), 'rating-agent').send({ rating: 5 });

      expect(rated.status).toBe(200);
      expectBffContract('post', '/elearning/courses/{courseId}/rating', rated);
      expect(rated.body).toMatchObject({ submitted: true });

      userBff.reset();
      const invalid = await withSession(request(app).post('/elearning/courses/accueil-agents/rating'), 'rating-agent').send({ rating: 7 });
      expect(invalid.status).toBe(400);
      expectBffContract('post', '/elearning/courses/{courseId}/rating', invalid);
      expect(userBff.requests).toHaveLength(0);
    });

    test('POST .../start starts a course without a body and answers 404 for an unknown course', async () => {
      const started = await withSession(request(app).post('/elearning/courses/relation-usager/start'), 'start-agent');

      expect(started.status).toBe(200);
      expectBffContract('post', '/elearning/courses/{courseId}/start', started);
      expect(started.body.course).toMatchObject({ id: 'relation-usager' });
      expect(started.body.redirectUrl).toBe('/courses/relation-usager');

      const missing = await withSession(request(app).post('/elearning/courses/nope/start'), 'start-agent').send({ source: 'catalog' });
      expect(missing.status).toBe(404);
      expectBffContract('post', '/elearning/courses/{courseId}/start', missing);
    });

    test('hides unexpected errors behind a generic 500', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const helpers = await import('../src/routes/Elearning/elearning_helpers');
      jest.spyOn(helpers, 'buildProfileResponse').mockImplementation(() => { throw new Error('secret stack detail'); });

      const response = await withSession(request(app).get('/elearning/profile'), 'crash-agent');

      expect(response.status).toBe(500);
      expectBffContract('get', '/elearning/profile', response);
      expect(response.body).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Erreur serveur non prevue.', details: {} });
    });
  });

  describe('administration routes', () => {
    const course = {
      id: 'contract-mock-course',
      title: 'Accessibilité numérique',
      description: 'Rendre les démarches en ligne accessibles.',
      instructor: 'Anne Leroy',
      duration: '45 min',
      category: 'Numérique',
      statusValue: 'not-started',
      progress: 0,
    };

    test.each(['Admin', 'admin', 'ADMIN'])('lets a BFF User role %s create, update and delete a course', async (role) => {
      userBff.on('get', '/me', { body: sessionResponse({ role }) });
      const id = `${course.id}-${role}`;

      const created = await withSession(request(app).post('/elearning/admin/courses'), 'admin-agent').send({ ...course, id });
      expect(created.status).toBe(201);
      expectBffContract('post', '/elearning/admin/courses', created);

      const duplicate = await withSession(request(app).post('/elearning/admin/courses'), 'admin-agent').send({ ...course, id });
      expect(duplicate.status).toBe(409);
      expectBffContract('post', '/elearning/admin/courses', duplicate);

      const updated = await withSession(request(app).patch(`/elearning/admin/courses/${id}`), 'admin-agent').send({ ...course, id, title: 'Accessibilité' });
      expect(updated.status).toBe(200);
      expectBffContract('patch', '/elearning/admin/courses/{courseId}', updated);
      expect(updated.body.course).toMatchObject({ id, title: 'Accessibilité' });

      const deleted = await withSession(request(app).delete(`/elearning/admin/courses/${id}`), 'admin-agent');
      expect(deleted.status).toBe(200);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', deleted);
      expect(deleted.body).toEqual({ deleted: true, courseId: id });

      const gone = await withSession(request(app).delete(`/elearning/admin/courses/${id}`), 'admin-agent');
      expect(gone.status).toBe(404);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', gone);
    });

    test('forbids non-administrators and leaves the catalogue untouched', async () => {
      userBff.on('get', '/me', { body: sessionResponse({ role: 'Administrateur' }, [group(1, 'admin')]) });

      const created = await withSession(request(app).post('/elearning/admin/courses'), 'fake-admin').send(course);
      const removed = await withSession(request(app).delete('/elearning/admin/courses/accueil-agents'), 'fake-admin');

      for (const [response, method, template] of [[created, 'post', '/elearning/admin/courses'], [removed, 'delete', '/elearning/admin/courses/{courseId}']] as const) {
        expect(response.status).toBe(403);
        expectBffContract(method, template, response);
        expect(response.body.code).toBe('FORBIDDEN');
      }
      const catalog = await withSession(request(app).get('/elearning/catalog'), 'fake-admin');
      expect(catalog.body.catalog.courses.map((entry: { id: string }) => entry.id)).toEqual(expect.arrayContaining(['accueil-agents']));
      expect(catalog.body.catalog.courses.map((entry: { id: string }) => entry.id)).not.toContain(course.id);
    });

    test('propagates a BFF User outage as 502 before any mutation', async () => {
      userBff.on('get', '/me', { dropConnection: true });

      const response = await withSession(request(app).delete('/elearning/admin/courses/accueil-agents'), 'admin-offline');

      expect(response.status).toBe(502);
      expectBffContract('delete', '/elearning/admin/courses/{courseId}', response);
    });
  });

  describe('GET /check_apis', () => {
    beforeEach(() => {
      coreApi.on('get', '/health', { raw: 'OK', contentType: 'text/plain' });
      elearningApi.on('get', '/health', { raw: 'OK', contentType: 'text/plain' });
    });

    test('reports both APIs connected through their contract /health operations', async () => {
      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(200);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'OK', core_api: 'Connected', elearning_api: 'Connected' });
      expect(coreApi.requests.map((call) => call.url.pathname)).toEqual(['/health']);
      expect(elearningApi.requests.map((call) => call.url.pathname)).toEqual(['/health']);
      expect(userBff.requests).toHaveLength(0);
    });

    test('reports each API independently and leaks no network detail', async () => {
      process.env.CORE_API_PORT = new URL(await unreachableUrl()).port;

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'Error', core_api: 'Unreachable', elearning_api: 'Connected' });
    });

    test('reports E-learning API unreachable when it answers an error', async () => {
      elearningApi.on('get', '/health', { status: 503, raw: 'down', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'Error', core_api: 'Connected', elearning_api: 'Unreachable' });
    });
  });
});
