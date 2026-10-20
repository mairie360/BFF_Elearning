# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "3e662958eba1ac1b78289ca008963eb7e8bd0eeb", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "34ef96d835c61e57b5d5020cb62275f20331a794", "updated": {"dev": "2026-10-20 13:07 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `34ef96d` | — |
| dev | — | `3e66295` | 2026-10-20 13:07 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte ses traces (span serveur nommé d'après la route, spans des handlers, appels aux APIs amont portant `traceparent`) et ses métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-elearning`. Sans cette variable, la télémétrie est désactivée ; `OTEL_SDK_DISABLED=true` la coupe aussi. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat `contracts/openapi.json` documente une réponse `429` (`ErrorResponse`) sur neuf opérations e-learning : elle est renvoyée quand une API amont atteint sa limite de débit, et il faut réessayer après le délai indiqué par l'en-tête `Retry-After` (en secondes). Le diff étant tronqué, le détail des routes concernées et du code ne peut pas être vérifié. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Mise à jour des contrats amont :
  - `@mairie360/core-api-openapi` passe de `0.0.0-dev-95531e2` à `2.1.0`, puis à `0.0.0-dev-30d9bb5`.
  - `@mairie360/elearning-api-openapi` passe de `0.0.0-dev-9a33c9b` à `1.1.0`, puis à `0.0.0-dev-e3ffc1c`.
  - Les images des stacks de test `docker-compose*.yml` (database, liquibase, `core-api`, `elearning-api`) suivent ces versions. (MAIR-568, MAIR-575, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187))
- CI : workflow `mairie360/CICD` passé de v4.2.1 à v4.3.1 en trois mises à jour Renovate, et transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour le journal des releases. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#183](https://github.com/mairie360/BFF_Elearning/pull/183))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Le BFF exporte ses traces (span serveur nommé d'après la route, spans des handlers, appels aux APIs amont portant `traceparent`) et ses métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-elearning`. Sans cette variable, la télémétrie est désactivée ; `OTEL_SDK_DISABLED=true` la coupe aussi. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat `contracts/openapi.json` documente une réponse `429` (`ErrorResponse`) sur neuf opérations e-learning : elle est renvoyée quand une API amont atteint sa limite de débit, et il faut réessayer après le délai indiqué par l'en-tête `Retry-After` (en secondes). Le diff étant tronqué, le détail des routes concernées et du code ne peut pas être vérifié. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Mise à jour des contrats amont :
  - `@mairie360/core-api-openapi` passe de `0.0.0-dev-95531e2` à `2.1.0`, puis à `0.0.0-dev-30d9bb5`.
  - `@mairie360/elearning-api-openapi` passe de `0.0.0-dev-9a33c9b` à `1.1.0`, puis à `0.0.0-dev-e3ffc1c`.
  - Les images des stacks de test `docker-compose*.yml` (database, liquibase, `core-api`, `elearning-api`) suivent ces versions. (MAIR-568, MAIR-575, [#180](https://github.com/mairie360/BFF_Elearning/pull/180), [#187](https://github.com/mairie360/BFF_Elearning/pull/187))
- CI : workflow `mairie360/CICD` passé de v4.2.1 à v4.3.1 en trois mises à jour Renovate, et transmission des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour le journal des releases. (MAIR-571, [#181](https://github.com/mairie360/BFF_Elearning/pull/181), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#183](https://github.com/mairie360/BFF_Elearning/pull/183))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
