# BFF_Elearning — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Serve the training catalogue, progress and learning profile for staff. The BFF exposes a shared contract for the catalogue, content player and course administration features.

## Audience and value

Staff taking courses and administrators managing the catalogue.

Business domain: E-learning.

## Available capabilities

- Catalogue of the courses the user is enrolled in, with filters, course details and progress read from the E-learning API.
- Start or resume a course and complete its content (progress is saved per chapter by the E-learning API).
- Read the learning profile and edit e-mail and phone (saved by Core API).
- Not available yet (answer 501): course ratings, address and city edits, administrator course creation, editing and deletion. No upstream service stores them, and the BFF does not fake their persistence.

## Typical workflow

1. Validate the session with BFF User and load the catalogue.
2. Start a course, view its content and record progress.
3. Find the same progress from any instance and after any restart: it is stored by the E-learning API.

## Role within Mairie360

Associated repositories: [Elearning_Web_Service](https://github.com/mairie360/Elearning_Web_Service).

This repository contains the BFF server and its contract. Associated web services own the screens; the BFF adapts data and server rules needed by those screens.

## Data and current state

The BFF keeps no state. Courses (formations), chapters (modules), contents (attachments), enrolments and progress come from the E-learning API; identity from BFF User; profile writes go to Core API.

## Scope and limitations

Only enrolled courses are listed, and enrolment is done by an administrator in the E-learning API. Progress is tracked per chapter, not per content. Ratings, address/city and course administration answer 501 until an upstream service supports them.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
