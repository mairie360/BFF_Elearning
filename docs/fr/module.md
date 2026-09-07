# BFF_Elearning — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Servir le catalogue de formations, la progression et le profil d’apprentissage des agents. Le BFF expose un contrat commun au catalogue, au lecteur de contenus et aux fonctions d’administration des formations.

## Public et utilité

Les agents suivant des formations et les administrateurs gérant le catalogue.

Domaine fonctionnel: Formation en ligne.

## Fonctions disponibles

- Catalogue avec filtres, informations de formation et progression par utilisateur.
- Démarrage ou reprise d’une formation, validation de contenu et notation.
- Consultation et modification du profil d’apprentissage; création, modification et suppression de formations administrateur.

## Parcours type

1. Valider la session auprès de BFF User et charger le catalogue.
2. Démarrer une formation, consulter son contenu et enregistrer la progression.
3. Retrouver la progression et les notes tant que le processus BFF conserve son état.

## Place dans Mairie360

Dépôts associés: [Elearning_Web_Service](https://github.com/mairie360/Elearning_Web_Service).

Ce dépôt contient le serveur BFF et son contrat. Les web services associés portent les écrans; le BFF adapte les données et les règles serveur nécessaires à ces écrans.

## Données et état actuel

Le catalogue initial est défini dans `elearning_helpers.ts`. Les formations modifiées, progressions, notes et surcharges de profil sont gérées en mémoire, notamment dans des Map indexées par utilisateur. BFF User fournit l’identité. Le client Elearning API et les diagnostics présents ne rendent pas ce stockage persistant.

## Périmètre et limites

Un redémarrage réinitialise les données en mémoire; plusieurs instances ne partagent pas cet état. La validation du contrat ou un succès HTTP ne prouve pas un enregistrement durable dans Elearning API.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
