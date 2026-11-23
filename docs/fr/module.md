# BFF_Elearning — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Servir le catalogue de formations, la progression et le profil d’apprentissage des agents. Le BFF expose un contrat commun au catalogue, au lecteur de contenus et aux fonctions d’administration des formations.

## Public et utilité

Les agents suivant des formations et les administrateurs gérant le catalogue.

Domaine fonctionnel: Formation en ligne.

## Fonctions disponibles

- Catalogue des formations auxquelles l’utilisateur est inscrit, avec filtres, informations de formation et progression lues dans l’API E-learning.
- Démarrage ou reprise d’une formation et validation de ses contenus (progression enregistrée par chapitre par l’API E-learning).
- Consultation du profil d’apprentissage (lecture seule : un utilisateur modifie son profil dans Paramètres).
- Informations de formation de l’E-learning V2 : catégorie, niveau, caractère obligatoire et échéance, origine (mairie ou plateforme), formateur, durées, nombre d’inscrits et notes.
- Noter une formation terminée, télécharger son attestation PDF ou les attestations d’une année, et suivre le temps de formation de l’année par rapport à l’objectif de l’instance.
- Ouvrir un fichier stocké (vidéo, PDF, document, audio) par une URL signée de courte durée.
- Les administrateurs créent, modifient et suppriment des formations (liens, quiz et autres contenus sans envoi de fichier), relancent les agents en retard sur une formation obligatoire et consultent les indicateurs de l’instance (participation, complétion, par service, par formation, agents en retard).

## Parcours type

1. Lire le profil auprès de Core API et charger le catalogue.
2. Démarrer une formation, consulter son contenu et enregistrer la progression.
3. Retrouver la même progression depuis n’importe quelle instance et après redémarrage : elle est stockée par l’API E-learning.

## Place dans Mairie360

Dépôts associés: [Elearning_Web_Service](https://github.com/mairie360/Elearning_Web_Service).

Ce dépôt contient le serveur BFF et son contrat. Les web services associés portent les écrans; le BFF adapte les données et les règles serveur nécessaires à ces écrans.

## Données et état actuel

Le BFF ne conserve aucun état. Formations, chapitres (modules), contenus (pièces jointes), inscriptions et progression viennent de l’API E-learning ; l’identité et les rôles de Core API (jamais d’un autre BFF). Il n’écrit aucun profil : un utilisateur modifie son profil dans Paramètres.

## Périmètre et limites

Seules les formations auxquelles l’utilisateur est inscrit sont listées, et l’inscription est faite par un administrateur dans l’API E-learning. La progression est suivie par chapitre, pas par contenu. Un nouveau contenu ne peut pas encore être un fichier envoyé : les formations se composent de liens, de quiz et d’autres contenus, les fichiers stockés sont conservés tels quels.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
