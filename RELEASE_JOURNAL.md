# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "55dfd4b4cb34e881c243d79394b807631879eca2", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "34ef96d835c61e57b5d5020cb62275f20331a794", "updated": {"dev": "2026-10-20 17:58 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `34ef96d` | — |
| dev | — | `55dfd4b` | 2026-10-20 17:58 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte désormais ses traces (span serveur nommé d'après la route, spans des handlers, appels amont avec `traceparent`) et ses métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-elearning`. La télémétrie reste désactivée si cette variable n'est pas définie ou si `OTEL_SDK_DISABLED=true`. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sont exportés : aucune URL, query string, en-tête, identifiant ou IP. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` permettent de surcharger le nom du service et d'ajouter des attributs de ressource. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat OpenAPI du BFF (`contracts/openapi.json`) documente désormais une réponse `429` (schéma `ErrorResponse`) sur neuf opérations e-learning, pour le cas où une API amont atteint sa limite de débit : l'appelant doit réessayer après le délai indiqué par l'en-tête `Retry-After` (en secondes). Une ligne est aussi ajoutée dans `src/routes/Elearning/admin_courses.ts`, mais le diff est tronqué. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Alignement des contrats et images internes en trois étapes :
  - d'abord sur les versions prod : `@mairie360/core-api-openapi` 2.1.0 et `@mairie360/elearning-api-openapi` 1.1.0 ;
  - puis sur les builds dev : `core-api-openapi` `0.0.0-dev-30d9bb5` et `elearning-api-openapi` `0.0.0-dev-e3ffc1c` ;
  - enfin sur le build staging de Core API : `0.0.0-staging.b900797`.
  - Les images des stacks docker-compose de test suivent ces versions. (MAIR-568, MAIR-575, MAIR-600, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187), [#190](https://github.com/mairie360/BFF_Elearning/pull/190))
- CI :
  - quatre montées de version du workflow `mairie360/CICD` (v4.2.1 → v4.3.2) ;
  - transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour le journal des releases. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#188](https://github.com/mairie360/BFF_Elearning/pull/188))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Le BFF exporte désormais ses traces (span serveur nommé d'après la route, spans des handlers, appels amont avec `traceparent`) et ses métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-elearning`. La télémétrie reste désactivée si cette variable n'est pas définie ou si `OTEL_SDK_DISABLED=true`. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sont exportés : aucune URL, query string, en-tête, identifiant ou IP. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` permettent de surcharger le nom du service et d'ajouter des attributs de ressource. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat OpenAPI du BFF (`contracts/openapi.json`) documente désormais une réponse `429` (schéma `ErrorResponse`) sur neuf opérations e-learning, pour le cas où une API amont atteint sa limite de débit : l'appelant doit réessayer après le délai indiqué par l'en-tête `Retry-After` (en secondes). Une ligne est aussi ajoutée dans `src/routes/Elearning/admin_courses.ts`, mais le diff est tronqué. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Alignement des contrats et images internes en trois étapes :
  - d'abord sur les versions prod : `@mairie360/core-api-openapi` 2.1.0 et `@mairie360/elearning-api-openapi` 1.1.0 ;
  - puis sur les builds dev : `core-api-openapi` `0.0.0-dev-30d9bb5` et `elearning-api-openapi` `0.0.0-dev-e3ffc1c` ;
  - enfin sur le build staging de Core API : `0.0.0-staging.b900797`.
  - Les images des stacks docker-compose de test suivent ces versions. (MAIR-568, MAIR-575, MAIR-600, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187), [#190](https://github.com/mairie360/BFF_Elearning/pull/190))
- CI :
  - quatre montées de version du workflow `mairie360/CICD` (v4.2.1 → v4.3.2) ;
  - transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour le journal des releases. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#188](https://github.com/mairie360/BFF_Elearning/pull/188))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 17:58 UTC | dev | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 13:09 UTC | dev | — | `15082e0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427601832) |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
