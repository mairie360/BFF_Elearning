# BFF_Elearning — Technical documentation

[Module overview](module.md) · [Français](../fr/technical.md) · [README](../../README.md)

## Architecture and request handling

Express 5.2.1 server written in TypeScript. Zod schemas and their OpenAPI registry describe exchanged objects; routers adapt upstream services to interface needs.

`src/app.ts` mounts `/elearning` routes. `auth.ts` calls BFF User `/me` with a 5-second timeout. Helpers construct responses and modify the in-memory catalogue and progress. Administrator routes use the authenticated context’s role.

## Data and persistence

The initial catalogue is defined in `elearning_helpers.ts`. Course edits, progress, ratings and profile overrides are held in memory, including user-keyed maps. BFF User supplies identity. The included Elearning API client and diagnostics do not make this storage persistent.

Restarting resets in-memory data; multiple instances do not share that state. Contract validation or an HTTP success does not prove durable storage in Elearning API.

## Installation and local startup

Use Node.js 22 to reproduce the contract job and npm with the committed lockfile. Other job and Docker versions are detailed below.

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

`PORT` is required by this BFF; this example uses `4006`.

Check the process, then open the interactive documentation:

```bash
curl --fail --silent --show-error http://localhost:4006/health
```

Swagger UI: `http://localhost:4006/docs`. JSON specification: `/openapi.json`, with `/swagger.json` as an alias. `/health` checks the process; `/check_apis` is a separate dependency diagnostic.

## Configuration

Values below are local examples or explicitly described behavior, not production credentials.

| Variable or precedence | Example / stated fallback | Purpose |
| --- | --- | --- |
| `PORT` | 4006 | Port used by this local example. |
| `USER_BFF_URL` | http://localhost:4000 | User identity through `/me`. |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 | Core configuration and diagnostics. |
| `ELEARNING_API_URL` / `ELEARNING_API_PORT` | localhost / 3006 | API client and diagnostics; not the current catalogue store. |

## Routes and data contract

Inventory extracted from `contracts/openapi.json`. Replace brace parameters with real identifiers. Detailed types, required fields, responses and any examples are defined in that contract; table statuses are the declared statuses, not an exhaustive list of transport or validation errors.

| Method | Path | Declared body | Declared statuses |
| --- | --- | --- | --- |
| GET | `/health` | — | 200 |
| GET | `/check_apis` | — | 200, 502 |
| POST | `/elearning/admin/courses` | application/json | 201, 400, 401, 403, 409, 500, 502 |
| PATCH | `/elearning/admin/courses/{courseId}` | application/json | 200, 400, 401, 403, 404, 500, 502 |
| DELETE | `/elearning/admin/courses/{courseId}` | — | 200, 401, 403, 404, 500, 502 |
| GET | `/elearning/catalog` | — | 200, 400, 401, 500, 502 |
| POST | `/elearning/courses/{courseId}/contents/{contentId}/complete` | application/json | 200, 400, 401, 404, 422, 500, 502 |
| GET | `/elearning/profile` | — | 200, 401, 500, 502 |
| PATCH | `/elearning/profile` | application/json | 200, 400, 401, 500, 502 |
| POST | `/elearning/courses/{courseId}/rating` | application/json | 200, 400, 401, 404, 500, 502 |
| POST | `/elearning/courses/{courseId}/start` | application/json | 200, 400, 401, 404, 422, 500, 502 |

## Session, permissions and errors

Business routes expect a Bearer token and resolve the session through BFF User. Session rejection produces 401; user-service unavailability, or a `/me` response without a `user` object, produces 502. An unexpected error produces 500 without exposing its message; `/check_apis` probes Core and E-learning independently and never returns network details. Course management is restricted to an administrator context by router checks.

## Synchronization and verification

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

The tests in `tests/elearning.upstream-mocks.test.ts` run the whole app with the real axios client against local HTTP servers simulating BFF User, Core API and E-learning API. Their contracts are rebuilt from the installed `@mairie360/bff-user-openapi`, `@mairie360/core-api-openapi` and `@mairie360/elearning-api-openapi` packages (orval types, versions pinned in `package.json`): every outgoing request (path, parameters, JSON body) and every mocked success response is validated against those contracts, and every BFF response against `contracts/openapi.json`. Bumping a package version is enough to test against the new contract; error statuses are not typed by orval and are mocked explicitly.

`contracts:generate` exports the runtime registry to `contracts/openapi.json` and regenerates `contracts/bff.d.ts`. `contracts:check` fails when the contract or types are stale. Then run `npm run contracts:sync` in each associated web service and deliver contract changes together.

The type generator is pinned to `openapi-typescript@7.10.1` in `scripts/contracts.mjs` and runs through npm. For documentation-only changes, check links, accuracy in both languages and `git diff --check`; do not regenerate contracts without changing their source.

## CI/CD and Docker execution

The `contracts.yml` job uses Node.js 22, `actions/checkout@v7` and `actions/setup-node@v7`. It runs on pushes, pull requests and manual dispatch; it installs with `npm ci`, checks contracts and runs the associated tests.

`cicd.yml` calls `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v1.13.2`, with `cicd_version: v1.13.2` and `node_version: "22"`. Reusable steps and GitHub environments determine actual checks, publications and deployments.

The Dockerfile currently uses `node:20-alpine` for build and runtime; the image command is `["node", "dist/index.js"]`. That version is separate from the Node.js 22 contract job.

`security_test.sh` and `performance_test.sh` test the image named by `IMAGE_REF`: in CI, the image `release-dev` has just published, the same artifact that is then promoted to staging and prod. When `IMAGE_REF` is empty (local use), they first build `bff-elearning:local` from `development.Dockerfile`, which needs `NODE_AUTH_TOKEN` and `./.npmrc`.

`security_test.sh` runs the OWASP ZAP stack of `docker-compose-security.yml`: ZAP replays every operation of `/openapi.json` with a static admin JWT (`sub=1`, HS256, `JWT_SECRET=b"secret"`) and fills bodies, queries and path parameters from the contract examples. `init-test.sql` seeds users 1 (Admin) and 2 (User); the examples name the in-memory courses (`accueil-agents` is read and updated, `relation-usager` is the example of the DELETE route, and course creation uses the unused id `scan-course`). Keep examples and data in sync when adding a route.

Before running Docker, check service variables, build secrets and networks in the repository files. Green CI validates its jobs; it does not prove business-service availability in a remote environment.

## Troubleshooting

If the catalogue rejects the session, check BFF User. Progress disappearing after a restart or between instances is a consequence of the current in-memory design. Distinguish catalogue fixtures from the persistent data expected in a future implementation.

## Repository reference

- [src/app.ts](../../src/app.ts)
- [src/routes/Elearning/auth.ts](../../src/routes/Elearning/auth.ts)
- [src/routes/Elearning/elearning_helpers.ts](../../src/routes/Elearning/elearning_helpers.ts)
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
