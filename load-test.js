import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { createCoverage } from '/coverage.js';

// ---------------------------------------------------------------------------
// k6 load test of the BFF Elearning.
//
// Every operation of the contract (contracts/openapi.json, mounted as /openapi.json) has one
// handler below: the shared OpenAPI coverage module (mairie360/CICD tests/k6/coverage.js, see
// performance_test.sh) aborts at init when an operation has no handler, and fails the
// `operations_uncovered` threshold when a handler ends without sending its request. Adding a route
// to the BFF therefore means adding its handler here.
//
// Two scenarios share the handlers:
// - `crud` (2 VUs): `coverage.run()` calls every handler once per iteration, reads and writes, so
//   it carries the coverage gate. Handlers run path by path in contract order and, for one path,
//   in the order get, put, post, delete, options, head, patch, trace (so DELETE runs before PATCH).
//   POST /elearning/admin/courses creates two courses with unique ids: DELETE removes the
//   disposable one, PATCH updates the kept one, which `cleanup()` removes at the end of the
//   iteration (the catalogue is in memory, shared by every user of the BFF process).
// - `reads` (up to 20 VUs): replays only the GET handlers, which never depend on `state`.
// Every operation gets a p(95) threshold, whose budget depends on its family (`budgetOf`).
//
// The BFF resolves the session through BFF User /me: user 1 (Admin) and user 2 (User) are seeded
// by init-test.sql. Progress, ratings and profile edits are kept per JWT `sub`, on the built-in
// course `accueil-agents` (content `accueil-1-video` of chapter `accueil-1`).
// ---------------------------------------------------------------------------

// Must match the JWT_SECRET of the core-api / bff-user services of the test stack.
const JWT_SECRET = __ENV.JWT_SECRET || 'b"secret"';
const USER_ID = __ENV.PERF_USER_ID || '2';
const ADMIN_ID = __ENV.PERF_ADMIN_ID || '1';
// Built-in course of the in-memory catalogue (elearning_helpers.ts).
const FIXTURE_COURSE_ID = 'accueil-agents';
const FIXTURE_CHAPTER_ID = 'accueil-1';
const FIXTURE_CONTENT_ID = 'accueil-1-video';

// State of the current iteration (module scope is per VU in k6).
let state = {};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

// Minimal HS256 JWT accepted by Core API / BFF User (sub + role + exp claims).
function mintJwt(sub, role) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub, role, exp: now + 3600 }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.hmac('sha256', JWT_SECRET, signingInput, 'base64rawurl');
  return `${signingInput}.${signature}`;
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function unique(prefix) {
  return `${prefix}-${__VU}-${__ITER}-${Date.now()}`;
}

function need(value, what) {
  if (value === undefined || value === null) {
    throw new Error(`${what} is missing, an earlier handler of this iteration failed`);
  }
  return value;
}

// PATCH /elearning/admin/courses/{courseId} takes the whole course (id, title, description).
function courseBody(id, title) {
  return { id, title, description: 'Course created by the k6 load test', category: 'Integration', duration: '1 h' };
}

const handlers = {
  // --- Connectivity (public) ---
  'GET /health': ({ request }) =>
    check(request(), { 'health 200': (r) => r.status === 200 }),
  'GET /check_apis': ({ request }) =>
    check(request(), { 'check_apis 200': (r) => r.status === 200 }),

  // --- Admin: courses ---
  // Two courses: one kept for PATCH, one for DELETE (which runs before PATCH).
  'POST /elearning/admin/courses': ({ request, data }) => {
    [state.courseId, state.disposableCourseId] = [unique('perf-course'), unique('perf-course-deleted')].map((id) => {
      const res = request({ body: courseBody(id, 'k6 course'), headers: data.admin });
      check(res, { 'create course 201': (r) => r.status === 201 });
      return res.status === 201 ? id : undefined;
    });
  },
  'DELETE /elearning/admin/courses/{courseId}': ({ request, data }) =>
    check(request({ path: { courseId: need(state.disposableCourseId, 'disposable course') }, headers: data.admin }), {
      'delete course 200': (r) => r.status === 200,
    }),
  'PATCH /elearning/admin/courses/{courseId}': ({ request, data }) => {
    const courseId = need(state.courseId, 'created course');
    check(request({ path: { courseId }, body: courseBody(courseId, 'k6 course, patched'), headers: data.admin }), {
      'patch course 200': (r) => r.status === 200,
    });
  },

  // --- Learner ---
  'GET /elearning/catalog': ({ request }) =>
    check(request({ query: { search: 'accueil', category: 'Integration', status: 'all', page: 1, pageSize: 10 } }), {
      'catalog 200': (r) => r.status === 200,
    }),
  'POST /elearning/courses/{courseId}/contents/{contentId}/complete': ({ request }) =>
    check(
      request({
        path: { courseId: FIXTURE_COURSE_ID, contentId: FIXTURE_CONTENT_ID },
        body: { chapterId: FIXTURE_CHAPTER_ID, completed: true },
      }),
      { 'complete content 200': (r) => r.status === 200 },
    ),
  'GET /elearning/profile': ({ request }) =>
    check(request(), { 'profile 200': (r) => r.status === 200 }),
  'PATCH /elearning/profile': ({ request }) =>
    check(request({ body: { phone: '0612345678', address: '1 place de la Mairie', city: 'Paris' } }), {
      'patch profile 200': (r) => r.status === 200,
    }),
  'POST /elearning/courses/{courseId}/rating': ({ request }) =>
    check(request({ path: { courseId: FIXTURE_COURSE_ID }, body: { rating: 5 } }), {
      'rating 200': (r) => r.status === 200,
    }),
  'POST /elearning/courses/{courseId}/start': ({ request }) =>
    check(request({ path: { courseId: FIXTURE_COURSE_ID }, body: { source: 'catalog' } }), {
      'start 200': (r) => r.status === 200,
    }),
};

const coverage = createCoverage(handlers);
const readOperations = coverage.operations.filter((o) => o.method === 'GET');

// Deletes the course kept by the handlers, so that the in-memory catalogue does not grow.
function cleanup(data) {
  if (!state.courseId) return;
  const op = 'DELETE /elearning/admin/courses/{courseId}';
  http.del(coverage.url(op, { courseId: state.courseId }), null, { headers: data.admin, tags: { op } });
}

// p(95) budget of an operation, per family.
function budgetOf({ op, method }) {
  if (op === 'GET /health') return 50; // process probe
  if (op === 'GET /check_apis') return 300; // -> Core + E-learning /health
  if (method === 'GET') return 400; // BFF User /me + in-memory shaping
  return 800; // writes
}

const perOperationThresholds = {};
for (const operation of coverage.operations) {
  perOperationThresholds[`http_req_duration{op:${operation.op}}`] = [`p(95)<${budgetOf(operation)}`];
}

export const options = {
  scenarios: {
    reads: {
      executor: 'ramping-vus',
      exec: 'reads',
      stages: [
        { duration: '30s', target: 20 }, // ramp-up
        { duration: '1m', target: 20 }, // steady load
        { duration: '10s', target: 0 }, // ramp-down
      ],
    },
    crud: {
      executor: 'constant-vus',
      exec: 'crud',
      vus: 2,
      duration: '1m40s',
    },
  },
  thresholds: {
    ...coverage.thresholds,
    ...perOperationThresholds,
    http_req_failed: ['rate<0.01'], // < 1% errors
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { admin: bearer(mintJwt(ADMIN_ID, 'admin')), user: bearer(mintJwt(USER_ID, 'user')) };
}

// Every GET handler, with a plain request() (no coverage accounting: `crud` owns the gate).
export function reads(data) {
  for (const operation of readOperations) {
    const request = (call = {}) =>
      http.get(coverage.url(operation.op, call.path, call.query), {
        headers: Object.assign({}, data.user, call.headers),
        tags: { op: operation.op },
      });
    handlers[operation.op]({ request, data, op: operation.op, method: operation.method, path: operation.path });
  }
  sleep(1);
}

export function crud(data) {
  state = {};
  // User token by default; the /elearning/admin/* handlers pass the admin one.
  coverage.run({ headers: data.user, data });
  cleanup(data);
  sleep(1);
}
