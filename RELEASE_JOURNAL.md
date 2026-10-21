# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "95dccbab07beecd9880bb4c05bd41fd07b87a9aa", "updated": {"dev": "2026-10-21 09:48 UTC", "staging": "2026-10-21 09:55 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `95dccba` | 2026-10-21 09:55 UTC |
| dev | — | `95dccba` | 2026-10-21 09:48 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Télémétrie OpenTelemetry : les traces et les métriques HTTP du BFF sont exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` lorsque cette variable est définie ; sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. Les variables `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` et `OTEL_SDK_DISABLED` sont documentées. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat OpenAPI du BFF documente désormais une réponse `429` avec l'en-tête `Retry-After` sur plusieurs routes E-learning ; un client généré à partir du contrat doit gérer ce cas. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))
- Les paquets `@mairie360/core-api-openapi` et `@mairie360/elearning-api-openapi` passent à leurs versions publiées `2.2.0` et `1.2.0`, et les images des stacks de test sont alignées sur les versions prod de Core API, E-learning API et de la base (`database` / `liquibase-migrations` 3.3.0). (MAIR-612, [#196](https://github.com/mairie360/BFF_Elearning/pull/196))

#### Technique
- Promotion staging et prod séparée du workflow de base (MAIR-494) : un push sur `main` s'arrête après `release-dev`, et `promote-staging.yml` / `promote-prod.yml` se lancent à la main. Le workflow réutilisable CICD passe de v3.2.0 à v4.4.3 au fil des PR. ([#194](https://github.com/mairie360/BFF_Elearning/pull/194), [#196](https://github.com/mairie360/BFF_Elearning/pull/196))
- Mises à jour de dépendances et CI : `follow-redirects` 1.16.1 dans le lockfile, passage du journal des releases à CICD v4.3.x, transmission des secrets de release à l'étape dédiée, et Renovate qui suit les trois workflows. ([#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#194](https://github.com/mairie360/BFF_Elearning/pull/194))
- Le diff de la PR #180 est tronqué : les changements de `src/routes/Elearning/admin_courses.ts` et des tests associés n'ont pas pu être vérifiés en détail.

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Télémétrie OpenTelemetry : les traces et les métriques HTTP du BFF sont exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` lorsque cette variable est définie ; sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. Les variables `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` et `OTEL_SDK_DISABLED` sont documentées. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))

#### Changements de comportement
- Le contrat OpenAPI du BFF documente désormais une réponse `429` avec l'en-tête `Retry-After` sur plusieurs routes E-learning ; un client généré à partir du contrat doit gérer ce cas. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))
- Les paquets `@mairie360/core-api-openapi` et `@mairie360/elearning-api-openapi` passent à leurs versions publiées `2.2.0` et `1.2.0`, et les images des stacks de test sont alignées sur les versions prod de Core API, E-learning API et de la base (`database` / `liquibase-migrations` 3.3.0). (MAIR-612, [#196](https://github.com/mairie360/BFF_Elearning/pull/196))

#### Technique
- Promotion staging et prod séparée du workflow de base (MAIR-494) : un push sur `main` s'arrête après `release-dev`, et `promote-staging.yml` / `promote-prod.yml` se lancent à la main. Le workflow réutilisable CICD passe de v3.2.0 à v4.4.3 au fil des PR. ([#194](https://github.com/mairie360/BFF_Elearning/pull/194), [#196](https://github.com/mairie360/BFF_Elearning/pull/196))
- Mises à jour de dépendances et CI : `follow-redirects` 1.16.1 dans le lockfile, passage du journal des releases à CICD v4.3.x, transmission des secrets de release à l'étape dédiée, et Renovate qui suit les trois workflows. ([#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#194](https://github.com/mairie360/BFF_Elearning/pull/194))
- Le diff de la PR #180 est tronqué : les changements de `src/routes/Elearning/admin_courses.ts` et des tests associés n'ont pas pu être vérifiés en détail.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 09:55 UTC | staging | — | `95dccba` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39579957024) |
| 2026-10-21 09:48 UTC | dev | — | `95dccba` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39579180328) |
| 2026-10-21 01:38 UTC | dev | — | `206077b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39528018218) |
| 2026-10-20 18:12 UTC | staging | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 17:58 UTC | dev | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 13:09 UTC | dev | — | `15082e0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427601832) |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
