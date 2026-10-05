# BFF_Elearning — Documentation technique

[Présentation du module](module.md) · [English](../en/technical.md) · [README](../../README.md)

## Architecture et traitement des requêtes

Serveur Express 5.2.1 écrit en TypeScript. Les schémas Zod et leur registre OpenAPI décrivent les objets échangés; les routeurs adaptent les services amont aux besoins des interfaces.

`src/app.ts` monte les routes `/elearning`. `auth.ts` appelle BFF User `/me` avec un délai de 5 secondes. `elearning_upstream.ts` appelle l’API E-learning pour le compte de l’appelant (son Bearer est transmis) et `elearning_helpers.ts` met en forme ses réponses; `profile.ts` enregistre e-mail et téléphone via Core API. Les routes administrateur utilisent le rôle du contexte authentifié.

## Données et persistance

Le BFF ne stocke rien : chaque réponse est construite à partir des services amont pendant la requête, les redémarrages et les réplicas sont donc transparents.

- **Catalogue, lecteur de formation, démarrage** : routes apprenant de l’API E-learning (`GET /api/v1/formations/`, `GET /api/v1/formations/{id}/`, `GET /api/v1/formations/{id}/{module}/`). Une formation du BFF est une *formation* E-learning, un chapitre un *module*, un contenu une *pièce jointe* ; leurs identifiants numériques sont exposés en chaînes (`"4"`). Seules les formations auxquelles l’appelant est inscrit sont listées (l’inscription est faite par un administrateur dans l’API E-learning). Démarrer une formation n’écrit rien : l’API enregistre le démarrage quand le premier chapitre est terminé.
- **Validation d’un contenu** : `PATCH /api/v1/formations/{id}/{module}/`. La progression est suivie par chapitre en amont : valider un contenu valide tout son chapitre ; `completed: false` répond 501 (aucune opération amont n’annule une validation).
- **Profil** : l’identité vient de BFF User `/me` ; `email` et `phone` sont enregistrés par Core API `PATCH /api/v1/user/me/`, puis `/me` est relu. `address` et `city` ne sont stockés par aucun service : un corps qui les contient répond 501 et rien n’est écrit.
- **Pas encore disponible (501)** : la notation des formations et l’administration des formations (création, modification, suppression), sans opération dans l’API E-learning. Les routes valident tout de même leur entrée et le rôle administrateur d’abord.
- Non fournis par l’API E-learning, donc absents ou neutres : catégories, formateurs, durées, échéances, badges autres que celui du statut, `adminStats` et le nombre de notifications (`0`).

Les erreurs de l’API E-learning ne sont jamais relayées : 401 reste 401, une formation à laquelle l’appelant n’est pas inscrit (403) ou inconnue (404) donne 404, tout le reste (5xx, délai dépassé, corps inattendu, configuration absente) donne 502.

Un redémarrage réinitialise les données en mémoire; plusieurs instances ne partagent pas cet état. La validation du contrat ou un succès HTTP ne prouve pas un enregistrement durable dans Elearning API.

## Installation et lancement local

Utiliser Node.js 22 pour reproduire le job de contrats et npm avec le fichier de verrouillage versionné. Les versions des autres jobs et de Docker sont précisées plus bas.

Les dépendances privées `@mairie360/*` nécessitent un accès GitHub Packages. Configurer `NODE_AUTH_TOKEN` dans l’environnement avec un jeton autorisé à lire ces packages, conformément à `.npmrc`. Ne pas enregistrer la valeur dans Git.

```bash
npm ci
```

Créer `.env` à la racine. Exemple de configuration HTTP locale à adapter aux services démarrés:

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

`PORT` est obligatoire pour ce BFF; cet exemple utilise `4006`.

Vérifier le processus puis consulter la documentation interactive:

```bash
curl --fail --silent --show-error http://localhost:4006/health
```

Interface Swagger: `http://localhost:4006/docs`. Spécification JSON: `/openapi.json`, avec l’alias `/swagger.json`. `/health` vérifie le processus; `/check_apis` est un diagnostic distinct des dépendances.

## Configuration

Les valeurs ci-dessous sont des exemples locaux ou des comportements explicitement indiqués, pas des identifiants de production.

| Variable ou priorité | Exemple / repli indiqué | Rôle |
| --- | --- | --- |
| `PORT` | 4006 | Port de cet exemple local. |
| `USER_BFF_URL` | http://localhost:4000 | Identité de l’utilisateur via `/me`. **Obligatoire.** |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 | Écriture du profil (`PATCH /api/v1/user/me/`) et diagnostic. **URL obligatoire.** |
| `ELEARNING_API_URL` / `ELEARNING_API_PORT` | localhost / 3006 | Formations, progression et diagnostic. **URL obligatoire.** |

Chaque `*_URL` accepte un hôte seul (`elearning-api`, complété par `*_PORT`) ou une URL complète (`http://elearning-api:3006`, `*_PORT` est alors ignoré). Il n’y a aucun repli sur `localhost` : `src/index.ts` s’arrête au démarrage si l’une des trois URL manque, et une requête vers un service non configuré répond 502 (`/check_apis` le signale `Unreachable`).

## Routes et contrat de données

Inventaire extrait de `contracts/openapi.json`. Les paramètres entre accolades sont remplacés par des identifiants réels. Les types détaillés, champs requis, réponses et exemples éventuels sont définis dans ce contrat; les statuts du tableau sont ceux déclarés, sans prétendre lister toutes les erreurs de transport ou de validation.

| Méthode | Chemin | Corps déclaré | Statuts déclarés |
| --- | --- | --- | --- |
| GET | `/health` | — | 200 |
| GET | `/check_apis` | — | 200, 502 |
| POST | `/elearning/admin/courses` | application/json | 201, 400, 401, 403, 500, 501, 502 |
| PATCH | `/elearning/admin/courses/{courseId}` | application/json | 200, 400, 401, 403, 500, 501, 502 |
| DELETE | `/elearning/admin/courses/{courseId}` | — | 200, 401, 403, 500, 501, 502 |
| GET | `/elearning/catalog` | — | 200, 400, 401, 500, 502 |
| POST | `/elearning/courses/{courseId}/contents/{contentId}/complete` | application/json | 200, 400, 401, 404, 500, 501, 502 |
| GET | `/elearning/profile` | — | 200, 401, 500, 502 |
| PATCH | `/elearning/profile` | application/json | 200, 400, 401, 409, 500, 501, 502 |
| POST | `/elearning/courses/{courseId}/rating` | application/json | 200, 400, 401, 500, 501, 502 |
| POST | `/elearning/courses/{courseId}/start` | application/json | 200, 400, 401, 404, 500, 502 |

## Session, permissions et erreurs

Les routes métier n’acceptent qu’un seul identifiant, l’en-tête `Authorization: Bearer <token>` (le proxy du web service y transforme le cookie `accessToken` ; les cookies et `x-session-token` sont ignorés). Sans lui, elles répondent 401 avant tout appel amont (`requireBearer` de `@mairie360/bffs-lib`) ; sinon elles résolvent la session via BFF User, et le même jeton, normalisé en `Bearer <token>`, est transmis à l’API E-learning et à Core API. L’`id` utilisateur des réponses est celui que renvoie BFF User (le nom de l’utilisateur s’il n’en renvoie pas), jamais une claim lue dans le jeton non vérifié. Les réponses liées à une session portent `Cache-Control: no-store`, et `TRUST_PROXY` règle le `trust proxy` d’Express (absent : aucun proxy de confiance). Les refus de session produisent 401 ; une indisponibilité de BFF User ou d’une API amont, ou une réponse `/me` sans objet `user`, produit 502. Les identifiants de chemin (`courseId`, `contentId`) et `chapterId` doivent être des entiers positifs (400 sinon). Les fonctions sans stockage amont répondent 501 (code `INTERNAL_ERROR`, message explicite) au lieu de simuler un enregistrement. Une erreur imprévue produit 500 sans exposer son message; `/check_apis` sonde Core et E-learning indépendamment et ne renvoie jamais de détail réseau. La gestion des formations est réservée au contexte administrateur selon les contrôles des routeurs.

Toutes les erreurs, y compris le 404 d'une route inconnue et le 400 d'un corps illisible, sont renvoyées dans l'enveloppe commune à tous les BFFs (`@mairie360/bffs-lib`) : `{ "error": { "code": "NOT_FOUND", "message": "Course not found.", "details": [{ "path": "params.courseId", "message": "..." }] } }`. `code` découle du statut (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `INTERNAL_ERROR`, `BAD_GATEWAY`) ; `details` est toujours un tableau (une entrée par champ invalide sur un 400). Un statut de BFF User autre que 401/403 donne 502.

## Synchronisation et vérifications

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

Les tests de `tests/elearning.upstream-mocks.test.ts` exécutent toute l'application avec les vrais clients axios contre des serveurs HTTP locaux simulant BFF User, Core API et E-learning API (inscriptions, modules, pièces jointes et validation de module). Leurs contrats sont reconstruits depuis les paquets `@mairie360/bff-user-openapi`, `@mairie360/core-api-openapi` et `@mairie360/elearning-api-openapi` installés (types orval, versions épinglées dans `package.json`): chaque requête sortante (chemin, paramètres, corps JSON) et chaque réponse de succès simulée est validée contre ces contrats, et chaque réponse du BFF contre `contracts/openapi.json`. Monter la version d'un paquet suffit à tester le nouveau contrat; les statuts d'erreur ne sont pas typés par orval et sont simulés explicitement.

`contracts:generate` exporte le registre runtime dans `contracts/openapi.json` et régénère `contracts/bff.d.ts`. `contracts:check` échoue si le contrat ou les types sont périmés. Exécuter ensuite `npm run contracts:sync` dans chaque web service associé et livrer les modifications de contrat ensemble.

Le générateur de types est fixé à `openapi-typescript@7.10.1` dans `scripts/contracts.mjs` et s’exécute via npm. Pour une modification uniquement documentaire, vérifier les liens, l’exactitude des deux langues et `git diff --check`; ne pas régénérer les contrats sans modification de leur source.

## CI/CD et exécution Docker

Le job `contracts.yml` utilise Node.js 22, `actions/checkout@v7` et `actions/setup-node@v7`. Il s’exécute sur push, pull request et lancement manuel; il installe avec `npm ci`, contrôle les contrats et lance les tests dédiés.

`cicd.yml` appelle `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v3.0.0`, avec `cicd_version: v3.0.0` et `node_version: "22"`. Les étapes réutilisables et les environnements GitHub déterminent les contrôles, publications et déploiements effectifs.

Le Dockerfile utilise encore `node:20-alpine` pour la construction et l’exécution; la commande de l’image est `["node", "dist/index.js"]`. Cette version est distincte du job de contrats Node.js 22.

`security_test.sh` et `performance_test.sh` testent l’image désignée par `IMAGE_REF`: en CI, l’image que `release-dev` vient de publier, soit l’artefact ensuite promu en staging puis en prod. Quand `IMAGE_REF` est vide (usage local), ils construisent d’abord `bff-elearning:local` depuis `development.Dockerfile`, ce qui demande `NODE_AUTH_TOKEN` et `./.npmrc`.

`security_test.sh` lance la stack OWASP ZAP de `docker-compose-security.yml`: ZAP rejoue chaque opération de `/openapi.json` avec un JWT admin statique (`sub=1`, HS256, `JWT_SECRET=b"secret"`) et remplit corps, requêtes et paramètres de chemin avec les exemples du contrat. `init-test.sql` crée les utilisateurs 1 (Admin) et 2 (User) et la formation E-learning des exemples du contrat (formation `4`, module `11`, pièce jointe `27`), avec les deux utilisateurs inscrits. Garder exemples et données alignés en ajoutant une route.

La stack ZAP porte la gate de couverture OpenAPI de `mairie360/CICD` (`tests/zap/zap_hooks.py`), extraite dans `cicd-repo/` par le job CI et clonée au même endroit par `security_test.sh` / `performance_test.sh` au `cicd_version` épinglé (`CICD_VERSION` le remplace). Après le scan, le hook échoue si une opération du contrat n’a jamais été atteinte, ou si une opération qui exige `bearerAuth` n’a reçu que des 401/403. Les opérations publiques (`/health`, `/check_apis`) déclarent `security: []` dans leur `registerPath` ; le déclarer sur toute nouvelle route publique.

La stack k6 porte l’autre moitié de la gate (`tests/k6/coverage.js`) : `load-test.js` contient un handler par opération de `contracts/openapi.json`, donc k6 s’arrête à l’init s’il en manque un et échoue sur le seuil `operations_uncovered` si un handler n’envoie pas sa requête. **Ajouter une route implique d’ajouter son handler dans `load-test.js`.** Deux scénarios partagent les handlers : `crud` (2 VUs) appelle chaque handler une fois par itération, écritures comprises (les réponses 501 de la notation, de l’administration des formations et de l’adresse sont déclarées comme statuts attendus) ; `reads` (jusqu’à 20 VUs) ne rejoue que les handlers GET. Chaque opération a un seuil `p(95)` fixé par sa famille : 50 ms pour `/health`, 300 ms pour `/check_apis`, 600 ms pour les lectures (BFF User puis appels en éventail à l’API E-learning), 800 ms pour les écritures ; `http_req_failed` doit rester sous 1 %.

Avant un lancement Docker, vérifier les variables de service, les secrets de build et les réseaux dans les fichiers du dépôt. Une CI verte valide ses jobs; elle ne prouve pas la disponibilité des services métier dans un environnement distant.

## Diagnostic

Si le catalogue refuse la session, vérifier BFF User. Un catalogue vide signifie que l’appelant n’est inscrit à aucune formation de l’API E-learning (un administrateur y inscrit les utilisateurs). Un 502 sur toutes les routes de formation signale le plus souvent un `ELEARNING_API_URL` erroné ou une API arrêtée : `/check_apis` indique quel service est injoignable.

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
