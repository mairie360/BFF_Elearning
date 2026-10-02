# BFF_Elearning — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Servir le catalogue de formations, la progression et le profil d’apprentissage des agents. Le BFF expose un contrat commun au catalogue, au lecteur de contenus et aux fonctions d’administration des formations.

## Public et utilité

Les agents suivant des formations et les administrateurs gérant le catalogue.

Domaine fonctionnel: Formation en ligne.

## Fonctions disponibles

- Catalogue des formations auxquelles l’utilisateur est inscrit, avec filtres, informations de formation et progression lues dans l’API E-learning.
- Démarrage ou reprise d’une formation et validation de ses contenus (progression enregistrée par chapitre par l’API E-learning).
- Consultation du profil d’apprentissage et modification de l’e-mail et du téléphone (enregistrés par Core API).
- Pas encore disponible (réponse 501) : notation des formations, modification de l’adresse et de la ville, création, modification et suppression de formations par un administrateur. Aucun service amont ne les stocke et le BFF ne simule pas leur enregistrement.

## Parcours type

1. Valider la session auprès de BFF User et charger le catalogue.
2. Démarrer une formation, consulter son contenu et enregistrer la progression.
3. Retrouver la même progression depuis n’importe quelle instance et après redémarrage : elle est stockée par l’API E-learning.

## Place dans Mairie360

Dépôts associés: [Elearning_Web_Service](https://github.com/mairie360/Elearning_Web_Service).

Ce dépôt contient le serveur BFF et son contrat. Les web services associés portent les écrans; le BFF adapte les données et les règles serveur nécessaires à ces écrans.

## Données et état actuel

Le BFF ne conserve aucun état. Formations, chapitres (modules), contenus (pièces jointes), inscriptions et progression viennent de l’API E-learning ; l’identité de BFF User ; les modifications de profil sont écrites dans Core API.

## Périmètre et limites

Seules les formations auxquelles l’utilisateur est inscrit sont listées, et l’inscription est faite par un administrateur dans l’API E-learning. La progression est suivie par chapitre, pas par contenu. Notation, adresse/ville et administration des formations répondent 501 tant qu’aucun service amont ne les prend en charge.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
