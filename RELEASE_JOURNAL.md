# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "efcf9f0b67c288de2197e7f4f19e24bd5b931e93", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-11-01 12:13 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `efcf9f0` | 2026-11-01 12:13 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Technique
- Test de marqueur RGPD ajouté (`gdpr_marker_test.sh`, `docker-compose-gdpr-marker.yml`, `gdpr-marker.yaml`) : il rejoue un parcours avec des valeurs marqueurs à travers le BFF et cherche ces valeurs dans les journaux de tous les conteneurs. Un test unitaire vérifie qu'une erreur amont relayée en 502 n'écrit ni le jeton, ni l'e-mail, ni le téléphone, ni le corps amont dans les journaux. Le code de `src/` n'est pas modifié. (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150))
- Garde RGPD sur les pull requests : nouveau workflow `gdpr-pr.yml` qui contrôle la section « Données personnelles » de la description, et `renovate.json` mis à jour pour suivre `cicd_version` dans ce workflow. Aucun effet sur le service. (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Tests d'intégration sur la stack réelle : `docker-compose-integration.yml`, `integration_test.sh` et la collection Postman `tests/postman/`, rejouée par newman contre le BFF, avec le contrôle `integration_tests` avant la promotion staging. Les workflows `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` passent à CICD v4.5.0. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))
- Mise à jour de l'environnement d'exécution : images Node.js passées à 24.22.1 (Dockerfile, development.Dockerfile, CI), conteneur de développement lancé sous l'utilisateur `node`, dépendance `zod` 4.6.5 → 4.6.7 et documentation alignée. Sans effet visible pour les appelants. ([#200](https://github.com/mairie360/BFF_Elearning/pull/200), sans clé Jira)

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Test de marqueur RGPD ajouté (`gdpr_marker_test.sh`, `docker-compose-gdpr-marker.yml`, `gdpr-marker.yaml`) : il rejoue un parcours avec des valeurs marqueurs à travers le BFF et cherche ces valeurs dans les journaux de tous les conteneurs. Un test unitaire vérifie qu'une erreur amont relayée en 502 n'écrit ni le jeton, ni l'e-mail, ni le téléphone, ni le corps amont dans les journaux. Le code de `src/` n'est pas modifié. (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150))
- Garde RGPD sur les pull requests : nouveau workflow `gdpr-pr.yml` qui contrôle la section « Données personnelles » de la description, et `renovate.json` mis à jour pour suivre `cicd_version` dans ce workflow. Aucun effet sur le service. (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Tests d'intégration sur la stack réelle : `docker-compose-integration.yml`, `integration_test.sh` et la collection Postman `tests/postman/`, rejouée par newman contre le BFF, avec le contrôle `integration_tests` avant la promotion staging. Les workflows `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` passent à CICD v4.5.0. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))
- Mise à jour de l'environnement d'exécution : images Node.js passées à 24.22.1 (Dockerfile, development.Dockerfile, CI), conteneur de développement lancé sous l'utilisateur `node`, dépendance `zod` 4.6.5 → 4.6.7 et documentation alignée. Sans effet visible pour les appelants. ([#200](https://github.com/mairie360/BFF_Elearning/pull/200), sans clé Jira)

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-01 12:13 UTC | dev | — | `efcf9f0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41305216964) |
| 2026-11-01 11:43 UTC | dev | — | `2c9a493` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41302827810) |
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
