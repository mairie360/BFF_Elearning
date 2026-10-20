# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "55dfd4b4cb34e881c243d79394b807631879eca2", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "55dfd4b4cb34e881c243d79394b807631879eca2", "updated": {"dev": "2026-10-20 17:58 UTC", "staging": "2026-10-20 18:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `55dfd4b` | 2026-10-20 18:12 UTC |
| dev | — | `55dfd4b` | 2026-10-20 17:58 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte des traces et des métriques HTTP en OpenTelemetry (OTLP) vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-elearning`. Les traces comprennent un span serveur nommé d'après la route, les spans des handlers et les appels amont, qui portent `traceparent`. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sont exportés : jamais d'URL, de query string, d'en-tête, d'identifiant ni d'IP. La télémétrie reste désactivée si la variable n'est pas définie ou si `OTEL_SDK_DISABLED=true`. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` (par ex. `service.version`, `deployment.environment.name`) sont pris en charge. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))
#### Changements de comportement
- Le contrat OpenAPI du BFF (`contracts/openapi.json`) documente désormais une réponse `429` (`ErrorResponse`) sur neuf opérations e-learning, quand une API amont atteint sa limite de débit. Selon la PR, l'en-tête `Retry-After` est relayé pour indiquer au client quand réessayer. Le diff est tronqué : le détail du changement dans `src/routes/Elearning/admin_courses.ts` n'est pas visible. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))
#### Technique
- Alignement des contrats amont et des images des stacks de test (MAIR-568, MAIR-575, MAIR-600) :
  - `@mairie360/core-api-openapi` passe en `0.0.0-staging.b900797` et `@mairie360/elearning-api-openapi` en `0.0.0-dev-e3ffc1c`.
  - Les images `core-api`, `elearning-api`, `database` et `liquibase-migrations` des fichiers `docker-compose*.yml` sont mises à jour.
  - PR : [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187), [#190](https://github.com/mairie360/BFF_Elearning/pull/190).
- CI : workflow réutilisable `mairie360/CICD` passé de v4.2.1 à v4.3.2 en 4 mises à jour Renovate ([#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#188](https://github.com/mairie360/BFF_Elearning/pull/188)). Transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` à l'étape du journal des releases (MAIR-571, [#183](https://github.com/mairie360/BFF_Elearning/pull/183)).

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Le BFF exporte des traces et des métriques HTTP en OpenTelemetry (OTLP) vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-elearning`. Les traces comprennent un span serveur nommé d'après la route, les spans des handlers et les appels amont, qui portent `traceparent`. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sont exportés : jamais d'URL, de query string, d'en-tête, d'identifiant ni d'IP. La télémétrie reste désactivée si la variable n'est pas définie ou si `OTEL_SDK_DISABLED=true`. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` (par ex. `service.version`, `deployment.environment.name`) sont pris en charge. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))
#### Changements de comportement
- Le contrat OpenAPI du BFF (`contracts/openapi.json`) documente désormais une réponse `429` (`ErrorResponse`) sur neuf opérations e-learning, quand une API amont atteint sa limite de débit. Selon la PR, l'en-tête `Retry-After` est relayé pour indiquer au client quand réessayer. Le diff est tronqué : le détail du changement dans `src/routes/Elearning/admin_courses.ts` n'est pas visible. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))
#### Technique
- Alignement des contrats amont et des images des stacks de test (MAIR-568, MAIR-575, MAIR-600) :
  - `@mairie360/core-api-openapi` passe en `0.0.0-staging.b900797` et `@mairie360/elearning-api-openapi` en `0.0.0-dev-e3ffc1c`.
  - Les images `core-api`, `elearning-api`, `database` et `liquibase-migrations` des fichiers `docker-compose*.yml` sont mises à jour.
  - PR : [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187), [#190](https://github.com/mairie360/BFF_Elearning/pull/190).
- CI : workflow réutilisable `mairie360/CICD` passé de v4.2.1 à v4.3.2 en 4 mises à jour Renovate ([#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#188](https://github.com/mairie360/BFF_Elearning/pull/188)). Transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` à l'étape du journal des releases (MAIR-571, [#183](https://github.com/mairie360/BFF_Elearning/pull/183)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 18:12 UTC | staging | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 17:58 UTC | dev | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 13:09 UTC | dev | — | `15082e0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427601832) |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
