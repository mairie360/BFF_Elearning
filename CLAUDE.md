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

`dotenv` loads `.env` from the repo root. `PORT` has **no default** — `src/index.ts` exits if it is unset. Local example: `PORT=4006`, `USER_BFF_URL=http://localhost:4000`, `CORE_API_URL` / `CORE_API_PORT`, `ELEARNING_API_URL` / `ELEARNING_API_PORT`. `USER_BFF_URL` defaults to `http://localhost:4000` in `auth.ts` if missing; the others have partial or no fallbacks.

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
1. Validates params/query/body with `schema.safeParse(...)` → on failure `sendValidationError(res, error.issues)` (HTTP 400, code `BAD_REQUEST`).
2. Calls `getAuthenticatedUser(req)` (`src/routes/Elearning/auth.ts`): requires `Authorization: Bearer <token>`, calls `GET {USER_BFF_URL}/me` with a 5s timeout, maps the response to `CurrentUser`. Rejection → `ElearningRouteError(401, 'UNAUTHORIZED')`; user service unreachable → `ElearningRouteError(502, 'USER_SERVICE_UNAVAILABLE')`. The user `id` is the JWT `sub` claim, **base64url-decoded but not signature-verified** (trust is delegated to BFF User); it falls back to the user's name if the token has no usable `sub`. Missing `role` defaults to `'Guest'`, missing name to `'Utilisateur'`.
3. Admin routes (`admin_courses.ts`) then check `user.isAdmin` (derived from a case-insensitive `role === 'admin'` in the `/me` payload) → 403 `FORBIDDEN` otherwise.
4. Delegates to a pure function in `elearning_helpers.ts`, returns its result as JSON.
5. Wraps the try/catch in `handleRouteError(res, error)` → `ElearningRouteError` becomes `{ code, message, details }` at its status; anything else becomes 500 `INTERNAL_SERVER_ERROR`.

### Data is in-memory — there is no database

`src/routes/Elearning/elearning_helpers.ts` holds everything:
- `courseTemplates` — the seed catalogue (three hard-coded courses with nested chapters/contents).
- `coursesByUserId: Map<string, BffCourse[]>` — each user gets a deep clone of the templates on first access; progress and rating mutations happen on that per-user copy.
- `profileOverridesByUserId: Map<string, ...>` — profile edits are stored as overrides merged onto the `/me` user, not persisted upstream.
- Admin create/update/delete mutate both `courseTemplates` and every existing per-user array.

Restarting the process resets all of it; multiple instances do not share state. `src/clients/elearningClient.ts` (`@mairie360/elearning-api-openapi`) and `src/clients/coreClient.ts` exist but are **not** wired into the business routes — persistence to the upstream E-learning API is future work, not current behavior. `/check_apis` is only a connectivity diagnostic (returns 502 if Core or E-learning `/health` fails); `/health` just reports the BFF process is up.

Values returned to the frontend are always `clone(...)`d before leaving a helper so callers cannot mutate the in-memory store.

## Tests

Jest + `ts-jest` + `supertest`, files match `tests/**/*.test.ts`. `tests/elearning.test.ts` `jest.mock`s `../src/routes/Elearning/auth` to bypass the real `/me` call — follow that pattern when testing authenticated routes. Assertions lean on exact payload shapes (e.g. `adminStats` totals), so changing the seed catalogue or the shaping logic in `elearning_helpers.ts` will require updating expected values.

## CI / Docker

- `contracts.yml`: Node 22, `npm ci`, `npm run contracts:check`, `npm test -- --runInBand`.
- `cicd.yml`: delegates to the reusable `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v1.13.2` (Node 22).
- Contract tooling targets **Node 22**; the production `Dockerfile` still builds/runs on `node:20-alpine` with `CMD ["node", "dist/index.js"]` and a 180 MB heap cap.
- `docker-compose.yml` is the local dev stack (redis + `elearning-api` + this BFF via `development.Dockerfile`, with `develop.watch` sync on `./src`). GitHub Packages secrets are passed as build secrets (`npmrc`, `node_auth_token`).
