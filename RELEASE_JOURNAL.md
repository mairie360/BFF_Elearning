# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "c3239ca70d3ca03676acc2e3a23d9aa449e74424", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-10-22 09:01 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `c3239ca` | 2026-10-22 09:01 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Technique
- Ajout de la suite de tests d'intégration sur la vraie stack (`integration_test.sh`, `docker-compose-integration.yml`) : newman rejoue `tests/postman/collection.json` contre le BFF, avec les images publiées de Core API et E-learning API, et une garde jest `tests/integration-collection.test.ts` vérifie la collection. Aucun fichier de `src/` ne figure dans le diff. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))
- Workflows `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` : passage de mairie360/CICD de `v4.4.3` à `v4.5.0`. La promotion en staging exécute désormais le gate `integration_tests` (newman) et est bloquée en cas d'échec. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Ajout de la suite de tests d'intégration sur la vraie stack (`integration_test.sh`, `docker-compose-integration.yml`) : newman rejoue `tests/postman/collection.json` contre le BFF, avec les images publiées de Core API et E-learning API, et une garde jest `tests/integration-collection.test.ts` vérifie la collection. Aucun fichier de `src/` ne figure dans le diff. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))
- Workflows `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` : passage de mairie360/CICD de `v4.4.3` à `v4.5.0`. La promotion en staging exécute désormais le gate `integration_tests` (newman) et est bloquée en cas d'échec. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-22 09:01 UTC | dev | — | `c3239ca` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39751718619) |
| 2026-10-21 10:10 UTC | prod | v1.1.0 | `95dccba` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39580929317) |
| 2026-10-21 09:55 UTC | staging | — | `95dccba` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39579957024) |
| 2026-10-21 09:48 UTC | dev | — | `95dccba` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39579180328) |
| 2026-10-21 01:38 UTC | dev | — | `206077b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39528018218) |
| 2026-10-20 18:12 UTC | staging | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 17:58 UTC | dev | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 13:09 UTC | dev | — | `15082e0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427601832) |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
