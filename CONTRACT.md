# Contrat BFF / web service

Web services associés : **Elearning_Web_Service**. Le document [OpenAPI](contracts/openapi.json), les [types TypeScript](contracts/bff.d.ts), `/openapi.json` et `/swagger.json` proviennent tous de `src/openapi.ts`, qui importe les routes montées par l’application.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 CheckApiResponse |
| POST | `/elearning/admin/courses` | 501 tant que l’API E-learning ne permet pas de créer une formation |
| PATCH | `/elearning/admin/courses/{courseId}` | 501 tant que l’API E-learning ne permet pas de modifier une formation |
| DELETE | `/elearning/admin/courses/{courseId}` | 501 tant que l’API E-learning ne permet pas de supprimer une formation |
| GET | `/elearning/catalog` | 200 Formations de l’appelant, lues dans l’API E-learning |
| POST | `/elearning/courses/{courseId}/contents/{contentId}/complete` | 200 Progression enregistrée par l’API E-learning (par chapitre) ; 501 pour `completed: false` |
| GET | `/elearning/profile` | 200 Profil issu de BFF User |
| PATCH | `/elearning/profile` | 200 E-mail et téléphone enregistrés par Core API ; 501 pour `address` / `city` |
| POST | `/elearning/courses/{courseId}/rating` | 501 tant qu’aucun service ne stocke les notes |
| POST | `/elearning/courses/{courseId}/start` | 200 Formation à démarrer ou reprendre (lecture seule) |

## Mise à jour et validation

Après une modification des routes ou schémas, exécuter `npm run contracts:generate`, puis synchroniser chaque web service associé avec `npm run contracts:sync`. `npm run contracts:check` échoue si le contrat exporté ou les types générés sont périmés. Soumettre les branches associées dans la même livraison.

Le générateur de types est fixé à `openapi-typescript@7.10.1`. Il est exécuté via npm ; aucun jeton privé ne figure dans les contrats.

## Persistance

Le BFF ne stocke rien en mémoire : formations, inscriptions et progression viennent de l’API E-learning, l’identité de BFF User et les modifications d’e-mail et de téléphone sont écrites dans Core API. Les identifiants (`courseId`, `contentId`, `chapterId`) sont ceux de l’API E-learning, en chaînes numériques. Les fonctions sans stockage amont (notation, adresse et ville, administration des formations) répondent 501.
