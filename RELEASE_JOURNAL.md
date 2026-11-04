# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "d4becc714de2169df01aef3f751c2227a27a22fb", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-11-04 18:13 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `d4becc7` | 2026-11-04 18:13 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Changements de comportement
- Le BFF vérifie désormais les sessions avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôles `iss` et `aud`) au lieu du secret HS256 partagé. Un appelant qui présente un jeton HS256 reçoit un 401 avant tout appel amont, sauf si `JWT_SECRET` est encore défini (transition). Le démarrage échoue sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée. La dépendance `@mairie360/bffs-lib` passe en 2.7.0. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Technique
- Test RGPD d'usage (simulation) : ajout de `gdpr-simulation.yaml`, `docker-compose-gdpr-simulation.yml` et `gdpr_simulation_test.sh`, qui rejouent un parcours avec des personas fictifs, puis vérifient la purge et les journaux ; `gdpr-simulation/` est ignoré par Git et par Docker. (MAIR-497, [#210](https://github.com/mairie360/BFF_Elearning/pull/210))
- `stack_secrets.sh` refuse une paire de clés qui n'est pas une paire Ed25519 valide, et `performance_test.sh` s'arrête si `mktemp -d` échoue. (MAIR-680, [#212](https://github.com/mairie360/BFF_Elearning/pull/212))
- Stacks de test (intégration, marqueur, ZAP, k6) : clés de session générées par exécution, images Core API et E-learning API fixées à des builds `dev-…`, images de base épinglées par digest. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- Tests d'intégration sur stack réelle : `docker-compose-integration.yml`, `integration_test.sh` et une collection Postman rejouée par newman, bloquante pour la promotion en staging. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))
- Checklist RGPD des pull requests : workflow `gdpr-pr.yml` qui vérifie la section « Données personnelles » de la description. (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Test du marqueur RGPD sur les journaux : `gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml`, `gdpr_marker_test.sh` et un test unitaire sur les erreurs amont. (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150))
- Workflows CI et promotion appelant mairie360/CICD : passage de v4.4.3 à v4.5.0, puis v5.2.2 (avec une garde jest sur la version), puis v5.3.1. (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207) ; MAIR-497, [#210](https://github.com/mairie360/BFF_Elearning/pull/210))
- Node.js passe à 24.22.1 dans les images `Dockerfile` et `development.Dockerfile`, épinglées par digest, et l'image de développement tourne désormais avec l'utilisateur `node`. Cela ne change pas l'image de production. (#200, [#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- Dépendances : épinglage par digest des actions et images Docker (Renovate), et `zod` passe de 4.6.5 à 4.6.7. (#205, [#205](https://github.com/mairie360/BFF_Elearning/pull/205) ; [#154](https://github.com/mairie360/BFF_Elearning/pull/154))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Le BFF vérifie désormais les sessions avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôles `iss` et `aud`) au lieu du secret HS256 partagé. Un appelant qui présente un jeton HS256 reçoit un 401 avant tout appel amont, sauf si `JWT_SECRET` est encore défini (transition). Le démarrage échoue sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée. La dépendance `@mairie360/bffs-lib` passe en 2.7.0. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Technique
- Test RGPD d'usage (simulation) : ajout de `gdpr-simulation.yaml`, `docker-compose-gdpr-simulation.yml` et `gdpr_simulation_test.sh`, qui rejouent un parcours avec des personas fictifs, puis vérifient la purge et les journaux ; `gdpr-simulation/` est ignoré par Git et par Docker. (MAIR-497, [#210](https://github.com/mairie360/BFF_Elearning/pull/210))
- `stack_secrets.sh` refuse une paire de clés qui n'est pas une paire Ed25519 valide, et `performance_test.sh` s'arrête si `mktemp -d` échoue. (MAIR-680, [#212](https://github.com/mairie360/BFF_Elearning/pull/212))
- Stacks de test (intégration, marqueur, ZAP, k6) : clés de session générées par exécution, images Core API et E-learning API fixées à des builds `dev-…`, images de base épinglées par digest. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- Tests d'intégration sur stack réelle : `docker-compose-integration.yml`, `integration_test.sh` et une collection Postman rejouée par newman, bloquante pour la promotion en staging. (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199))
- Checklist RGPD des pull requests : workflow `gdpr-pr.yml` qui vérifie la section « Données personnelles » de la description. (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- Test du marqueur RGPD sur les journaux : `gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml`, `gdpr_marker_test.sh` et un test unitaire sur les erreurs amont. (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150))
- Workflows CI et promotion appelant mairie360/CICD : passage de v4.4.3 à v4.5.0, puis v5.2.2 (avec une garde jest sur la version), puis v5.3.1. (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207) ; MAIR-497, [#210](https://github.com/mairie360/BFF_Elearning/pull/210))
- Node.js passe à 24.22.1 dans les images `Dockerfile` et `development.Dockerfile`, épinglées par digest, et l'image de développement tourne désormais avec l'utilisateur `node`. Cela ne change pas l'image de production. (#200, [#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- Dépendances : épinglage par digest des actions et images Docker (Renovate), et `zod` passe de 4.6.5 à 4.6.7. (#205, [#205](https://github.com/mairie360/BFF_Elearning/pull/205) ; [#154](https://github.com/mairie360/BFF_Elearning/pull/154))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-04 18:13 UTC | dev | — | `d4becc7` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41882714601) |
| 2026-11-03 14:33 UTC | dev | — | `b7e6af7` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41654057766) |
| 2026-11-03 14:11 UTC | dev | — | `b8280df` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41650561967) |
| 2026-11-03 01:50 UTC | dev | — | `646b8ee` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41561843621) |
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
