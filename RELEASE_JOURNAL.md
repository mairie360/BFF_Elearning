# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "55dfd4b4cb34e881c243d79394b807631879eca2", "updated": {"dev": "2026-10-21 09:48 UTC", "staging": "2026-10-20 18:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `55dfd4b` | 2026-10-20 18:12 UTC |
| dev | — | `95dccba` | 2026-10-21 09:48 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte désormais les traces et les métriques HTTP en OpenTelemetry (OTLP) vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais une URL, une query string, un en-tête ou un identifiant. Se configure via `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` et `OTEL_SDK_DISABLED`. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))
#### Changements de comportement
- Le contrat OpenAPI annonce désormais une réponse `429` (avec `Retry-After`) sur plusieurs routes E-learning, quand l'API amont atteint sa limite de débit. Les appelants doivent prévoir ce code. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))
#### Technique
- Contrats amont épinglés sur les versions prod : `@mairie360/core-api-openapi` 2.2.0 et `@mairie360/elearning-api-openapi` 1.2.0, images des stacks de test alignées (core-api 2.2.0, elearning-api 1.2.0, database et liquibase-migrations 3.3.0). (MAIR-612, [#196](https://github.com/mairie360/BFF_Elearning/pull/196))
- CI : `cicd.yml` passe sur mairie360/CICD v4.4.3 et ne se déclenche sur `push` que pour `main`. Ajout des workflows manuels `promote-staging.yml` et `promote-prod.yml`, `follow-redirects` 1.16.1 pour `npm audit`, et les secrets de release (ANTHROPIC_API_KEY, RELEASE_APP_ID, RELEASE_APP_PK) transmis au workflow. (MAIR-494, MAIR-571, [#194](https://github.com/mairie360/BFF_Elearning/pull/194), [#183](https://github.com/mairie360/BFF_Elearning/pull/183))
- Mises à jour Renovate de mairie360/CICD (v4.2.2 à v4.3.2) et pins des contrats et images de test intermédiaires (MAIR-575, MAIR-600). (#181, #184, #185, #187, #188, #190)

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Contrats amont épinglés sur les versions prod : `@mairie360/core-api-openapi` 2.2.0 et `@mairie360/elearning-api-openapi` 1.2.0, images des stacks de test alignées (core-api 2.2.0, elearning-api 1.2.0, database et liquibase-migrations 3.3.0). (MAIR-612, [#196](https://github.com/mairie360/BFF_Elearning/pull/196))
- CI : `cicd.yml` sur mairie360/CICD v4.4.3, déclenché par `push` sur `main` uniquement. Ajout des workflows manuels `promote-staging.yml` et `promote-prod.yml`, Renovate couvre les trois fichiers, et `follow-redirects` 1.16.1 corrige les advisories bloquant `npm audit`. (MAIR-494, [#194](https://github.com/mairie360/BFF_Elearning/pull/194))

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Le BFF exporte désormais les traces et les métriques HTTP en OpenTelemetry (OTLP) vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))
#### Changements de comportement
- Le contrat OpenAPI annonce désormais une réponse `429` (avec `Retry-After`) sur plusieurs routes E-learning, quand l'API amont atteint sa limite de débit. Les appelants doivent prévoir ce code. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))
#### Technique
- Contrats amont passés sur les builds staging (`@mairie360/core-api-openapi` `0.0.0-staging.b900797`, image core-api `staging-b900797`), puis sur les versions publiées 2.1.0 et 1.1.0. (MAIR-575, MAIR-600, [#187](https://github.com/mairie360/BFF_Elearning/pull/187), [#190](https://github.com/mairie360/BFF_Elearning/pull/190))
- CI : mises à jour Renovate de mairie360/CICD (v4.2.2 à v4.3.2), transmission des secrets de release dans `cicd.yml` et ajout de la promotion staging et prod (MAIR-494, MAIR-571). (#181, #183, #184, #185, #188, #194)

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 09:48 UTC | dev | — | `95dccba` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39579180328) |
| 2026-10-21 01:38 UTC | dev | — | `206077b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39528018218) |
| 2026-10-20 18:12 UTC | staging | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 17:58 UTC | dev | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 13:09 UTC | dev | — | `15082e0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427601832) |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
