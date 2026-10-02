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
//   Ratings, course administration and address edits have no upstream storage yet: they answer 501,
//   declared as the expected status of their request (`NOT_IMPLEMENTED`).
// - `reads` (up to 20 VUs): replays only the GET handlers.
// Every operation gets a p(95) threshold, whose budget depends on its family (`budgetOf`).
//
// The BFF resolves the session through BFF User /me: user 1 (Admin) and user 2 (User) are seeded
// by init-test.sql, both enrolled in the E-learning formation 4 (module 11, attachment 27), which
// the learner handlers read and complete through the E-learning API.
// ---------------------------------------------------------------------------

// Must match the JWT_SECRET of the core-api / bff-user services of the test stack.
const JWT_SECRET = __ENV.JWT_SECRET || 'b"secret"';
const USER_ID = __ENV.PERF_USER_ID || '2';
const ADMIN_ID = __ENV.PERF_ADMIN_ID || '1';
// E-learning formation seeded by init-test.sql.
const FIXTURE_COURSE_ID = '4';
const FIXTURE_CHAPTER_ID = '11';
const FIXTURE_CONTENT_ID = '27';
// Routes with no upstream storage yet answer 501: expected, so not counted in http_req_failed.
const NOT_IMPLEMENTED = { responseCallback: http.expectedStatuses(501) };

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

// The admin course routes take the whole course (id, title, description).
function courseBody(id, title) {
  return { id, title, description: 'Course created by the k6 load test', category: 'Integration', duration: '1 h' };
}

const handlers = {
  // --- Connectivity (public) ---
  'GET /health': ({ request }) =>
    check(request(), { 'health 200': (r) => r.status === 200 }),
  'GET /check_apis': ({ request }) =>
    check(request(), { 'check_apis 200': (r) => r.status === 200 }),

  // --- Admin: courses (501 until the E-learning API can edit formations) ---
  'POST /elearning/admin/courses': ({ request, data }) =>
    check(request({ body: courseBody('perf-course', 'k6 course'), headers: data.admin, params: NOT_IMPLEMENTED }), {
      'create course 501': (r) => r.status === 501,
    }),
  'DELETE /elearning/admin/courses/{courseId}': ({ request, data }) =>
    check(request({ path: { courseId: FIXTURE_COURSE_ID }, headers: data.admin, params: NOT_IMPLEMENTED }), {
      'delete course 501': (r) => r.status === 501,
    }),
  'PATCH /elearning/admin/courses/{courseId}': ({ request, data }) =>
    check(
      request({ path: { courseId: FIXTURE_COURSE_ID }, body: courseBody(FIXTURE_COURSE_ID, 'k6 course, patched'), headers: data.admin, params: NOT_IMPLEMENTED }),
      { 'patch course 501': (r) => r.status === 501 },
    ),

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
    check(request({ body: { phone: '0612345678' } }), {
      'patch profile 200': (r) => r.status === 200,
    }),
  'POST /elearning/courses/{courseId}/rating': ({ request }) =>
    check(request({ path: { courseId: FIXTURE_COURSE_ID }, body: { rating: 5 }, params: NOT_IMPLEMENTED }), {
      'rating 501': (r) => r.status === 501,
    }),
  'POST /elearning/courses/{courseId}/start': ({ request }) =>
    check(request({ path: { courseId: FIXTURE_COURSE_ID }, body: { source: 'catalog' } }), {
      'start 200': (r) => r.status === 200,
    }),
};

const coverage = createCoverage(handlers);
const readOperations = coverage.operations.filter((o) => o.method === 'GET');

// p(95) budget of an operation, per family.
function budgetOf({ op, method }) {
  if (op === 'GET /health') return 50; // process probe
  if (op === 'GET /check_apis') return 300; // -> Core + E-learning /health
  if (method === 'GET') return 600; // BFF User /me + E-learning API fan-out (formations, modules)
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
  // User token by default; the /elearning/admin/* handlers pass the admin one.
  coverage.run({ headers: data.user, data });
  sleep(1);
}
