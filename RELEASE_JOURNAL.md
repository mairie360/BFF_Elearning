# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "936ba8c7586e1b8264e19f7fec3a3a5fc05b063a", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-11-05 03:40 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `936ba8c` | 2026-11-05 03:40 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Changements de comportement
- Les routes protégées du BFF n'acceptent plus un jeton HS256 signé avec le secret partagé. La session est vérifiée avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôle de `iss` et `aud`) via `@mairie360/bffs-lib` 2.7.0. Un jeton HS256 reçoit 401 sans aucun appel amont. HS256 reste accepté uniquement tant que `JWT_SECRET` est défini (transition). (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- Le BFF refuse de démarrer sans `JWT_PUBLIC_KEY` ou si la clé est mal formée (`assertStartupConfiguration()`). Les déploiements doivent fournir la clé publique de Core. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Technique
- Épinglage par digest des images et actions (Node 24.22.1, postgres, redis, curl, k6, newman, ZAP, actions/checkout, actions/setup-node). Le runtime Node passe en 24.22.1 après les correctifs de sécurité d'octobre 2026, sans npm, npx, corepack ni yarn ; l'image de développement tourne en utilisateur `node`. Mise à jour de zod en 4.6.7. (MAIR-771, [#214](https://github.com/mairie360/BFF_Elearning/pull/214), [#205](https://github.com/mairie360/BFF_Elearning/pull/205), [#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- Les workflows CI et de promotion appellent mairie360/CICD v5.2.2 au lieu de v4.5.0, et transmettent `ANTHROPIC_WORKSPACE_ID` ; une garde jest vérifie la version de CICD des workflows. (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207))
- Contrôles RGPD : simulation d'usage (MAIR-497, [#210](https://github.com/mairie360/BFF_Elearning/pull/210)), test du marqueur dans les journaux (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150)), checklist RGPD sur les PR avec `gdpr-pr.yml` (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154)).
- Tests d'intégration newman sur la stack réelle, avec collection Postman et rapport junit (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199)).
- Scripts de stack : la paire de clés JWT doit être une paire Ed25519 valide, et `performance_test.sh` s'arrête si `mktemp -d` échoue (MAIR-680, [#212](https://github.com/mairie360/BFF_Elearning/pull/212)).

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Les routes protégées du BFF n'acceptent plus un jeton HS256 signé avec le secret partagé. La session est vérifiée avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôle de `iss` et `aud`) via `@mairie360/bffs-lib` 2.7.0. Un jeton HS256 reçoit 401 sans aucun appel amont. HS256 reste accepté uniquement tant que `JWT_SECRET` est défini (transition). (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))
- Le BFF refuse de démarrer sans `JWT_PUBLIC_KEY` ou si la clé est mal formée (`assertStartupConfiguration()`). Les déploiements doivent fournir la clé publique de Core. (MAIR-680, [#211](https://github.com/mairie360/BFF_Elearning/pull/211))

#### Technique
- Épinglage par digest des images et actions (Node 24.22.1, postgres, redis, curl, k6, newman, ZAP, actions/checkout, actions/setup-node). Le runtime Node passe en 24.22.1 après les correctifs de sécurité d'octobre 2026, sans npm, npx, corepack ni yarn ; l'image de développement tourne en utilisateur `node`. Mise à jour de zod en 4.6.7. (MAIR-771, [#214](https://github.com/mairie360/BFF_Elearning/pull/214), [#205](https://github.com/mairie360/BFF_Elearning/pull/205), [#200](https://github.com/mairie360/BFF_Elearning/pull/200))
- Les workflows CI et de promotion appellent mairie360/CICD v5.2.2 au lieu de v4.5.0, et transmettent `ANTHROPIC_WORKSPACE_ID` ; une garde jest vérifie la version de CICD des workflows. (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207))
- Contrôles RGPD : simulation d'usage (MAIR-497, [#210](https://github.com/mairie360/BFF_Elearning/pull/210)), test du marqueur dans les journaux (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150)), checklist RGPD sur les PR avec `gdpr-pr.yml` (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154)).
- Tests d'intégration newman sur la stack réelle, avec collection Postman et rapport junit (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199)).
- Scripts de stack : la paire de clés JWT doit être une paire Ed25519 valide, et `performance_test.sh` s'arrête si `mktemp -d` échoue (MAIR-680, [#212](https://github.com/mairie360/BFF_Elearning/pull/212)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
