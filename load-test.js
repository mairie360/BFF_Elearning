import http from 'k6/http';
import { check, sleep } from 'k6';
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
//   Course administration (MAIR-1150) works on courses the handlers create and delete themselves (helper
//   requests tagged `op:setup`), never on the seeded course 4; so does the enrolment (MAIR-817), whose reads list the
//   seeded agent on course 4. The attestation and rating handlers first
//   complete the seeded chapter (idempotent, once per VU), so they never depend on the order of the handlers.
// - `reads`: replays only the GET handlers, as random learners of init-perf.sql.
// - `catalog_rush`: `GET /elearning/catalog` at a fixed arrival rate, failing on any dropped iteration.
// Every operation gets a p(95) threshold, whose budget depends on its family (`budgetOf`).
//
// MAIR-474: the stack also runs init-perf.sql (ELearning_API's seed: 300 formations of 10 modules,
// 2 000 learners enrolled in 15 formations each), every read checks that it got the learner's own
// profile and formations, and the thresholds are strict (every check passes, no failed request, no
// dropped iteration). K6_PROFILE sizes the load: `ci` (default) is what the 4 vCPU CI runner holds,
// `stress` is the high load, run by hand.
//
// The BFF resolves the session through BFF User /me: user 1 (Admin) and user 2 (User) are seeded
// by init-test.sql, both enrolled in the E-learning formation 4 (module 11, attachment 27), which
// the learner handlers read and complete through the E-learning API.
// ---------------------------------------------------------------------------

// EdDSA tokens signed by performance_test.sh with this run's key, like Core signs them (MAIR-474,
// MAIR-680): k6 cannot sign Ed25519 and nothing is signed with a committed key. ADMIN_JWT is the
// Admin's (`sub=1`); the file maps every other seeded caller's id to its token (role `user`).
const ADMIN_JWT = __ENV.ADMIN_JWT;
if (!ADMIN_JWT) throw new Error('ADMIN_JWT is not set: run ./performance_test.sh, which signs it');
const TOKENS = JSON.parse(open(__ENV.JWT_TOKENS_FILE || '/tokens.json'));
const USER_ID = __ENV.PERF_USER_ID || '2';
// E-learning formation seeded by init-test.sql.
const FIXTURE_COURSE_ID = '4';
const FIXTURE_CHAPTER_ID = '11';
const FIXTURE_CONTENT_ID = '27';
// Rows of init-perf.sql: learners 200001..202000; learner of rank i is enrolled in the 15 formations
// 5000 + (i + 20k) % 300, k = 0..14.
const LEARNERS = { first: 200001, count: 2000, formations: 15 };

const PROFILES = {
  ci: { readVus: 30, crudVus: 2, rushRate: 30 },
  stress: { readVus: 100, crudVus: 4, rushRate: 100 },
};
const PROFILE = PROFILES[__ENV.K6_PROFILE || 'ci'];
if (!PROFILE) throw new Error(`Unknown K6_PROFILE ${__ENV.K6_PROFILE}: ${Object.keys(PROFILES).join(', ')}`);


// Token of seeded caller `id`, signed by performance_test.sh (fails the run on an unknown id).
function jwtOf(id) {
  const token = TOKENS[String(id)];
  if (!token) throw new Error(`no token signed for user ${id}: see performance_test.sh`);
  return token;
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

const learnerTokens = {};
/** A random seeded learner: its id, `Authorization` header and the ids of its formations. */
function randomLearner() {
  const rank = Math.floor(Math.random() * LEARNERS.count);
  const id = LEARNERS.first + rank;
  if (!learnerTokens[id]) learnerTokens[id] = bearer(jwtOf(id));
  const formations = new Set();
  for (let k = 0; k < LEARNERS.formations; k += 1) formations.add(String(5000 + ((rank + 20 * k) % 300)));
  return { id, headers: learnerTokens[id], formations };
}

function json(response) {
  try {
    return response.json();
  } catch (_) {
    return null;
  }
}

/** The catalogue of `learner`: its own profile and a full first page of its own formations. */
function checkCatalog(response, learner, prefix) {
  return check(response, {
    [`${prefix} 200`]: (r) => r.status === 200,
    [`${prefix} lists the learner formations`]: (r) => {
      const body = json(r) || {};
      const courses = (body.catalog || {}).courses || [];
      return r.status === 200 && (body.user || {}).id === String(learner.id) && courses.length === 10
        && courses.every((course) => learner.formations.has(String(course.id)));
    },
  });
}

// The admin course routes take the whole course: a mandatory course past its deadline, one chapter of a link and a quiz.
function courseBody(title) {
  return {
    title,
    description: 'Course created by the k6 load test',
    category: 'Integration',
    level: 'beginner',
    mandatory: true,
    deadline: '2020-01-31',
    details: {
      title,
      description: 'Course created by the k6 load test',
      chapters: [{
        id: 'new-chapter',
        title: 'Introduction',
        contents: [
          { id: 'new-link', title: 'CNIL', type: 'link', href: 'https://www.cnil.fr/', duration: '10 min' },
          { id: 'new-quiz', title: 'Quiz', type: 'quiz', duration: '5 min', required: false },
        ],
      }],
    },
  };
}

const SETUP = { tags: { op: 'setup' } };

/** A course of the administrator, created for one handler: its id. */
function createCourse(data) {
  const response = http.post(coverage.url('POST /elearning/admin/courses'), JSON.stringify(courseBody('k6 scratch course')), {
    headers: Object.assign({ 'Content-Type': 'application/json' }, data.admin),
    tags: SETUP.tags,
  });
  check(response, { 'setup course 201': (r) => r.status === 201 });
  return (json(response) || {}).id;
}

function deleteCourse(data, courseId) {
  if (!courseId) return;
  const response = http.del(coverage.url('DELETE /elearning/admin/courses/{courseId}', { courseId }), null, { headers: data.admin, tags: SETUP.tags });
  check(response, { 'cleanup course 200': (r) => r.status === 200 });
}

// The user completes the seeded chapter once per VU: the completion is kept upstream, so the attestation and the
// rating answer 200 whatever ran before.
let completedOnce = false;
function ensureCompleted(headers) {
  if (completedOnce) return;
  const op = 'POST /elearning/courses/{courseId}/contents/{contentId}/complete';
  const response = http.post(
    coverage.url(op, { courseId: FIXTURE_COURSE_ID, contentId: FIXTURE_CONTENT_ID }),
    JSON.stringify({ chapterId: FIXTURE_CHAPTER_ID, completed: true }),
    { headers: Object.assign({ 'Content-Type': 'application/json' }, headers), tags: SETUP.tags },
  );
  completedOnce = check(response, { 'setup completion 200': (r) => r.status === 200 });
}

function isPdf(r) {
  return r.status === 200 && String(r.headers['Content-Type'] || '').includes('application/pdf');
}

const handlers = {
  // --- Connectivity (public) ---
  'GET /health': ({ request }) =>
    check(request(), { 'health 200': (r) => r.status === 200 }),
  'GET /check_apis': ({ request }) =>
    check(request(), { 'check_apis 200': (r) => r.status === 200 }),

  // --- Admin: courses (MAIR-1150), on courses the handlers create ---
  'POST /elearning/admin/courses': ({ request, data }) => {
    const response = request({ body: courseBody('k6 course'), headers: data.admin });
    check(response, { 'create course 201': (r) => r.status === 201 && /^[1-9][0-9]*$/.test((json(r) || {}).id) });
    deleteCourse(data, (json(response) || {}).id);
  },
  'DELETE /elearning/admin/courses/{courseId}': ({ request, data }) => {
    const courseId = createCourse(data);
    check(request({ path: { courseId }, headers: data.admin }), {
      'delete course 200': (r) => r.status === 200 && (json(r) || {}).deleted === true,
    });
  },
  'PATCH /elearning/admin/courses/{courseId}': ({ request, data }) => {
    const courseId = createCourse(data);
    // The PATCH body is the course the front edits, its id included (ElearningCourse), unlike the POST body.
    check(request({ path: { courseId }, body: Object.assign({ id: courseId }, courseBody('k6 course, patched')), headers: data.admin }), {
      'patch course 200': (r) => r.status === 200 && (json(r) || {}).id === courseId,
    });
    deleteCourse(data, courseId);
  },
  'POST /elearning/admin/courses/{courseId}/reminders': ({ request, data }) => {
    const courseId = createCourse(data);
    check(request({ path: { courseId }, body: {}, headers: data.admin }), {
      'reminders 200': (r) => r.status === 200 && typeof (json(r) || {}).sent === 'number',
    });
    deleteCourse(data, courseId);
  },
  // --- Admin: enrolment (MAIR-817): the seeded agent on the course 4 it is enrolled in (reads), on courses the handlers
  // create and delete (writes) ---
  'GET /elearning/admin/agents': ({ request, data }) =>
    check(request({ query: { limit: 20 }, headers: data.admin }), {
      'agents 200': (r) => r.status === 200,
      'agents list the seeded agent': (r) => r.status === 200 && ((json(r) || {}).agents || []).some((agent) => agent.userId === USER_ID),
    }),
  'GET /elearning/admin/courses/{courseId}/learners': ({ request, data }) =>
    check(request({ path: { courseId: FIXTURE_COURSE_ID }, query: { limit: 5 }, headers: data.admin }), {
      'learners 200': (r) => r.status === 200,
      // Ordered by name: the seeded agent is counted in `total`, not necessarily on the first page of the perf seed.
      'learners count the seeded agents': (r) => r.status === 200 && ((json(r) || {}).total || 0) >= 1 && ((json(r) || {}).learners || []).length >= 1,
    }),
  'POST /elearning/admin/courses/{courseId}/learners': ({ request, data }) => {
    const courseId = createCourse(data);
    check(request({ path: { courseId }, body: { userIds: [USER_ID] }, headers: data.admin }), {
      'enrol learners 200': (r) => r.status === 200 && JSON.stringify((json(r) || {}).enrolled) === JSON.stringify([USER_ID]),
    });
    deleteCourse(data, courseId);
  },
  'DELETE /elearning/admin/courses/{courseId}/learners/{userId}': ({ request, data }) => {
    const courseId = createCourse(data);
    const enrol = http.post(
      coverage.url('POST /elearning/admin/courses/{courseId}/learners', { courseId }),
      JSON.stringify({ userIds: [USER_ID] }),
      { headers: Object.assign({ 'Content-Type': 'application/json' }, data.admin), tags: SETUP.tags },
    );
    check(enrol, { 'setup enrolment 200': (r) => r.status === 200 });
    check(request({ path: { courseId, userId: USER_ID }, headers: data.admin }), {
      'remove learner 200': (r) => r.status === 200 && (json(r) || {}).removed === true,
    });
    deleteCourse(data, courseId);
  },
  'GET /elearning/admin/stats': ({ request, data }) =>
    check(request({ headers: data.admin }), {
      'stats 200': (r) => r.status === 200,
      'stats list the courses': (r) => r.status === 200 && Array.isArray((json(r) || {}).byCourse) && (json(r) || {}).byCourse.length > 0,
    }),

  // --- Learner ---
  'GET /elearning/catalog': ({ request }) => {
    const learner = randomLearner();
    checkCatalog(request({ query: { status: 'all', page: 1, pageSize: 10 }, headers: learner.headers }), learner, 'catalog');
  },
  'POST /elearning/courses/{courseId}/contents/{contentId}/complete': ({ request }) =>
    check(
      request({
        path: { courseId: FIXTURE_COURSE_ID, contentId: FIXTURE_CONTENT_ID },
        body: { chapterId: FIXTURE_CHAPTER_ID, completed: true },
      }),
      { 'complete content 200': (r) => r.status === 200 },
    ),
  'GET /elearning/profile': ({ request }) => {
    const learner = randomLearner();
    check(request({ headers: learner.headers }), {
      'profile 200': (r) => r.status === 200,
      'profile is the learner': (r) => r.status === 200 && ((json(r) || {}).user || {}).id === String(learner.id),
    });
  },
  'POST /elearning/courses/{courseId}/rating': ({ request, data }) => {
    ensureCompleted(data.user);
    check(request({ path: { courseId: FIXTURE_COURSE_ID }, body: { rating: 5 } }), {
      'rating 200': (r) => r.status === 200 && (json(r) || {}).myRating === 5,
    });
  },
  'GET /elearning/courses/{courseId}/certificate': ({ request, data }) => {
    ensureCompleted(data.user);
    check(request({ path: { courseId: FIXTURE_COURSE_ID } }), { 'certificate 200 PDF': isPdf });
  },
  'GET /elearning/certificates': ({ request, data }) => {
    ensureCompleted(data.user);
    check(request({}), { 'certificates 200 PDF': isPdf });
  },
  'GET /elearning/courses/{courseId}/chapters/{chapterId}/contents/{contentId}/file': ({ request }) =>
    check(request({ path: { courseId: FIXTURE_COURSE_ID, chapterId: FIXTURE_CHAPTER_ID, contentId: FIXTURE_CONTENT_ID } }), {
      'file 200': (r) => r.status === 200 && /^https:\/\//.test((json(r) || {}).url || ''),
    }),
  'GET /elearning/training-time': ({ request }) => {
    const learner = randomLearner();
    check(request({ headers: learner.headers }), {
      'training time 200': (r) => r.status === 200,
      'training time lists the learner formations': (r) => r.status === 200
        && ((json(r) || {}).courses || []).every((course) => learner.formations.has(String(course.id))),
    });
  },
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
  if (method === 'GET') return 600; // Core /me + E-learning API reads (catalogue, summary, PDF, stats)
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
        { duration: '30s', target: Math.ceil(PROFILE.readVus / 2) }, // ramp-up
        { duration: '30s', target: PROFILE.readVus },
        { duration: '2m', target: PROFILE.readVus }, // steady load
        { duration: '20s', target: 0 }, // ramp-down
      ],
    },
    crud: {
      executor: 'constant-vus',
      exec: 'crud',
      vus: PROFILE.crudVus,
      duration: '3m20s',
    },
    catalog_rush: {
      executor: 'constant-arrival-rate',
      exec: 'catalogRush',
      startTime: '1m', // once the reads are at their peak
      rate: PROFILE.rushRate,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 30,
      maxVUs: 200,
    },
  },
  thresholds: {
    ...coverage.thresholds,
    ...perOperationThresholds,
    'http_req_duration{op:catalog_rush}': ['p(95)<600'],
    dropped_iterations: ['count==0'], // the rush kept its rate
    // Strict (MAIR-474): one wrong status, one wrong row or one failed request fails the run.
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
  },
};

export function setup() {
  return { admin: bearer(ADMIN_JWT), user: bearer(jwtOf(USER_ID)) };
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

export function catalogRush() {
  const learner = randomLearner();
  const op = 'GET /elearning/catalog';
  checkCatalog(
    http.get(coverage.url(op, {}, { status: 'all', page: 1, pageSize: 10 }), { headers: learner.headers, tags: { op: 'catalog_rush' } }),
    learner,
    'rush catalog',
  );
}

export function crud(data) {
  // User token by default; the /elearning/admin/* handlers pass the admin one.
  coverage.run({ headers: data.user, data });
  sleep(1);
}
