# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`BFF_Elearning` is the Backend-for-Frontend for the Mairie360 E-learning module. It serves ready-to-render payloads (catalogue, course player, profile, course administration) to the E-learning web service, shaping data so the frontend needs little client-side logic. It is one of several sibling BFFs in the `mairie360` org; its associated web service is **Elearning_Web_Service**.

Express 5 + TypeScript, run directly with `ts-node` (no dev watcher configured in npm scripts; the dev Docker image uses `ts-node-dev`).

Human-facing docs live in `README.md`, `CONTRACT.md`, and `docs/{en,fr}/{module,technical}.md` (bilingual). `docs/**/technical.md` covers local setup, routes, data model and CI in prose — read it alongside this file for onboarding.

## Commands

```bash
npm ci                       # install (needs NODE_AUTH_TOKEN, see below)
npm run start                # ts-node src/index.ts — requires PORT env var or it exits
npm run build                # tsc -> dist/
npm test                     # jest (ts-jest); CI runs: npm test -- --runInBand
npm test -- tests/elearning.test.ts          # single file
npm test -- -t "returns the catalog payload" # single test by name
npm run lint                 # eslint . --ext .ts  (flat config: eslint.config.cjs)
npm run lint:fix
npm run contracts:generate   # regenerate contracts/openapi.json + contracts/bff.d.ts from the code
npm run contracts:check      # fails if the committed contract or types are stale (runs in CI)
```

`.eslintrc.js` is legacy and unused — ESLint reads `eslint.config.cjs`. `@typescript-eslint/no-explicit-any` is an **error**, but the type-aware config block only targets `src/**/*.ts` (tests, `scripts/export-swagger.ts`, `jest.config.ts` are excluded). Unused vars are a warning unless prefixed `_`.

## Private dependencies

`@mairie360/*` packages come from GitHub Packages. `.npmrc` expects `NODE_AUTH_TOKEN` in the environment (a token with read access to those packages). Never commit the value. Without it `npm ci` fails.

## Environment variables

`dotenv` loads `.env` from the repo root. `PORT`, `USER_BFF_URL`, `CORE_API_URL` and `ELEARNING_API_URL` have **no default** — `src/index.ts` exits if one is unset. Local example: `PORT=4006`, `USER_BFF_URL=http://localhost:4000`, `CORE_API_URL` / `CORE_API_PORT`, `ELEARNING_API_URL` / `ELEARNING_API_PORT`. `src/clients/upstream.ts` builds every base URL (bare host + `*_PORT`, or full URL whose port wins), reads it on each request, and answers 502 when it is missing (there is no `localhost` fallback).

## Architecture

### The OpenAPI contract is generated from the code, and is the deliverable

Single source of truth chain:

1. `src/openapi-registry.ts` — all exchanged objects defined as Zod schemas with `.openapi()` metadata, registered on a shared `OpenAPIRegistry`.
2. Each route module (`src/routes/**`) calls `registry.registerPath(...)` at import time to describe its endpoint, alongside defining the Express `Router`.
3. `src/openapi.ts` imports every route module purely for that registration side effect, then builds `openApiDocument` via `OpenApiGeneratorV31`.
4. `src/app.ts` serves that document at `/docs` (Swagger UI), `/openapi.json`, `/swagger.json`, and mounts the routers.
5. `scripts/export-swagger.ts` writes the document to `contracts/openapi.json` (and root `openapi.json`, consumed by the publish workflow).
6. `scripts/contracts.mjs` runs `openapi-typescript@7.10.1` (pinned, invoked via `npm exec`) to produce `contracts/bff.d.ts`.

`contracts/openapi.json` and `contracts/bff.d.ts` are committed and checked in CI (`contracts.yml`). **After changing any route or schema**, run `npm run contracts:generate` and commit the regenerated files, or `contracts:check` fails. Then run `npm run contracts:sync` inside the Elearning web service repo and ship both branches in the same delivery. (Note: there is no `contracts:sync` npm script in *this* repo's `package.json`, and `scripts/contracts.mjs` has `source = null`, so its `--sync` path is inert — `contracts:generate` is the only working path here.)

If a route registers a path that no router serves (or vice versa), Swagger and the real API drift silently — keep `registerPath` and the `router` handler in the same file aligned.

### Request flow

`src/app.ts` mounts: `/health`, `/check_apis`, `/elearning/catalog`, `/elearning/profile`, `/elearning/admin/courses` (admin CRUD), and three routers (`content_complete`, `rating`, `start`) all on `/elearning/courses` that disambiguate via their own sub-paths (`.../{courseId}/contents/{contentId}/complete`, `.../{courseId}/rating`, `.../{courseId}/start`). `contracts/openapi.json` / `CONTRACT.md` list the full route table.

Every business route:
1. Validates params/query/body with `schema.safeParse(...)` → on failure `throw validationError('<body|params|query>', error.issues)` (HTTP 400, code `BAD_REQUEST`, one `details` entry per issue with a `path` like `body.rating`).
2. Calls `getAuthenticatedUser(req)` (`src/routes/Elearning/auth.ts`): requires `Authorization: Bearer <token>`, calls `GET {USER_BFF_URL}/me` with a 5s timeout, maps the response to `CurrentUser`. Missing bearer or BFF User 401/403 → `HttpError(401)`; any other BFF User status, a timeout or a network failure → `HttpError(502)` (the upstream body is never relayed). The user `id` is the JWT `sub` claim, **base64url-decoded but not signature-verified** (trust is delegated to BFF User); it falls back to the user's name if the token has no usable `sub`. Missing `role` defaults to `'Guest'`, missing name to `'Utilisateur'`.
3. Admin routes (`admin_courses.ts`) then check `user.isAdmin` (derived from a case-insensitive `role === 'admin'` in the `/me` payload) → 403 `FORBIDDEN` otherwise.
4. Calls the upstream services on behalf of the caller (`callerAuthorization(req)` forwards the bearer): `elearning_upstream.ts` for the E-learning API, `profile.ts` for Core API `patchMe`. `elearning_helpers.ts` holds the pure shaping functions.
5. Errors are thrown (`HttpError` from `@mairie360/bffs-lib`; Express 5 forwards async rejections) and answered by `notFoundHandler` / `errorHandler()` at the end of `src/app.ts` in the envelope shared by every BFF, `{ error: { code, message, details } }` (schema `ErrorResponse`, registered once in `openapi-registry.ts` with `ErrorResponseSchema.clone()`). The status is kept; `code` derives from it (`NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `BAD_GATEWAY`...); anything unexpected becomes 500 `INTERNAL_ERROR` with a generic message (the real error is only logged). Every authenticated route documents 401/502 through `sessionErrorResponses` (`openapi-registry.ts`); a `/me` 2xx without a `user` object is a 502, never a Guest session.

### No state in the BFF — data comes from the upstream services

The in-memory mock (hard-coded catalogue, per-user Maps, admin CRUD on an array) was removed in MAIR-401. Mapping:

- E-learning API *formation* = BFF course, *module* = chapter, *attachment* = content. Upstream numeric ids are exposed as decimal strings and validated (`/^[1-9]\d{0,14}$/`, 400 otherwise).
- `GET /elearning/catalog`: `getMyFormations` + `getMyFormationById` per formation + `getModule` per module (fan-out with `Promise.all`; only the caller's enrolments are listed). `start` is the same read for one course, it writes nothing.
- `POST .../complete`: `getModule` (checks the content belongs to the chapter) then `completeModule`, then the course is read again. Progress is per module upstream, so one content completes its whole chapter; `completed: false` → 501.
- E-learning errors: 401 → 401, 403 (not enrolled) / 404 → 404 on course routes, anything else → 502; text/plain bodies are never relayed.
- `PATCH /elearning/profile`: `email`/`phone` → Core `patchMe` (400/401/409 kept, else 502), then `/me` is read again; `address`/`city` → 501 before any write.
- **501 (no upstream operation):** ratings, admin course create/update/delete (after validation + admin check), un-completing a chapter, address/city. `bffs-lib` has no `NOT_IMPLEMENTED` code, so the body code is `INTERNAL_ERROR` with an explicit message.
- `getMyFormations` is typed by the published package as `AdminFormation` (upstream schema-name clash), but the API also returns `status`; `toCourse` reads it when present.

`/check_apis` is only a connectivity diagnostic (probes Core and E-learning `/health` independently through `configuredBaseUrl`, returns 502 with the per-API status if either fails or is not configured, never the network error); `/health` just reports the BFF process is up.

## Tests

Jest + `ts-jest` + `supertest`, files match `tests/**/*.test.ts`. `tests/clients.test.ts` covers the upstream URL configuration. Business behaviour is tested only through the contract-driven upstream mocks below.

### Tests with contract-driven upstream mocks

`tests/elearning.upstream-mocks.test.ts` imports the **whole app** with the **real** `auth.ts`/axios and serves BFF User (`/me`), Core API (`patchMe`, `/health`) and E-learning API (enrolments, modules, attachments, `completeModule`, `/health`) from local HTTP servers (`tests/support/contract-mock-server.ts`). Their contracts are rebuilt at test time from the **installed** `@mairie360/bff-user-openapi` (devDependency, aligned with the `bff-user` image of the test stacks), `@mairie360/core-api-openapi` and `@mairie360/elearning-api-openapi` packages (`tests/support/orval-contract.ts` parses the orval `endpoints/*.ts` + `model/*.ts` with the TypeScript compiler API), so bumping a package is enough to test a new contract. The mock rejects paths, methods, params and bodies absent from the contract and validates mocked success responses; orval does not type errors, so mocked error replies need `outOfContract: true`. Every BFF response is checked against `contracts/openapi.json` (status documented + schema), so an undocumented status fails the test. `tests/upstream-contracts.test.ts` pins package versions and the consumed operations.

- `USER_BFF_URL` and `CORE_API_*`/`ELEARNING_API_*` are read per request, so tests set them in `beforeEach` (no module reload).
- E-learning bodies are built with `formation()` / `learnerModule()` / `attachment()` from `tests/support/user-fixtures.ts` (typed by the package models).
- `openapi-contract.ts`, `contract-mock-server.ts` and `orval-contract.ts` are shared verbatim with `BFF_user`, `BFF_Calendar` and `BFF_Dashboard`; keep the copies identical.

## CI / Docker

- `contracts.yml`: Node 22, `npm ci`, `npm run contracts:check`, `npm test -- --runInBand`.
- `cicd.yml`: delegates to the reusable `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v3.0.0` (Node 22).
- Contract tooling targets **Node 22**; the production `Dockerfile` still builds/runs on `node:20-alpine` with `CMD ["node", "dist/index.js"]` and a 180 MB heap cap.
- `docker-compose.yml` is the local dev stack (redis + `elearning-api` + this BFF via `development.Dockerfile`, with `develop.watch` sync on `./src`). GitHub Packages secrets are passed as build secrets (`npmrc`, `node_auth_token`).

### ZAP OpenAPI coverage gate

`security_test.sh` / `performance_test.sh` clone `mairie360/CICD` into `cicd-repo/` (gitignored) at
the pinned `cicd_version` (`CICD_VERSION=<branch>` overrides it). ZAP runs its `zap_hooks.py` with
`--hook`: every operation of the served spec must be reached, and non-public ones with a
non-401/403 answer. The spec requires `bearerAuth` at the top level (`openapi.ts`); `/health` and
`/check_apis` set `security: []` in `registerPath`.

k6 mounts `coverage.js` and `contracts/openapi.json`: `load-test.js` has **one handler per
operation**, and a new route without a handler makes k6 abort at init. Two scenarios: `crud` (2 VUs)
runs every handler through `coverage.run()` and carries the gate; `reads` (ramp to 20 VUs) replays
the GET handlers only, so GET handlers must not read `state`. Routes answering 501 (ratings, admin
courses, address/city) declare it as an expected status (`http.expectedStatuses(501)`), so they do not
count in `http_req_failed`. The learner handlers use formation `4` / module `11` / attachment `27`, seeded
by `init-test.sql` with users 1 and 2 enrolled. Every operation gets a `p(95)` threshold from its family
(`budgetOf`).

## Pull request reviewers

Every PR requests a review from the whole team, minus its author: `CarolinHugo`, `LAURETbenjamin`, `MathTek` and `Quentintnrl` (`gh pr create … --reviewer CarolinHugo,LAURETbenjamin,MathTek`). `.github/CODEOWNERS` makes GitHub request them automatically as well.
