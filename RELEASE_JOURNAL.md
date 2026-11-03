# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "6a8d4188efb0ad9dd7450218fddbacfbea41e444", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-11-03 00:03 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `6a8d418` | 2026-11-03 00:03 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Technique
- Pipeline CI/CD : `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` appellent désormais CICD v5.2.2 (au lieu de v4.5.0), et `gdpr-pr.yml` passe de v4.12.0 à v5.2.2. `ANTHROPIC_WORKSPACE_ID` est transmis à la revue IA des workflows concernés, et un test jest (`tests/mair-771-cicd-version.test.ts`) vérifie que tous les workflows appellent la même version. (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207))
- Checklist RGPD des pull requests : le workflow `gdpr-pr.yml` contrôle que la section « Données personnelles » de la description est remplie et que le « Oui » est accompagné de l'inventaire. Il a été ajouté avec un pin sur une branche de CICD, puis aligné sur v5.2.2 par #207. (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Tests de marqueur RGPD : `gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml` et `gdpr_marker_test.sh` rejouent un parcours avec des valeurs marqueur à travers le BFF, puis cherchent ces valeurs dans les journaux de chaque conteneur. Un test unitaire vérifie qu'un échec amont ne fait apparaître ni le jeton, ni les données du profil, ni le corps de la réponse amont dans les journaux. Le code de `src/` n'est pas modifié. (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150), diff tronqué)
- Tests d'intégration : `integration_test.sh`, `docker-compose-integration.yml` et la collection Postman `tests/postman/` rejouent avec newman des parcours (inscription, progression, profil) contre la stack réelle (Core API, E-learning API, base, Redis). Ils forment le gate `integration_tests` de la promotion staging. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199), diff tronqué)
- Images Node : `Dockerfile` et `development.Dockerfile` sont épinglés sur `node:24.22.1-alpine` par digest, et la CI tourne sur Node 24.22.1. Le conteneur de développement s'exécute désormais avec l'utilisateur `node`. Le paquet `zod` passe de 4.6.5 à 4.6.7. ([#200](https://github.com/mairie360/BFF_Elearning/pull/200), [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Documentation (`CLAUDE.md`, `docs/en/technical.md`, `docs/fr/technical.md`) mise à jour pour les versions de CICD et de Node.

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Pipeline CI/CD : `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` appellent désormais CICD v5.2.2 (au lieu de v4.5.0), et `gdpr-pr.yml` passe de v4.12.0 à v5.2.2. `ANTHROPIC_WORKSPACE_ID` est transmis à la revue IA des workflows concernés, et un test jest (`tests/mair-771-cicd-version.test.ts`) vérifie que tous les workflows appellent la même version. (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207))
- Checklist RGPD des pull requests : le workflow `gdpr-pr.yml` contrôle que la section « Données personnelles » de la description est remplie et que le « Oui » est accompagné de l'inventaire. Il a été ajouté avec un pin sur une branche de CICD, puis aligné sur v5.2.2 par #207. (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Tests de marqueur RGPD : `gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml` et `gdpr_marker_test.sh` rejouent un parcours avec des valeurs marqueur à travers le BFF, puis cherchent ces valeurs dans les journaux de chaque conteneur. Un test unitaire vérifie qu'un échec amont ne fait apparaître ni le jeton, ni les données du profil, ni le corps de la réponse amont dans les journaux. Le code de `src/` n'est pas modifié. (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150), diff tronqué)
- Tests d'intégration : `integration_test.sh`, `docker-compose-integration.yml` et la collection Postman `tests/postman/` rejouent avec newman des parcours (inscription, progression, profil) contre la stack réelle (Core API, E-learning API, base, Redis). Ils forment le gate `integration_tests` de la promotion staging. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199), diff tronqué)
- Images Node : `Dockerfile` et `development.Dockerfile` sont épinglés sur `node:24.22.1-alpine` par digest, et la CI tourne sur Node 24.22.1. Le conteneur de développement s'exécute désormais avec l'utilisateur `node`. Le paquet `zod` passe de 4.6.5 à 4.6.7. ([#200](https://github.com/mairie360/BFF_Elearning/pull/200), [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Documentation (`CLAUDE.md`, `docs/en/technical.md`, `docs/fr/technical.md`) mise à jour pour les versions de CICD et de Node.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-03 00:03 UTC | dev | — | `6a8d418` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41548510179) |
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
