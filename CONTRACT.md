# Contrat BFF / web service

Web services associés : **Elearning_Web_Service**. Le document [OpenAPI](contracts/openapi.json), les [types TypeScript](contracts/bff.d.ts), `/openapi.json` et `/swagger.json` proviennent tous de `src/openapi.ts`, qui importe les routes montées par l’application.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 / 502 CheckApisResponse (`core_api`, `elearning_api`) |
| POST | `/elearning/admin/courses` | 201 `AdminCourseResponse` `{ id, course }` : formation créée dans l’API E-learning (400 nommant le champ refusé) |
| PATCH | `/elearning/admin/courses/{courseId}` | 200 `AdminCourseResponse` : remplacement complet (lignes à identifiant décimal gardées) ; 404 formation inconnue |
| DELETE | `/elearning/admin/courses/{courseId}` | 200 `AdminCourseDeleteResponse` `{ deleted, courseId }` ; 404 formation inconnue |
| POST | `/elearning/admin/courses/{courseId}/reminders` | 200 `SendRemindersResponse` `{ sent }` (corps `{ userIds? }`) ; 404 inconnue, 409 non obligatoire |
| GET | `/elearning/admin/stats` | 200 `AdminStatsResponse` : indicateurs de l’instance |
| GET | `/elearning/catalog` | 200 Formations de l’appelant, lues dans l’API E-learning (champs V2 : catégorie, niveau, obligatoire, échéance, source, formateur, durées, notes, dates) |
| GET | `/elearning/certificates?year=` | 200 `application/pdf` attestations de l’année ; 404 aucune |
| GET | `/elearning/courses/{courseId}/certificate` | 200 `application/pdf` attestation ; 404 non inscrit, 409 non terminée |
| GET | `/elearning/courses/{courseId}/chapters/{chapterId}/contents/{contentId}/file` | 200 `ContentFileResponse` `{ url }` URL signée d’un fichier stocké ; 404 sinon |
| GET | `/elearning/training-time?year=` | 200 `TrainingTimeResponse` temps de formation de l’année |
| POST | `/elearning/courses/{courseId}/contents/{contentId}/complete` | 200 Progression enregistrée par l’API E-learning (par chapitre) ; 501 pour `completed: false` |
| GET | `/elearning/profile` | 200 Profile read from Core API (`GET /api/v1/user/me/`), read-only: profile edits belong to Settings |
| POST | `/elearning/courses/{courseId}/rating` | 200 `RatingSubmitResponse` note enregistrée par l’API E-learning ; 404 non inscrit, 409 non terminée |
| POST | `/elearning/courses/{courseId}/start` | 200 Formation à démarrer ou reprendre (lecture seule) |

## Mise à jour et validation

Après une modification des routes ou schémas, exécuter `npm run contracts:generate`, puis synchroniser chaque web service associé avec `npm run contracts:sync`. `npm run contracts:check` échoue si le contrat exporté ou les types générés sont périmés. Soumettre les branches associées dans la même livraison.

Le générateur de types est fixé à `openapi-typescript@7.10.1`. Il est exécuté via npm ; aucun jeton privé ne figure dans les contrats.

## Persistance

Le BFF ne stocke rien en mémoire : formations, inscriptions et progression viennent de l’API E-learning, l’identité et les rôles de Core API (jamais d’un autre BFF, MAIR-525) et le profil y est en lecture seule (il se modifie dans Paramètres). Les identifiants (`courseId`, `contentId`, `chapterId`) sont ceux de l’API E-learning, en chaînes numériques. Seule l’annulation de la validation d’un contenu, sans opération amont, répond 501.
