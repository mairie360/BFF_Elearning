# BFF_Elearning

Serve the training catalogue, progress and learning profile for staff. The BFF exposes a shared contract for the catalogue, content player and course administration features.

Servir le catalogue de formations, la progression et le profil d’apprentissage des agents. Le BFF expose un contrat commun au catalogue, au lecteur de contenus et aux fonctions d’administration des formations.

## Documentation

| Language / Langue | Module | Technical / Technique |
| --- | --- | --- |
| English | [Module overview](docs/en/module.md) | [Technical documentation](docs/en/technical.md) |
| Français | [Présentation du module](docs/fr/module.md) | [Documentation technique](docs/fr/technical.md) |

The sections below are a quick reference in English; the French version of the setup, the routes and the checks is in [docs/fr/technical.md](docs/fr/technical.md).

Les sections ci-dessous sont un aide-mémoire en anglais ; leur version française (installation, routes, vérifications) est dans [docs/fr/technical.md](docs/fr/technical.md).

## Quick start

Node.js 24 and read access to the GitHub Packages of `mairie360` (`NODE_AUTH_TOKEN`, `read:packages`) are needed for the private `@mairie360/*` packages.

```bash
export NODE_AUTH_TOKEN=<token with read:packages>
npm ci
# create .env with the variables below
npm run start
```

The BFF listens on port `4006`: `GET /health` checks the process, `GET /check_apis` its upstreams, `/docs` serves Swagger UI and `/openapi.json` the contract.

Configuration (local example, every upstream is required: there is no `localhost` default):

```dotenv
PORT=4006
CORE_API_URL=localhost
CORE_API_PORT=3000
ELEARNING_API_URL=localhost
ELEARNING_API_PORT=3006
# Core's Ed25519 public key (PEM, `\n`-escaped line breaks accepted), MAIR-680: the BFF verifies the session
# tokens Core signs with it and refuses to start without it. Paste the public key of the Core you run against.
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n<base64 of Core's public key>\n-----END PUBLIC KEY-----"
# JWT_SECRET is ignored: bffs-lib >= 3 refuses HS256 tokens (MAIR-680).
```

## Routes

Generated contract: [`contracts/openapi.json`](contracts/openapi.json) (16 operations), published on every release as `@mairie360/bff-elearning-openapi` for the front.

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/health` | Check the health of the BFF |
| `GET` | `/check_apis` | Checks that Core API and E-learning API answer their /health probe |
| `POST` | `/elearning/admin/courses` | Creates a course |
| `PATCH` | `/elearning/admin/courses/{courseId}` | Replaces a course |
| `DELETE` | `/elearning/admin/courses/{courseId}` | Deletes a course |
| `POST` | `/elearning/admin/courses/{courseId}/reminders` | Reminds the late agents of a mandatory course |
| `GET` | `/elearning/admin/agents` | Lists the agents an administrator can enrol |
| `GET` | `/elearning/admin/courses/{courseId}/learners` | Lists the agents enrolled in a course, with their progress |
| `POST` | `/elearning/admin/courses/{courseId}/learners` | Enrols agents in a course |
| `DELETE` | `/elearning/admin/courses/{courseId}/learners/{userId}` | Unenrols an agent from a course |
| `GET` | `/elearning/admin/stats` | E-learning indicators of the instance |
| `GET` | `/elearning/catalog` | Loads the E-learning catalogue |
| `GET` | `/elearning/certificates` | Attestations of the courses the caller completed during a year (PDF) |
| `GET` | `/elearning/courses/{courseId}/certificate` | Attestation of a course the caller completed (PDF) |
| `GET` | `/elearning/courses/{courseId}/chapters/{chapterId}/contents/{contentId}/file` | Signed URL of a stored file of a course |
| `GET` | `/elearning/training-time` | Training time of the caller during a year |
| `POST` | `/elearning/courses/{courseId}/contents/{contentId}/complete` | Marks a content as completed |
| `GET` | `/elearning/profile` | Loads the E-learning profile |
| `POST` | `/elearning/courses/{courseId}/rating` | Rates a course the caller completed |
| `POST` | `/elearning/courses/{courseId}/start` | Starts or resumes a course |

## Upstream contracts

The BFF calls its upstreams through these published packages (never through a local checkout); bumping one of them is how an upstream change reaches this BFF:

- `@mairie360/core-api-openapi`
- `@mairie360/elearning-api-openapi`

## Commands

```bash
npm run lint                 # eslint
npm test                     # jest: unit, route and upstream-mock tests
npm run contracts:generate   # regenerate contracts/ after a route, schema or status change
npm run contracts:check      # CI gate: fails when contracts/ is stale
```

Docker stacks, one at a time (they need `NODE_AUTH_TOKEN` and pull access to `ghcr.io/mairie360`):

- `./integration_test.sh`: newman collection against the stack of `docker-compose-integration.yml`
- `./security_test.sh`: OWASP ZAP scan of `/openapi.json` (`docker-compose-security.yml`)
- `./performance_test.sh`: k6 load test (`docker-compose-performance.yml`)
- `./gdpr_marker_test.sh`: GDPR marker check (`docker-compose-gdpr-marker.yml`)
- `./gdpr_simulation_test.sh`: GDPR erasure simulation (`docker-compose-gdpr-simulation.yml`)

CI is the reusable `mairie360/CICD` workflow called by `.github/workflows/cicd.yml`.

## Contracts and background / Contrats et compléments

- [CONTRACT.md](CONTRACT.md)
- [contracts/openapi.json](contracts/openapi.json)
