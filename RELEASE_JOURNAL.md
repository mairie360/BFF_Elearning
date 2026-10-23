# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "90805aefb8735baecbe9ac38ecb72551ab96efbd", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-10-23 13:26 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `90805ae` | 2026-10-23 13:26 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Changements de comportement

- L'image de développement (`development.Dockerfile`) tourne désormais sous l'utilisateur `node` (`USER node`, `/app` lui appartient) au lieu de l'utilisateur par défaut de l'image, root. ([#200](https://github.com/mairie360/BFF_Elearning/pull/200))

#### Technique

- Runtime Node.js passé de `24` à `24.22.1`, correctif de sécurité d'octobre 2026 : images `Dockerfile` et `development.Dockerfile` épinglées par digest, jobs `contracts.yml` et `cicd.yml` alignés. (MAIR-262 non concerné, [#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- Tests d'intégration newman sur la stack réelle (`docker-compose-integration.yml`, `integration_test.sh`, collection Postman, garde jest), porte `integration_tests` de la promotion staging, et passage de CICD à `v4.5.0` dans `cicd.yml`, `promote-staging.yml` et `promote-prod.yml`. Aucun changement de l'API. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement

- L'image de développement (`development.Dockerfile`) tourne désormais sous l'utilisateur `node` (`USER node`, `/app` lui appartient) au lieu de l'utilisateur par défaut de l'image, root. ([#200](https://github.com/mairie360/BFF_Elearning/pull/200))

#### Technique

- Runtime Node.js passé de `24` à `24.22.1`, correctif de sécurité d'octobre 2026 : images `Dockerfile` et `development.Dockerfile` épinglées par digest, jobs `contracts.yml` et `cicd.yml` alignés. (MAIR-262 non concerné, [#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- Tests d'intégration newman sur la stack réelle (`docker-compose-integration.yml`, `integration_test.sh`, collection Postman, garde jest), porte `integration_tests` de la promotion staging, et passage de CICD à `v4.5.0` dans `cicd.yml`, `promote-staging.yml` et `promote-prod.yml`. Aucun changement de l'API. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-23 13:26 UTC | dev | — | `90805ae` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39960669113) |
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
