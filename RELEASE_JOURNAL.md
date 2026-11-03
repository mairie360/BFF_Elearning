# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "646b8ee30ce0e1829f5db79aba1edd53183c87da", "prod": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod_tag": "v1.1.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-11-03 01:50 UTC", "prod": "2026-10-21 10:10 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `95dccba` | 2026-10-21 10:10 UTC |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `646b8ee` | 2026-11-03 01:50 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Technique
- Aucun changement de comportement pour les appelants : les routes, les réponses et les données sont inchangées. Les six commits touchent la CI, les images Docker, les tests et la documentation.
- Dépendances, CI et tests : épinglage par digest des images et actions (Renovate, [#205](https://github.com/mairie360/BFF_Elearning/pull/205)) ; Node.js 24.22.1 dans `Dockerfile`, `development.Dockerfile` et la CI, le conteneur de développement tournant sous l'utilisateur `node` ([#200](https://github.com/mairie360/BFF_Elearning/pull/200)) ; `mairie360/CICD` passé en v5.2.2 avec `ANTHROPIC_WORKSPACE_ID` transmis à la CI et à la promotion prod et un nouveau test jest (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207)) ; checklist RGPD sur les PR via `gdpr-pr.yml` et `zod` en 4.6.7 (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154)) ; test du marqueur RGPD dans les journaux et test sur les erreurs upstream, sans modification de `src/` (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150)) ; tests d'intégration newman sur la stack réelle et documentation (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199)).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Aucun changement de comportement pour les appelants : les routes, les réponses et les données sont inchangées. Les six commits touchent la CI, les images Docker, les tests et la documentation.
- Dépendances, CI et tests : épinglage par digest des images et actions (Renovate, [#205](https://github.com/mairie360/BFF_Elearning/pull/205)) ; Node.js 24.22.1 dans `Dockerfile`, `development.Dockerfile` et la CI, le conteneur de développement tournant sous l'utilisateur `node` ([#200](https://github.com/mairie360/BFF_Elearning/pull/200)) ; `mairie360/CICD` passé en v5.2.2 avec `ANTHROPIC_WORKSPACE_ID` transmis à la CI et à la promotion prod et un nouveau test jest (MAIR-771, [#207](https://github.com/mairie360/BFF_Elearning/pull/207)) ; checklist RGPD sur les PR via `gdpr-pr.yml` et `zod` en 4.6.7 (MAIR-295, [#154](https://github.com/mairie360/BFF_Elearning/pull/154)) ; test du marqueur RGPD dans les journaux et test sur les erreurs upstream, sans modification de `src/` (MAIR-290, [#150](https://github.com/mairie360/BFF_Elearning/pull/150)) ; tests d'intégration newman sur la stack réelle et documentation (MAIR-262, [#199](https://github.com/mairie360/BFF_Elearning/pull/199)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
