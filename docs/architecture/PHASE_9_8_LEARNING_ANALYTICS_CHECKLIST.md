# Phase 9.8 — Learning Analytics & Reporting Engine

## Status

Implemented in the working tree on 2026-07-13. Migration created but not applied. REPORTS is marked implemented and remains disabled for Bluegate until explicitly enabled after deployment and backfill review.

## Architecture decisions

- [x] Analytics and reports are separate: successful learning mutations update stored aggregates; report pages only read aggregate and timeline tables.
- [x] Student, subject, chapter, competency, learning-outcome, academic-year, teacher, school, and publisher dimensions are represented.
- [x] Student records remain academic-year scoped so promotion never overwrites history.
- [x] Timeline events are idempotent and chronological.
- [x] Reading/revision/practice/assessment/Student AI hooks execute in the same transaction as their successful source mutation.
- [x] AI analytics store intent, count, timestamp, and optional duration only. Prompts and answers are excluded.
- [x] Teacher aggregation uses active teacher assignments and assigned sections only.
- [x] Reports remain publisher-feature gated; student reports also use the existing Premium REPORTS entitlement.
- [x] No recommendation, diagnosis, benchmarking, or predictive claim is generated.

## Storage

- [x] `StudentAnalytics`
- [x] `StudentSubjectAnalytics`
- [x] `StudentChapterAnalytics`
- [x] `StudentSkillAnalytics`
- [x] `TeacherAnalytics`
- [x] `SchoolAnalytics`
- [x] `PublisherAnalytics`
- [x] `LearningTimeline`
- [x] Additive migration with restrictive foreign keys and scope indexes.
- [x] Migration does not create or enable any `PublisherFeature` row.

## Metrics and semantics

- [x] Books started/completed and pages read.
- [x] Reading/revision/practice/assessment completion and averages.
- [x] AI sessions/requests without conversation content.
- [x] Known study duration, current/longest streak, and last activity.
- [x] Subject and chapter completion.
- [x] Competency and learning-outcome scored facts prepared for Phase 9.9.
- [x] School and publisher participation/adoption totals.

`pagesRead` is the sum of the latest page reached per started book, not a claim that every preceding page was viewed. Study duration includes only source events with reliable server timestamps (currently submitted practice and assessments). Percentages use the stored started-record population as denominator; zero denominators produce zero, not invented coverage.

## Reports and UI

- [x] Student report: cards, progress bars, chapter completion, timeline, heatmap placeholder.
- [x] Teacher report: assigned learner participation and subject aggregates.
- [x] School report: school/year totals and averages.
- [x] Publisher report: current-year tenant totals and averages.
- [x] No external chart dependency.
- [x] Empty, Basic-plan locked, and publisher-feature-disabled states.

## Verification

- [x] Prisma schema formatting and client generation.
- [x] TypeScript no-emit check.
- [x] Full automated tests (256/256), changed-file lint, and production build.
- [ ] Migration deployment and controlled historical backfill (deployment responsibility; not performed in this phase task).

## Historical backfill and rollback

The runtime aggregator incorporates a student's preserved year history as new idempotent timeline events arrive. A deployment should run a controlled backfill before enabling REPORTS if pre-deployment history must be immediately visible for every inactive student. No automatic backfill is hidden in a page request or migration.

Rollback is operationally safe: disable the publisher REPORTS feature first, then roll back application code. Additive analytics tables can remain for audit/history; source learning records are not modified or deleted by report reads.
