# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "a7d4ce613396b701eb07f00156abf32972cfddbf", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "34ef96d835c61e57b5d5020cb62275f20331a794", "updated": {"dev": "2026-10-19 20:14 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `34ef96d` | — |
| dev | — | `a7d4ce6` | 2026-10-19 20:14 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF émet désormais de la télémétrie OpenTelemetry sous le nom de service `bff-elearning` : traces (span serveur nommé d'après la route, spans des handlers, appels amont propageant `traceparent`) et métriques HTTP, exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, ou avec `OTEL_SDK_DISABLED=true`, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais d'URL, de query string, d'en-tête, d'identifiant ni d'IP. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` (par ex. `service.version`, `deployment.environment.name`) sont configurables. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le BFF utilise désormais les versions prod des contrats des APIs : `@mairie360/core-api-openapi` 2.1.0 et `@mairie360/elearning-api-openapi` 1.1.0, au lieu des builds `0.0.0-dev`. Le contrat `contracts/openapi.json` documente maintenant une réponse 429 (`ErrorResponse`) sur plusieurs opérations e-learning. Cette réponse signale qu'une limite de débit d'une API amont est atteinte et qu'il faut réessayer après l'en-tête `Retry-After` (en secondes). Le diff étant tronqué, le détail du traitement côté code n'est pas visible. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Trois montées de version du workflow réutilisable `mairie360/CICD` (v4.2.1 → v4.2.2 → v4.3.0 → v4.3.1), et transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour l'étape de journal des releases. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#183](https://github.com/mairie360/BFF_Elearning/pull/183))
- Mise à jour des images Docker des stacks de dev, performance et sécurité (database, liquibase, core-api, elearning-api), avec documentation et tests associés. (MAIR-568, MAIR-504, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Le BFF émet désormais de la télémétrie OpenTelemetry sous le nom de service `bff-elearning` : traces (span serveur nommé d'après la route, spans des handlers, appels amont propageant `traceparent`) et métriques HTTP, exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, ou avec `OTEL_SDK_DISABLED=true`, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais d'URL, de query string, d'en-tête, d'identifiant ni d'IP. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` (par ex. `service.version`, `deployment.environment.name`) sont configurables. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le BFF utilise désormais les versions prod des contrats des APIs : `@mairie360/core-api-openapi` 2.1.0 et `@mairie360/elearning-api-openapi` 1.1.0, au lieu des builds `0.0.0-dev`. Le contrat `contracts/openapi.json` documente maintenant une réponse 429 (`ErrorResponse`) sur plusieurs opérations e-learning. Cette réponse signale qu'une limite de débit d'une API amont est atteinte et qu'il faut réessayer après l'en-tête `Retry-After` (en secondes). Le diff étant tronqué, le détail du traitement côté code n'est pas visible. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Trois montées de version du workflow réutilisable `mairie360/CICD` (v4.2.1 → v4.2.2 → v4.3.0 → v4.3.1), et transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour l'étape de journal des releases. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#183](https://github.com/mairie360/BFF_Elearning/pull/183))
- Mise à jour des images Docker des stacks de dev, performance et sécurité (database, liquibase, core-api, elearning-api), avec documentation et tests associés. (MAIR-568, MAIR-504, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
