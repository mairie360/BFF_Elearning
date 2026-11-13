# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "a454cccc8d07fc8c2f31e963580f6c3e88aa5c55", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "248e4b8bfd748f59a03af97a39202acd13ca49e4", "updated": {"dev": "2026-11-13 00:20 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-11-12 18:59 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `248e4b8` | 2026-11-12 18:59 UTC |
| dev | — | `a454ccc` | 2026-11-13 00:20 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

- fix(deps): MAIR-1003 Release prod: align internal versions and deploy ([#223](https://github.com/mairie360/BFF_Elearning/pull/223))
- fix(deps): MAIR-816 Release dev: align internal versions and deploy (#218) ([#218](https://github.com/mairie360/BFF_Elearning/pull/218))
- chore(deps): pin node.js to c86ecea (#214) ([#214](https://github.com/mairie360/BFF_Elearning/pull/214))
- feat: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#210](https://github.com/mairie360/BFF_Elearning/pull/210))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#212](https://github.com/mairie360/BFF_Elearning/pull/212))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- chore(deps): pin dependencies (#205) ([#205](https://github.com/mairie360/BFF_Elearning/pull/205))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#207) ([#207](https://github.com/mairie360/BFF_Elearning/pull/207))
- fix: MAIR-290 Détecter les données personnelles dans les journaux avec un test du marqueur (#150) ([#150](https://github.com/mairie360/BFF_Elearning/pull/150))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#154) ([#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- fix(security): patch Node.js runtime and toolchain (#200) ([#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- feat: MAIR-262 Tests d'intégration - Tests de fonctionnement des APIs, tests métier des BFFs et tests de régression (#199) ([#199](https://github.com/mairie360/BFF_Elearning/pull/199))

## Différence dev → staging (en dev, pas encore en staging)

- fix(deps): MAIR-1003 Release prod: align internal versions and deploy ([#223](https://github.com/mairie360/BFF_Elearning/pull/223))

## Différence staging → prod (en staging, pas encore en prod)

- fix(deps): MAIR-816 Release dev: align internal versions and deploy (#218) ([#218](https://github.com/mairie360/BFF_Elearning/pull/218))
- chore(deps): pin node.js to c86ecea (#214) ([#214](https://github.com/mairie360/BFF_Elearning/pull/214))
- feat: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#210](https://github.com/mairie360/BFF_Elearning/pull/210))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#212](https://github.com/mairie360/BFF_Elearning/pull/212))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- chore(deps): pin dependencies (#205) ([#205](https://github.com/mairie360/BFF_Elearning/pull/205))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#207) ([#207](https://github.com/mairie360/BFF_Elearning/pull/207))
- fix: MAIR-290 Détecter les données personnelles dans les journaux avec un test du marqueur (#150) ([#150](https://github.com/mairie360/BFF_Elearning/pull/150))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#154) ([#154](https://github.com/mairie360/BFF_Elearning/pull/154))
- fix(security): patch Node.js runtime and toolchain (#200) ([#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- feat: MAIR-262 Tests d'intégration - Tests de fonctionnement des APIs, tests métier des BFFs et tests de régression (#199) ([#199](https://github.com/mairie360/BFF_Elearning/pull/199))

> Résumé Claude indisponible pour ce passage : listes brutes des commits.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-13 00:20 UTC | dev | — | `a454ccc` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/43335006078) |
| 2026-11-12 18:59 UTC | staging | — | `248e4b8` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/43284388996) |
| 2026-11-12 13:18 UTC | dev | — | `248e4b8` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/43225215938) |
| 2026-11-05 03:40 UTC | dev | — | `936ba8c` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/41962495403) |
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
