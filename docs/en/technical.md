# BFF_Elearning — Technical documentation

[Module overview](module.md) · [Français](../fr/technical.md) · [README](../../README.md)

## Architecture and request handling

Express 5.2.1 server written in TypeScript. Zod schemas and their OpenAPI registry describe exchanged objects; routers adapt upstream services to interface needs.

`src/app.ts` mounts `/elearning` routes. `auth.ts` calls BFF User `/me` with a 5-second timeout. `elearning_upstream.ts` calls the E-learning API on behalf of the caller (their bearer is forwarded) and `elearning_helpers.ts` shapes its answers; `profile.ts` writes e-mail and phone through Core API. Administrator routes use the authenticated context’s role.

## Data and persistence

The BFF stores nothing: every answer is built from the upstream services during the request, so restarts and replicas are transparent.

- **Catalogue, course player, start**: E-learning API learner routes (`GET /api/v1/formations/`, `GET /api/v1/formations/{id}/`, `GET /api/v1/formations/{id}/{module}/`). A course is an E-learning *formation*, a chapter a *module*, a content an *attachment*; their numeric ids are exposed as strings (`"4"`). Only the courses the caller is enrolled in are listed (enrolment is done by an administrator in the E-learning API). Starting a course writes nothing: the API records the start when the first chapter is completed.
- **Content completion**: `PATCH /api/v1/formations/{id}/{module}/`. Progress is tracked per chapter upstream, so completing one content completes its whole chapter; `completed: false` answers 501 (no upstream operation undoes a completion).
- **Profile**: identity comes from BFF User `/me`; `email` and `phone` are saved by Core API `PATCH /api/v1/user/me/`, then `/me` is read again. `address` and `city` are stored by no service: a body carrying them answers 501 and nothing is written.
- **Not available yet (501)**: course ratings and course administration (create, update, delete), which have no E-learning API operation. The routes still validate their input and the administrator role first.
- Not provided by the E-learning API and therefore absent or neutral: categories, instructors, durations, deadlines, badges other than the status badge, `adminStats`, and the notification count (`0`).

Errors of the E-learning API are never relayed: 401 stays 401, a course the caller is not enrolled in (403) or an unknown one (404) is a 404, anything else (5xx, timeout, unexpected body) is a 502. A missing or invalid `ELEARNING_API_URL` is a 503.

## Installation and local startup

Use Node.js 24 to reproduce the CI jobs and npm with the committed lockfile. Other job and Docker versions are detailed below.

Private `@mairie360/*` dependencies require GitHub Packages access. Set `NODE_AUTH_TOKEN` in the environment to a token allowed to read these packages, as configured in `.npmrc`. Do not commit its value.

```bash
npm ci
```

Create `.env` in the repository root. Local HTTP configuration example to adapt to the running services:

```dotenv
PORT=4006
USER_BFF_URL=http://localhost:4000
CORE_API_URL=localhost
CORE_API_PORT=3000
ELEARNING_API_URL=localhost
ELEARNING_API_PORT=3006
```

```bash
npm run start
```

`PORT` is optional and defaults to `4006`.

Check the process, then open the interactive documentation:

```bash
curl --fail --silent --show-error http://localhost:4006/health
```

Swagger UI: `http://localhost:4006/docs`. JSON specification: `/openapi.json`, with `/swagger.json` as an alias. `/health` checks the process; `/check_apis` is a separate dependency diagnostic.

## Configuration

Values below are local examples or explicitly described behavior, not production credentials.

| Variable or precedence | Example / stated fallback | Purpose |
| --- | --- | --- |
| `PORT` | 4006 (default) | Listening port. |
| `TRUST_PROXY` | unset (`false`) | Express `trust proxy`: `true`, a number of hops or a list of addresses/subnets. |
| `USER_BFF_URL` | http://localhost:4000 | User identity through `/me` and diagnostics. **Required.** |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 | Profile writes (`PATCH /api/v1/user/me/`) and diagnostics. **URL required.** |
| `ELEARNING_API_URL` / `ELEARNING_API_PORT` | localhost / 3006 | Courses, progress and diagnostics. **URL required.** |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset (telemetry off) | OpenTelemetry collector of the instance, e.g. `http://otel-collector:4318`: traces and HTTP metrics are exported over OTLP (MAIR-504). Only the method, status, parameterised route and upstream host leave the BFF, never a URL, query string, header, id or IP. |
| `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` | `bff-elearning`; unset | Override the service name; extra resource attributes such as `service.version=<image tag>,deployment.environment.name=prod`. `OTEL_SDK_DISABLED=true` turns telemetry off. |

Each `*_URL` accepts a bare host (`elearning-api`, completed by `*_PORT`) or a full URL (`http://elearning-api:3006`, where `*_PORT` is ignored). Every URL is read on each call through `baseUrl` of `@mairie360/bffs-lib`. There is no `localhost` fallback: `src/index.ts` loads `.env` first (`import 'dotenv/config'`), then refuses to start (`assertConfigured`) when one of the three URLs is missing or invalid, naming each of them; a request reaching an unconfigured service answers 503 `SERVICE_UNAVAILABLE` (`/check_apis` reports it `Unreachable`).

## Routes and data contract

Inventory extracted from `contracts/openapi.json`. Replace brace parameters with real identifiers. Detailed types, required fields, responses and any examples are defined in that contract; table statuses are the declared statuses, not an exhaustive list of transport or validation errors.

| Method | Path | Declared body | Declared statuses |
| --- | --- | --- | --- |
| GET | `/health` | — | 200 |
| GET | `/check_apis` | — | 200, 502 |
| POST | `/elearning/admin/courses` | application/json | 201, 400, 401, 403, 500, 501, 502, 503 |
| PATCH | `/elearning/admin/courses/{courseId}` | application/json | 200, 400, 401, 403, 500, 501, 502, 503 |
| DELETE | `/elearning/admin/courses/{courseId}` | — | 200, 401, 403, 500, 501, 502, 503 |
| GET | `/elearning/catalog` | — | 200, 400, 401, 500, 502, 503 |
| POST | `/elearning/courses/{courseId}/contents/{contentId}/complete` | application/json | 200, 400, 401, 404, 500, 501, 502, 503 |
| GET | `/elearning/profile` | — | 200, 401, 500, 502, 503 |
| PATCH | `/elearning/profile` | application/json | 200, 400, 401, 409, 500, 501, 502, 503 |
| POST | `/elearning/courses/{courseId}/rating` | application/json | 200, 400, 401, 500, 501, 502, 503 |
| POST | `/elearning/courses/{courseId}/start` | application/json | 200, 400, 401, 404, 500, 502, 503 |

## Session, permissions and errors

Business routes accept one credential only, the `Authorization: Bearer <token>` header (the web service proxy turns the `accessToken` cookie into it; cookies and `x-session-token` are ignored). Without it they answer 401 before any upstream call (`requireBearer` from `@mairie360/bffs-lib`); otherwise they resolve the session through BFF User, and the same token, normalised to `Bearer <token>`, is forwarded to the E-learning API and Core API. The user `id` of the answers is the one BFF User returns (the user's name when it returns none), never a claim read from the unverified token. Session-bound answers carry `Cache-Control: no-store`, and `TRUST_PROXY` sets Express' `trust proxy` (unset: no proxy trusted). Session rejection produces 401; unavailability of BFF User or of an upstream API, or a `/me` response without a `user` object, produces 502; an upstream whose URL is not configured produces 503. Path identifiers (`courseId`, `contentId`) and `chapterId` must be positive integers (400 otherwise). Features with no upstream storage answer 501 (code `INTERNAL_ERROR`, explicit message) instead of faking a save. An unexpected error produces 500 without exposing its message; `/check_apis` (`checkApis` of `@mairie360/bffs-lib`) probes the `/health` operation of Core API, E-learning API and BFF User independently (keys `core_api`, `elearning_api`, `user_bff`, schema `CheckApisResponse`) and never returns network details. Course management is restricted to an administrator context by router checks.

Every error, 404 on an unknown route and 400 on an unparsable body included, is answered in the envelope shared by every BFF (`@mairie360/bffs-lib`): `{ "error": { "code": "NOT_FOUND", "message": "Course not found.", "details": [{ "path": "params.courseId", "message": "..." }] } }`. `code` derives from the status (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `INTERNAL_ERROR`, `BAD_GATEWAY`); `details` is always an array (one entry per invalid field on a 400). A BFF User status other than 401/403 answers 502. Upstream failures are mapped once by `callUpstream`/`upstreamError` of the lib: only the 4xx a route declares are relayed (with a generic message, never the upstream body), the rest is a 502. Idempotent upstream reads (BFF User `/me`, E-learning GETs) are retried once on no answer, 502, 503 or 504; writes are never retried. An invalid request answers 400 `Validation failed` (`parseRequest`). Security headers come from the lib (`securityHeaders`, plus `apiOnlyHeaders()` everywhere but `/docs`).

## Synchronization and verification

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

The tests in `tests/elearning.upstream-mocks.test.ts` run the whole app with the real axios clients against local HTTP servers simulating BFF User, Core API and E-learning API (enrolments, modules, attachments and module completion). Their contracts are rebuilt from the installed `@mairie360/bff-user-openapi`, `@mairie360/core-api-openapi` and `@mairie360/elearning-api-openapi` packages (orval types, versions pinned in `package.json`): every outgoing request (path, parameters, JSON body) and every mocked success response is validated against those contracts, and every BFF response against `contracts/openapi.json`. Bumping a package version is enough to test against the new contract; error statuses are not typed by orval and are mocked explicitly.

`contracts:generate` exports the runtime registry to `contracts/openapi.json` and regenerates `contracts/bff.d.ts`. `contracts:check` fails when the contract or types are stale. Then run `npm run contracts:sync` in each associated web service and deliver contract changes together.

The type generator is pinned to `openapi-typescript@7.10.1` in `scripts/contracts.mjs` and runs through npm. For documentation-only changes, check links, accuracy in both languages and `git diff --check`; do not regenerate contracts without changing their source.

## CI/CD and Docker execution

The `contracts.yml` job uses Node.js 24, `actions/checkout@v7` and `actions/setup-node@v7`. It runs on pushes, pull requests and manual dispatch; it installs with `npm ci`, checks contracts and runs the associated tests.

`cicd.yml` calls `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v3.2.0`, with `cicd_version: v3.2.0` and `node_version: "24"`. Reusable steps and GitHub environments determine actual checks, publications and deployments.

`Dockerfile` and `development.Dockerfile` use `node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1` (pinned by digest, the same Node.js 24 as the CI jobs); the image command is `["node", "dist/index.js"]`.

`security_test.sh` and `performance_test.sh` test the image named by `IMAGE_REF`: in CI, the image `release-dev` has just published, the same artifact that is then promoted to staging and prod. When `IMAGE_REF` is empty (local use), they first build `bff-elearning:local` from `development.Dockerfile`, which needs `NODE_AUTH_TOKEN` and `./.npmrc`.

`security_test.sh` runs the OWASP ZAP stack of `docker-compose-security.yml`: ZAP replays every operation of `/openapi.json` with a static admin JWT (`sub=1`, HS256, `JWT_SECRET=b"secret"`) and fills bodies, queries and path parameters from the contract examples. `init-test.sql` seeds users 1 (Admin) and 2 (User) and the E-learning formation of the contract examples (formation `4`, module `11`, attachment `27`), with both users enrolled. Keep examples and data in sync when adding a route.

The ZAP stack carries the OpenAPI coverage gate of `mairie360/CICD` (`tests/zap/zap_hooks.py`), checked out as `cicd-repo/` by the CI job and cloned there by `security_test.sh` / `performance_test.sh` at the pinned `cicd_version` (`CICD_VERSION` overrides it). After the scan, the hook fails when an operation of the contract was never reached, or when an operation that requires `bearerAuth` only got 401/403. Public operations (`/health`, `/check_apis`) declare `security: []` in their `registerPath`; declare it on any new public route.

The k6 stack carries the other half of the gate (`tests/k6/coverage.js`): `load-test.js` holds one handler per operation of `contracts/openapi.json`, so k6 aborts at init when one is missing and fails its `operations_uncovered` threshold when a handler does not send its request. **Adding a route means adding its handler in `load-test.js`.** Two scenarios share the handlers: `crud` (2 VUs) calls every handler once per iteration, writes included (the 501 answers of ratings, course administration and address edits are declared expected statuses); `reads` (ramp to 20 VUs) replays only the GET handlers. Every operation has a `p(95)` threshold set by its family: 50 ms for `/health`, 300 ms for `/check_apis`, 600 ms for reads (BFF User plus the E-learning API fan-out), 800 ms for writes; `http_req_failed` must stay below 1 %.

Before running Docker, check service variables, build secrets and networks in the repository files. Green CI validates its jobs; it does not prove business-service availability in a remote environment.

## Troubleshooting

If the catalogue rejects the session, check BFF User. An empty catalogue means the caller is enrolled in no formation of the E-learning API (an administrator enrols users there). A 503 on every course route means `ELEARNING_API_URL` is missing; a 502 usually means it is wrong or the API is down: `/check_apis` tells which service is unreachable.

## Repository reference

- [src/app.ts](../../src/app.ts)
- [src/routes/Elearning/auth.ts](../../src/routes/Elearning/auth.ts)
- [src/routes/Elearning/elearning_helpers.ts](../../src/routes/Elearning/elearning_helpers.ts)
- [src/routes/Elearning/elearning_upstream.ts](../../src/routes/Elearning/elearning_upstream.ts)
- [src/clients/upstream.ts](../../src/clients/upstream.ts)
- [src/routes/Elearning/admin_courses.ts](../../src/routes/Elearning/admin_courses.ts)
- [src/routes/Elearning/catalog.ts](../../src/routes/Elearning/catalog.ts)
- [src/clients/elearningClient.ts](../../src/clients/elearningClient.ts)
- [contracts/openapi.json](../../contracts/openapi.json)
- [contracts/bff.d.ts](../../contracts/bff.d.ts)
- [scripts/contracts.mjs](../../scripts/contracts.mjs)
- [package.json](../../package.json)
- [.github/workflows/contracts.yml](../../.github/workflows/contracts.yml)
- [.github/workflows/cicd.yml](../../.github/workflows/cicd.yml)
- [Dockerfile](../../Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)

Historical supplements: [CONTRACT.md](../../CONTRACT.md). Proposed requirements must remain distinct from implemented behavior.
