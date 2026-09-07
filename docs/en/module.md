# BFF_Elearning — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Serve the training catalogue, progress and learning profile for staff. The BFF exposes a shared contract for the catalogue, content player and course administration features.

## Audience and value

Staff taking courses and administrators managing the catalogue.

Business domain: E-learning.

## Available capabilities

- Catalogue with filters, course details and per-user progress.
- Start or resume a course, complete content and submit ratings.
- Read and edit the learning profile; administrator course creation, editing and deletion.

## Typical workflow

1. Validate the session with BFF User and load the catalogue.
2. Start a course, view its content and record progress.
3. Retrieve progress and ratings while the BFF process retains its state.

## Role within Mairie360

Associated repositories: [Elearning_Web_Service](https://github.com/mairie360/Elearning_Web_Service).

This repository contains the BFF server and its contract. Associated web services own the screens; the BFF adapts data and server rules needed by those screens.

## Data and current state

The initial catalogue is defined in `elearning_helpers.ts`. Course edits, progress, ratings and profile overrides are held in memory, including user-keyed maps. BFF User supplies identity. The included Elearning API client and diagnostics do not make this storage persistent.

## Scope and limitations

Restarting resets in-memory data; multiple instances do not share that state. Contract validation or an HTTP success does not prove durable storage in Elearning API.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
