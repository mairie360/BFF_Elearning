# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "15082e063d46c3fcf9b31c697eeacdcd6858970c", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "34ef96d835c61e57b5d5020cb62275f20331a794", "updated": {"dev": "2026-10-20 13:09 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `34ef96d` | — |
| dev | — | `15082e0` | 2026-10-20 13:09 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Télémétrie OpenTelemetry : quand `OTEL_EXPORTER_OTLP_ENDPOINT` est défini, le BFF exporte en OTLP ses traces et ses métriques HTTP. Les traces comprennent le span serveur nommé d'après la route, les spans des handlers et les appels amont, qui portent `traceparent`. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF : aucune URL, query string, en-tête, identifiant ni IP. Le nom du service est `bff-elearning` par défaut et se remplace avec `OTEL_SERVICE_NAME`. `OTEL_RESOURCE_ATTRIBUTES` ajoute des attributs de ressource et `OTEL_SDK_DISABLED=true` coupe la télémétrie. Sans endpoint, rien n'est exporté. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat `contracts/openapi.json` documente une réponse `429` (`ErrorResponse`) sur neuf opérations e-learning, émise quand une API amont atteint sa limite de débit. Le client doit réessayer après le délai en secondes de l'en-tête `Retry-After`, que le BFF conserve selon la description de la PR. Le diff du code (`src/routes/Elearning/admin_courses.ts`, `src/openapi-registry.ts`) est tronqué, le détail de l'implémentation n'est donc pas confirmé. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Les contrats amont passent d'abord aux versions prod (`@mairie360/core-api-openapi` 2.1.0, `@mairie360/elearning-api-openapi` 1.1.0), puis aux derniers builds dev : `0.0.0-dev-30d9bb5` et `0.0.0-dev-e3ffc1c`. Les images `core-api`, `elearning-api`, `database` et `liquibase-migrations` des stacks de test `docker-compose*.yml` suivent. (MAIR-568, MAIR-575, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187))
- CI : le workflow réutilisable `mairie360/CICD` passe de v4.2.1 à v4.3.2 en quatre mises à jour Renovate. Les secrets du journal des releases (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`) sont désormais transmis au workflow. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#188](https://github.com/mairie360/BFF_Elearning/pull/188))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Télémétrie OpenTelemetry : quand `OTEL_EXPORTER_OTLP_ENDPOINT` est défini, le BFF exporte en OTLP ses traces et ses métriques HTTP. Les traces comprennent le span serveur nommé d'après la route, les spans des handlers et les appels amont, qui portent `traceparent`. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF : aucune URL, query string, en-tête, identifiant ni IP. Le nom du service est `bff-elearning` par défaut et se remplace avec `OTEL_SERVICE_NAME`. `OTEL_RESOURCE_ATTRIBUTES` ajoute des attributs de ressource et `OTEL_SDK_DISABLED=true` coupe la télémétrie. Sans endpoint, rien n'est exporté. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat `contracts/openapi.json` documente une réponse `429` (`ErrorResponse`) sur neuf opérations e-learning, émise quand une API amont atteint sa limite de débit. Le client doit réessayer après le délai en secondes de l'en-tête `Retry-After`, que le BFF conserve selon la description de la PR. Le diff du code (`src/routes/Elearning/admin_courses.ts`, `src/openapi-registry.ts`) est tronqué, le détail de l'implémentation n'est donc pas confirmé. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Les contrats amont passent d'abord aux versions prod (`@mairie360/core-api-openapi` 2.1.0, `@mairie360/elearning-api-openapi` 1.1.0), puis aux derniers builds dev : `0.0.0-dev-30d9bb5` et `0.0.0-dev-e3ffc1c`. Les images `core-api`, `elearning-api`, `database` et `liquibase-migrations` des stacks de test `docker-compose*.yml` suivent. (MAIR-568, MAIR-575, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187))
- CI : le workflow réutilisable `mairie360/CICD` passe de v4.2.1 à v4.3.2 en quatre mises à jour Renovate. Les secrets du journal des releases (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`) sont désormais transmis au workflow. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#188](https://github.com/mairie360/BFF_Elearning/pull/188))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 13:09 UTC | dev | — | `15082e0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427601832) |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
