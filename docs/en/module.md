# BFF_Elearning — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Serve the training catalogue, progress and learning profile for staff. The BFF exposes a shared contract for the catalogue, content player and course administration features.

## Audience and value

Staff taking courses and administrators managing the catalogue.

Business domain: E-learning.

## Available capabilities

- Catalogue of the courses the user is enrolled in, with filters, course details and progress read from the E-learning API.
- Start or resume a course and complete its content (progress is saved per chapter by the E-learning API).
- Read the learning profile (read-only: a user edits their own profile in Settings).
- Course details of E-learning V2: category, level, mandatory flag and deadline, origin (mairie or platform), instructor, durations, number of learners and ratings.
- Rate a completed course, download its PDF attestation or the attestations of a year, and follow the training time of the year against the goal of the instance.
- Open a stored file (video, PDF, document, audio) through a short-lived signed URL.
- Administrators create, update and delete courses (links, quizzes and other contents without upload), remind the agents late on a mandatory course and read the indicators of the instance (participation, completion, per service, per course, late agents).

## Typical workflow

1. Read the profile from Core API and load the catalogue.
2. Start a course, view its content and record progress.
3. Find the same progress from any instance and after any restart: it is stored by the E-learning API.

## Role within Mairie360

Associated repositories: [Elearning_Web_Service](https://github.com/mairie360/Elearning_Web_Service).

This repository contains the BFF server and its contract. Associated web services own the screens; the BFF adapts data and server rules needed by those screens.

## Data and current state

The BFF keeps no state. Courses (formations), chapters (modules), contents (attachments), enrolments and progress come from the E-learning API; identity and roles from Core API (never from another BFF). It writes no profile: a user edits their own profile in Settings.

## Scope and limitations

Only enrolled courses are listed, and enrolment is done by an administrator in the E-learning API. Progress is tracked per chapter, not per content. A new content cannot be an uploaded file yet: courses are built from links, quizzes and other contents, stored files are kept as they are.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
