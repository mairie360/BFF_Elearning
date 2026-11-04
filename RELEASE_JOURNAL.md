# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "b7e6af7ebc5368f2b97893d1a6a31554d2ecf4ef", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-11-03 14:33 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `b7e6af7` | 2026-11-03 14:33 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Changements de comportement
- Les jetons de session sont désormais vérifiés avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôles `iss`, `aud`, `exp`, `sub`) et non plus avec le secret HS256 partagé. Un jeton HS256 n'est accepté que tant que `JWT_SECRET` est encore défini (transition) ; sans ce secret il reçoit 401 avant tout appel amont. Les appelants qui signaient leurs jetons en HS256 (scripts de test, k6, collections Postman) doivent utiliser un jeton EdDSA émis par Core. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- Le démarrage échoue désormais sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée (`assertStartupConfiguration()`) : c'est une nouvelle variable d'environnement obligatoire pour le déploiement. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Corrections
- Avant : un jeton HS256 signé avec le secret partagé par 12 services était accepté, donc tout service détenant ce secret pouvait forger un jeton admin. Maintenant : la vérification passe par la clé publique de Core, et cette voie est fermée dès que `JWT_SECRET` est retiré. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Technique
- Stacks de test : `stack_secrets.sh` génère une paire Ed25519 par run et refuse une paire invalide ou désappariée, `performance_test.sh` signe les jetons k6 dans un fichier et s'arrête si `mktemp` échoue ; images Core et E-learning API épinglées sur `dev-3b40c2a` et `dev-82404ec`. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211), [#212](https://github.com/mairie360/BFF_Elearning/pull/212))
- CI/CD : workflows de mairie360/CICD passés en v5.2.2 avec `ANTHROPIC_WORKSPACE_ID` transmis et test de cohérence des versions (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207)) ; checklist RGPD sur les PR (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154)) ; test du marqueur RGPD dans les journaux (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150)) ; stack d'intégration newman et collection Postman (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199)).
- Images et dépendances : Node.js 24.22.1 dans les Dockerfiles et les jobs, conteneur de développement lancé en utilisateur `node` ([#200](https://github.com/mairie360/BFF_Elearning/pull/200)) ; images et actions épinglées par digest ou SHA et mises à jour Renovate ([#205](https://github.com/mairie360/BFF_Elearning/pull/205)) ; `zod` passe de 4.6.5 à 4.6.7 ([#154](https://github.com/mairie360/BFF_Elearning/pull/154)).

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Les jetons de session sont désormais vérifiés avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôles `iss`, `aud`, `exp`, `sub`) et non plus avec le secret HS256 partagé. Un jeton HS256 n'est accepté que tant que `JWT_SECRET` est encore défini (transition) ; sans ce secret il reçoit 401 avant tout appel amont. Les appelants qui signaient leurs jetons en HS256 (scripts de test, k6, collections Postman) doivent utiliser un jeton EdDSA émis par Core. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- Le démarrage échoue désormais sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée (`assertStartupConfiguration()`) : c'est une nouvelle variable d'environnement obligatoire pour le déploiement. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Corrections
- Avant : un jeton HS256 signé avec le secret partagé par 12 services était accepté, donc tout service détenant ce secret pouvait forger un jeton admin. Maintenant : la vérification passe par la clé publique de Core, et cette voie est fermée dès que `JWT_SECRET` est retiré. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Technique
- Stacks de test : `stack_secrets.sh` génère une paire Ed25519 par run et refuse une paire invalide ou désappariée, `performance_test.sh` signe les jetons k6 dans un fichier et s'arrête si `mktemp` échoue ; images Core et E-learning API épinglées sur `dev-3b40c2a` et `dev-82404ec`. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211), [#212](https://github.com/mairie360/BFF_Elearning/pull/212))
- CI/CD : workflows de mairie360/CICD passés en v5.2.2 avec `ANTHROPIC_WORKSPACE_ID` transmis et test de cohérence des versions (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207)) ; checklist RGPD sur les PR (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154)) ; test du marqueur RGPD dans les journaux (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150)) ; stack d'intégration newman et collection Postman (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199)).
- Images et dépendances : Node.js 24.22.1 dans les Dockerfiles et les jobs, conteneur de développement lancé en utilisateur `node` ([#200](https://github.com/mairie360/BFF_Elearning/pull/200)) ; images et actions épinglées par digest ou SHA et mises à jour Renovate ([#205](https://github.com/mairie360/BFF_Elearning/pull/205)) ; `zod` passe de 4.6.5 à 4.6.7 ([#154](https://github.com/mairie360/BFF_Elearning/pull/154)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
