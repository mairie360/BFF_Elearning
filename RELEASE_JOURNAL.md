# Journal des releases — BFF_Elearning

<!-- release-journal-state {"dev": "206077b198bee36429e5a241df43911740957630", "prod": "34ef96d835c61e57b5d5020cb62275f20331a794", "prod_tag": "v1.0.0", "staging": "55dfd4b4cb34e881c243d79394b807631879eca2", "updated": {"dev": "2026-10-21 01:38 UTC", "staging": "2026-10-20 18:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `34ef96d` | — |
| staging | — | `55dfd4b` | 2026-10-20 18:12 UTC |
| dev | — | `206077b` | 2026-10-21 01:38 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Télémétrie OpenTelemetry : les traces et les métriques HTTP du BFF sont exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` quand cette variable est définie. Sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))
- Les opérations E-learning documentent désormais une réponse `429` (`ErrorResponse`) avec l'en-tête `Retry-After` pour indiquer quand réessayer lorsqu'une API amont limite les requêtes. Le diff ne modifie que le contrat (`contracts/openapi.json`, `contracts/bff.d.ts`) ; le code qui produit cette réponse n'apparaît pas dans le diff. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Promotion staging et prod séparée du workflow de base : `promote-staging.yml` et `promote-prod.yml` sont ajoutés, et `cicd.yml` passe à CICD v4.4.0. (MAIR-494, [#194](https://github.com/mairie360/BFF_Elearning/pull/194))
- Les paquets `@mairie360/core-api-openapi` et `@mairie360/elearning-api-openapi` pointent sur des builds dev ou staging (`0.0.0-staging.b900797`, `0.0.0-dev-e3ffc1c`) et non plus sur les versions prod `2.1.0` et `1.1.0` introduites par MAIR-568. À vérifier avant la prochaine promotion en prod. (MAIR-575, [#187](https://github.com/mairie360/BFF_Elearning/pull/187) ; MAIR-600, [#190](https://github.com/mairie360/BFF_Elearning/pull/190))
- CICD est passé de v4.2.2 à v4.3.2 via Renovate, et les secrets de la release-journal (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`) sont transmis à CICD. (MAIR-571, [#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#188](https://github.com/mairie360/BFF_Elearning/pull/188))
- `follow-redirects` passe en 1.16.1 dans le lockfile pour débloquer `npm audit`. (MAIR-494, [#194](https://github.com/mairie360/BFF_Elearning/pull/194))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Un push sur `main` ne dépasse plus `release-dev`. Staging et prod ne sont plus déployés automatiquement : il faut lancer `promote-staging.yml` puis `promote-prod.yml` avec `gh workflow run ... -R mairie360/BFF_Elearning` (ou `-f sha=SHA`), chacun avec l'approbation de son environnement. (MAIR-494, [#194](https://github.com/mairie360/BFF_Elearning/pull/194))

#### Technique
- `follow-redirects` passe en 1.16.1 dans le lockfile pour débloquer `npm audit` (GHSA-q3jh-wrc6-jgq8, GHSA-8r9p-f939-6h3c). (MAIR-494, [#194](https://github.com/mairie360/BFF_Elearning/pull/194))
- Renovate regroupe les mises à jour de `cicd_version` sur `cicd.yml`, `promote-staging.yml` et `promote-prod.yml`. Documentation et CLAUDE.md mis à jour. (MAIR-494, [#194](https://github.com/mairie360/BFF_Elearning/pull/194))

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Télémétrie OpenTelemetry : les traces et les métriques HTTP du BFF sont exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` quand cette variable est définie. Sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF. (MAIR-504, [#156](https://github.com/mairie360/BFF_Elearning/pull/156))
- Les opérations E-learning documentent désormais une réponse `429` (`ErrorResponse`) avec l'en-tête `Retry-After` lorsqu'une API amont limite les requêtes. Le diff ne modifie que le contrat ; le code qui produit cette réponse n'apparaît pas dans le diff. (MAIR-568, [#180](https://github.com/mairie360/BFF_Elearning/pull/180))

#### Technique
- Les pins de test (`docker-compose*.yml`) et de contrats passent sur des builds dev puis staging (`core-api` `staging-b900797`, `elearning-api` `dev-e3ffc1c`), et `@mairie360/core-api-openapi` pointe sur `0.0.0-staging.b900797`. (MAIR-575, [#187](https://github.com/mairie360/BFF_Elearning/pull/187) ; MAIR-600, [#190](https://github.com/mairie360/BFF_Elearning/pull/190))
- CICD passe de v4.2.2 à v4.4.0 via v4.3.0, v4.3.1 et v4.3.2, avec la release-journal (MAIR-571) et le transfert des secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK`. (MAIR-571, [#183](https://github.com/mairie360/BFF_Elearning/pull/183), [#184](https://github.com/mairie360/BFF_Elearning/pull/184), [#185](https://github.com/mairie360/BFF_Elearning/pull/185), [#188](https://github.com/mairie360/BFF_Elearning/pull/188), [#181](https://github.com/mairie360/BFF_Elearning/pull/181))
- Le workflow `cicd.yml` passe à CICD v4.4.0 et les workflows de promotion staging et prod sont ajoutés. (MAIR-494, [#194](https://github.com/mairie360/BFF_Elearning/pull/194))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 01:38 UTC | dev | — | `206077b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39528018218) |
| 2026-10-20 18:12 UTC | staging | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 17:58 UTC | dev | — | `55dfd4b` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39470096379) |
| 2026-10-20 13:09 UTC | dev | — | `15082e0` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427601832) |
| 2026-10-20 13:07 UTC | dev | — | `3e66295` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39427335821) |
| 2026-10-19 20:14 UTC | dev | — | `a7d4ce6` | [run](https://github.com/mairie360/BFF_Elearning/actions/runs/39316597859) |
<!-- release-journal-history:end -->
