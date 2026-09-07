# Contrat BFF / web service

Web services associés : **Elearning_Web_Service**. Le document [OpenAPI](contracts/openapi.json), les [types TypeScript](contracts/bff.d.ts), `/openapi.json` et `/swagger.json` proviennent tous de `src/openapi.ts`, qui importe les routes montées par l’application.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 CheckApiResponse |
| POST | `/elearning/admin/courses` | 201 Formation créée |
| PATCH | `/elearning/admin/courses/{courseId}` | 200 Formation mise à jour |
| DELETE | `/elearning/admin/courses/{courseId}` | 200 Formation supprimée |
| GET | `/elearning/catalog` | 200 Catalogue charge avec succes |
| POST | `/elearning/courses/{courseId}/contents/{contentId}/complete` | 200 Progression mise a jour |
| GET | `/elearning/profile` | 200 Profil charge avec succes |
| PATCH | `/elearning/profile` | 200 Profil mis a jour |
| POST | `/elearning/courses/{courseId}/rating` | 200 Note enregistree |
| POST | `/elearning/courses/{courseId}/start` | 200 Formation demarree ou reprise |

## Mise à jour et validation

Après une modification des routes ou schémas, exécuter `npm run contracts:generate`, puis synchroniser chaque web service associé avec `npm run contracts:sync`. `npm run contracts:check` échoue si le contrat exporté ou les types générés sont périmés. Soumettre les branches associées dans la même livraison.

Le générateur de types est fixé à `openapi-typescript@7.10.1`. Il est exécuté via npm ; aucun jeton privé ne figure dans les contrats.

## Limite existante

Le catalogue, les progressions et les modifications de profil E-learning restent gérés en mémoire par le BFF existant. Cette livraison aligne le contrat et le client ; elle ne migre pas cette persistance vers les API.
