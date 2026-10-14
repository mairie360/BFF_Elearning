# BFF_Elearning — Documentation technique

[Présentation du module](module.md) · [English](../en/technical.md) · [README](../../README.md)

## Architecture et traitement des requêtes

Serveur Express 5.2.1 écrit en TypeScript. Les schémas Zod et leur registre OpenAPI décrivent les objets échangés; les routeurs adaptent les services amont aux besoins des interfaces.

`src/app.ts` monte les routes `/elearning`. `auth.ts` lit le profil de l’appelant auprès de Core API `GET /api/v1/user/me/` (délai de 5 secondes) et son rôle dans la claim `role` du jeton vérifié, ou dans ce profil pour un jeton qui n’en a pas (MAIR-525 : aucun appel à un autre BFF). `elearning_upstream.ts` appelle l’API E-learning pour le compte de l’appelant (son Bearer est transmis) et `elearning_helpers.ts` met en forme ses réponses; `profile.ts` enregistre e-mail et téléphone via Core API. Les routes administrateur exigent un rôle `admin` parmi ceux de l’appelant.

## Données et persistance

Le BFF ne stocke rien : chaque réponse est construite à partir des services amont pendant la requête, les redémarrages et les réplicas sont donc transparents.

- **Catalogue, lecteur de formation, démarrage** : routes apprenant de l’API E-learning : le catalogue et une formation sont lus en un seul appel (`GET /api/v1/formations/catalog/`, les formations de l’appelant avec leurs modules et fichiers, MAIR-552) ; terminer un contenu lit son module (`GET /api/v1/formations/{id}/{module}/`) puis l’écrit. Une formation du BFF est une *formation* E-learning, un chapitre un *module*, un contenu une *pièce jointe* ; leurs identifiants numériques sont exposés en chaînes (`"4"`). Seules les formations auxquelles l’appelant est inscrit sont listées (l’inscription est faite par un administrateur dans l’API E-learning). Démarrer une formation n’écrit rien : l’API enregistre le démarrage quand le premier chapitre est terminé.
- **Validation d’un contenu** : `PATCH /api/v1/formations/{id}/{module}/`. La progression est suivie par chapitre en amont : valider un contenu valide tout son chapitre ; `completed: false` répond 501 (aucune opération amont n’annule une validation).
- **Profil** : l’identité vient de Core API `GET /api/v1/user/me/` ; `email` et `phone` sont enregistrés par Core API `PATCH /api/v1/user/me/`, puis le profil est relu. `address` et `city` ne sont stockés par aucun service : un corps qui les contient répond 501 et rien n’est écrit.
- **Pas encore disponible (501)** : la notation des formations et l’administration des formations (création, modification, suppression), sans opération dans l’API E-learning. Les routes valident tout de même leur entrée et le rôle administrateur d’abord.
- Non fournis par l’API E-learning, donc absents ou neutres : catégories, formateurs, durées, échéances, badges autres que celui du statut, `adminStats` et le nombre de notifications (`0`).

Les erreurs de l’API E-learning ne sont jamais relayées : 401 reste 401, une formation à laquelle l’appelant n’est pas inscrit (403) ou inconnue (404) donne 404, tout le reste (5xx, délai dépassé, corps inattendu) donne 502. Un `ELEARNING_API_URL` absent ou invalide donne 503.

Un redémarrage réinitialise les données en mémoire; plusieurs instances ne partagent pas cet état. La validation du contrat ou un succès HTTP ne prouve pas un enregistrement durable dans Elearning API.

## Installation et lancement local

Utiliser Node.js 24 pour reproduire les jobs de CI et npm avec le fichier de verrouillage versionné. Les versions des autres jobs et de Docker sont précisées plus bas.

Les dépendances privées `@mairie360/*` nécessitent un accès GitHub Packages. Configurer `NODE_AUTH_TOKEN` dans l’environnement avec un jeton autorisé à lire ces packages, conformément à `.npmrc`. Ne pas enregistrer la valeur dans Git.

```bash
npm ci
```

Créer `.env` à la racine. Exemple de configuration HTTP locale à adapter aux services démarrés:

```dotenv
PORT=4006
CORE_API_URL=localhost
CORE_API_PORT=3000
ELEARNING_API_URL=localhost
ELEARNING_API_PORT=3006
```

```bash
npm run start
```

`PORT` est facultatif et vaut `4006` par défaut.

Vérifier le processus puis consulter la documentation interactive:

```bash
curl --fail --silent --show-error http://localhost:4006/health
```

Interface Swagger: `http://localhost:4006/docs`. Spécification JSON: `/openapi.json`, avec l’alias `/swagger.json`. `/health` vérifie le processus; `/check_apis` est un diagnostic distinct des dépendances.

## Configuration

Les valeurs ci-dessous sont des exemples locaux ou des comportements explicitement indiqués, pas des identifiants de production.

| Variable ou priorité | Exemple / repli indiqué | Rôle |
| --- | --- | --- |
| `PORT` | 4006 (défaut) | Port d’écoute. |
| `TRUST_PROXY` | absent (`false`) | `trust proxy` d’Express : `true`, un nombre de sauts ou une liste d’adresses/sous-réseaux. |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 | Profil et rôles (`GET /api/v1/user/me/`), écriture du profil (`PATCH /api/v1/user/me/`) et diagnostic. **URL obligatoire.** |
| `ELEARNING_API_URL` / `ELEARNING_API_PORT` | localhost / 3006 | Formations, progression et diagnostic. **URL obligatoire.** |

Chaque `*_URL` accepte un hôte seul (`elearning-api`, complété par `*_PORT`) ou une URL complète (`http://elearning-api:3006`, `*_PORT` est alors ignoré). Chaque URL est lue à chaque appel via `baseUrl` de `@mairie360/bffs-lib`. Il n’y a aucun repli sur `localhost` : `src/index.ts` charge `.env` en premier (`import 'dotenv/config'`), puis refuse de démarrer (`assertConfigured`) si l’une des trois URL manque ou est invalide, en les nommant toutes ; une requête vers un service non configuré répond 503 `SERVICE_UNAVAILABLE` (`/check_apis` le signale `Unreachable`).

## Routes et contrat de données

Inventaire extrait de `contracts/openapi.json`. Les paramètres entre accolades sont remplacés par des identifiants réels. Les types détaillés, champs requis, réponses et exemples éventuels sont définis dans ce contrat; les statuts du tableau sont ceux déclarés, sans prétendre lister toutes les erreurs de transport ou de validation.

| Méthode | Chemin | Corps déclaré | Statuts déclarés |
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

## Session, permissions et erreurs

Les routes métier n’acceptent qu’un seul identifiant, l’en-tête `Authorization: Bearer <token>` (le proxy du web service y transforme le cookie `accessToken` ; les cookies et `x-session-token` sont ignorés). Sans lui, elles répondent 401 avant tout appel amont (`requireBearer` de `@mairie360/bffs-lib`) ; sinon le BFF vérifie le jeton (`requireSession`), et le même jeton, normalisé en `Bearer <token>`, est transmis à l’API E-learning et à Core API. L’`id` utilisateur des réponses est le `sub` du jeton vérifié. Le catalogue et le profil lisent le profil Core ; les routes de formation n’appellent que l’API E-learning, qui revérifie la session ; la notation n’appelle rien. Les réponses liées à une session portent `Cache-Control: no-store`, et `TRUST_PROXY` règle le `trust proxy` d’Express (absent : aucun proxy de confiance). Les refus de session produisent 401 ; une indisponibilité d’une API amont, ou un profil Core qui n’en est pas un, produit 502 ; un service amont dont l’URL n’est pas configurée produit 503. Les identifiants de chemin (`courseId`, `contentId`) et `chapterId` doivent être des entiers positifs (400 sinon). Les fonctions sans stockage amont répondent 501 (code `INTERNAL_ERROR`, message explicite) au lieu de simuler un enregistrement. Une erreur imprévue produit 500 sans exposer son message; `/check_apis` (`checkApis` de `@mairie360/bffs-lib`) sonde indépendamment l’opération `/health` de Core API et de l’API E-learning (clés `core_api`, `elearning_api`, schéma `CheckApisResponse`) et ne renvoie jamais de détail réseau. La gestion des formations est réservée au contexte administrateur selon les contrôles des routeurs.

Toutes les erreurs, y compris le 404 d'une route inconnue et le 400 d'un corps illisible, sont renvoyées dans l'enveloppe commune à tous les BFFs (`@mairie360/bffs-lib`) : `{ "error": { "code": "NOT_FOUND", "message": "Course not found.", "details": [{ "path": "params.courseId", "message": "..." }] } }`. `code` découle du statut (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `INTERNAL_ERROR`, `BAD_GATEWAY`) ; `details` est toujours un tableau (une entrée par champ invalide sur un 400). Un statut de Core autre que 401/403 sur la lecture du profil donne 502. Les échecs amont sont convertis une seule fois par `callUpstream`/`upstreamError` de la bibliothèque : seuls les 4xx déclarés par la route sont relayés (avec un message générique, jamais le corps amont), le reste donne 502. Les lectures amont idempotentes (Core `GET /api/v1/user/me/`, GET de l’API E-learning) sont rejouées une fois en l’absence de réponse ou sur 502, 503 ou 504 ; les écritures ne le sont jamais. Une requête invalide répond 400 `Validation failed` (`parseRequest`). Les en-têtes de sécurité viennent de la bibliothèque (`securityHeaders`, plus `apiOnlyHeaders()` partout sauf sous `/docs`).

## Synchronisation et vérifications

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

Les tests de `tests/elearning.upstream-mocks.test.ts` exécutent toute l'application avec les vrais clients axios contre des serveurs HTTP locaux simulant Core API et E-learning API (inscriptions, modules, pièces jointes et validation de module). Leurs contrats sont reconstruits depuis les paquets `@mairie360/core-api-openapi` et `@mairie360/elearning-api-openapi` installés (types orval, versions épinglées dans `package.json`): chaque requête sortante (chemin, paramètres, corps JSON) et chaque réponse de succès simulée est validée contre ces contrats, et chaque réponse du BFF contre `contracts/openapi.json`. Monter la version d'un paquet suffit à tester le nouveau contrat; les statuts d'erreur ne sont pas typés par orval et sont simulés explicitement.

`contracts:generate` exporte le registre runtime dans `contracts/openapi.json` et régénère `contracts/bff.d.ts`. `contracts:check` échoue si le contrat ou les types sont périmés. Exécuter ensuite `npm run contracts:sync` dans chaque web service associé et livrer les modifications de contrat ensemble.

Le générateur de types est fixé à `openapi-typescript@7.10.1` dans `scripts/contracts.mjs` et s’exécute via npm. Pour une modification uniquement documentaire, vérifier les liens, l’exactitude des deux langues et `git diff --check`; ne pas régénérer les contrats sans modification de leur source.

## CI/CD et exécution Docker

Le job `contracts.yml` utilise Node.js 24, `actions/checkout@v7` et `actions/setup-node@v7`. Il s’exécute sur push, pull request et lancement manuel; il installe avec `npm ci`, contrôle les contrats et lance les tests dédiés.

`cicd.yml` appelle `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v3.2.0`, avec `cicd_version: v3.2.0` et `node_version: "24"`. Les étapes réutilisables et les environnements GitHub déterminent les contrôles, publications et déploiements effectifs.

`Dockerfile` et `development.Dockerfile` utilisent `node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1` (épinglée par digest, le même Node.js 24 que les jobs de CI) ; la commande de l’image est `["node", "dist/index.js"]`.

`security_test.sh` et `performance_test.sh` testent l’image désignée par `IMAGE_REF`: en CI, l’image que `release-dev` vient de publier, soit l’artefact ensuite promu en staging puis en prod. Quand `IMAGE_REF` est vide (usage local), ils construisent d’abord `bff-elearning:local` depuis `development.Dockerfile`, ce qui demande `NODE_AUTH_TOKEN` et `./.npmrc`.

`security_test.sh` lance la stack OWASP ZAP de `docker-compose-security.yml`: ZAP rejoue chaque opération de `/openapi.json` avec un JWT admin statique (`sub=1`, HS256, `JWT_SECRET=b"secret"`) et remplit corps, requêtes et paramètres de chemin avec les exemples du contrat. `init-test.sql` crée les utilisateurs 1 (Admin) et 2 (User) et la formation E-learning des exemples du contrat (formation `4`, module `11`, pièce jointe `27`), avec les deux utilisateurs inscrits. Garder exemples et données alignés en ajoutant une route.

La stack ZAP porte la gate de couverture OpenAPI de `mairie360/CICD` (`tests/zap/zap_hooks.py`), extraite dans `cicd-repo/` par le job CI et clonée au même endroit par `security_test.sh` / `performance_test.sh` au `cicd_version` épinglé (`CICD_VERSION` le remplace). Après le scan, le hook échoue si une opération du contrat n’a jamais été atteinte, ou si une opération qui exige `bearerAuth` n’a reçu que des 401/403. Les opérations publiques (`/health`, `/check_apis`) déclarent `security: []` dans leur `registerPath` ; le déclarer sur toute nouvelle route publique.

La stack k6 porte l’autre moitié de la gate (`tests/k6/coverage.js`) : `load-test.js` contient un handler par opération de `contracts/openapi.json`, donc k6 s’arrête à l’init s’il en manque un et échoue sur le seuil `operations_uncovered` si un handler n’envoie pas sa requête. **Ajouter une route implique d’ajouter son handler dans `load-test.js`.** Deux scénarios partagent les handlers : `crud` (2 VUs) appelle chaque handler une fois par itération, écritures comprises (les réponses 501 de la notation, de l’administration des formations et de l’adresse sont déclarées comme statuts attendus) ; `reads` (jusqu’à 20 VUs) ne rejoue que les handlers GET. Chaque opération a un seuil `p(95)` fixé par sa famille : 50 ms pour `/health`, 300 ms pour `/check_apis`, 600 ms pour les lectures (profil Core en parallèle des appels en éventail à l’API E-learning, au plus 5 formations × 5 modules à la fois), 800 ms pour les écritures ; `http_req_failed` doit rester sous 1 %.

Avant un lancement Docker, vérifier les variables de service, les secrets de build et les réseaux dans les fichiers du dépôt. Une CI verte valide ses jobs; elle ne prouve pas la disponibilité des services métier dans un environnement distant.

## Journaux

Chaque journal est un objet JSON par ligne sur la sortie standard (MAIR-531, `createLogger` de `@mairie360/bffs-lib`, `src/logger.ts`), au format des APIs avec `LOG_FORMAT=json` : `timestamp`, `level`, `target` (`bff-elearning`), `message`, puis les champs.

- Une ligne `request completed` par requête (`requestLogger`, premier middleware de `src/app.ts`) : `request_id`, `method`, `path` (la route reconnue, par exemple `/users/:userId` ; jamais la query string), `status`, `duration_ms`. Les 5xx sont écrites en `ERROR` ; `/health` n'est pas journalisé.
- `request_id` reprend l'en-tête `X-Request-Id` quand l'appelant en envoie un bien formé, sinon il est généré ; il est renvoyé dans `X-Request-Id` et répété sur chaque ligne de la requête (`request failed`, `upstream unreachable`...), une seule recherche les retrouve toutes.
- `request failed` (5xx) et `upstream unreachable` (`/check_apis`) portent `error` = `describeError(error)` : type, statut, méthode et chemin de l'appel amont, message masqué. Jamais d'en-tête, de jeton, de corps ni de donnée personnelle (MAIR-290).
- `LOG_LEVEL` (`debug`, `info`, `warn`, `error` ; `info` par défaut) filtre les lignes.
- `LOG_FORMAT` (`json` ou `text`) : non défini, les lignes sont du texte coloré quand stdout est un terminal (`npm run start`), du JSON sinon (conteneurs, tests). `NO_COLOR` / `FORCE_COLOR` règlent les couleurs (MAIR-555).

## Diagnostic

Si le catalogue refuse la session, vérifier Core API. Un catalogue vide signifie que l’appelant n’est inscrit à aucune formation de l’API E-learning (un administrateur y inscrit les utilisateurs). Un 503 sur toutes les routes de formation signale un `ELEARNING_API_URL` absent ; un 502 signale le plus souvent une URL erronée ou une API arrêtée : `/check_apis` indique quel service est injoignable.

## Repères dans le dépôt

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

Compléments historiques: [CONTRACT.md](../../CONTRACT.md). Les besoins proposés doivent rester distincts du comportement effectivement implémenté.
