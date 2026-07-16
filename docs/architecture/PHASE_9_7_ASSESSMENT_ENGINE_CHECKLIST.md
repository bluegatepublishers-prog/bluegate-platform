# Phase 9.7 — Bluegate Assessment Engine

Date: 2026-07-13

## Architecture and boundary

- [x] Assessment is formal measurement and permanent academic evidence; it does not reuse Practice attempts or immediate-feedback behavior.
- [x] Reuses Student Identity, current academic year, publisher/school isolation, annual book entitlement, approved question bank, and the existing premium entitlement engine.
- [x] Supports `CHAPTER`, `UNIT`, `TERM`, and `CUSTOM`; schema vocabulary reserves `SCHOOL`, `TEACHER`, and `BOARD` for future governed authoring.
- [x] Adds no AI grading, OpenAI call, proctoring, ranking, prediction, gap diagnosis, remedial decision, payment, parent, or tutor workflow.
- [x] Teacher/School creator UI, publication workflow, correction audit, and reassessment policy remain separately governed work.

## Assessment and question snapshots

- [x] `Assessment` stores canonical publisher, school, academic year, section, SectionSubject, book, optional chapter, creator, schedule, status, and timer.
- [x] `AssessmentQuestion` links an approved `BookQuestion` and stores the published text/options/answer/explanation/marks/competency/outcome snapshot.
- [x] Historical grading and display use the assessment snapshot rather than mutable current question-bank content.
- [x] Chapter assessments require every snapshot to belong to the selected chapter; other supported types may span chapters in the same entitled book.
- [x] Invalid, empty, unsupported, wrong-book, or malformed snapshots fail closed.

## Question types and grading

- [x] Exact auto-grading supports MCQ, True/False, Fill Blank, Match, and Multiple Select.
- [x] Short Answer, Long Answer, Case Based, Competency, and HOTS store the answer with `PENDING` review status.
- [x] Existing `VERY_SHORT`, `SHORT`, `LONG`, and `CASE_STUDY` question-bank names normalize to the approved assessment vocabulary.
- [x] Fill Blank uses trimmed, collapsed-space, case-insensitive equality only; there is no fuzzy matching.
- [x] Multiple Select compares exact normalized sets; Match requires a complete valid mapping.
- [x] Browser payloads never supply correctness, marks, answer keys, feedback, timer, result, student, tenant, or year authority.

## Attempts, autosave, and time

- [x] Starting resumes the current `IN_PROGRESS` attempt; a PostgreSQL partial unique index closes concurrent duplicate-start races.
- [x] `AssessmentSettings.maxAttempts` defaults to one while preserving a future multi-attempt/reassessment policy seam.
- [x] Attempt creation and response membership use one nested database write.
- [x] Autosave persists one response at a time and supports clearing an answer.
- [x] The responsive player shows one question at a time, a progress bar, large controls, save status, previous/next navigation, and explicit submission.
- [x] Timers may be untimed, 30, 45, 60, or bounded custom 1–300 minutes.
- [x] Server computes `expiresAt` as the earlier timer deadline or assessment due date and rechecks it on load, save, and submit.
- [x] Expiry submits the currently persisted answers; skipped questions remain skipped.

## Submission and permanent results

- [x] Finalization revalidates every stored response and recomputes deterministic grades server-side.
- [x] Attempt transition, normalized response grades, and `AssessmentResult` creation share one serializable transaction.
- [x] Results store total/awarded marks, percentage, time taken, correct, wrong, skipped, subjective pending, and provisional state.
- [x] Question snapshots retain competency, learning outcome, chapter, and book mappings; attempts retain academic year and canonical tenant scope for future factual reports.
- [x] Subjective responses create a provisional result and `PENDING_REVIEW` attempt; no score is invented for pending marks.
- [x] Attempts, responses, and results use restrictive/history-preserving foreign keys; no student deletion or routine cascade erases the academic record.

## Result controls

- [x] Settings persist `showScore`, `showCorrectAnswers`, `showExplanations`, and future `showSolutions` behavior.
- [x] Release timing supports Immediate, After Due Date, and Never.
- [x] Student result projection enforces each setting and always requires exact authenticated attempt ownership.
- [x] A held result reveals only a friendly availability message.
- [x] Solutions remain architecture-only because the current question bank has no distinct structured solution field.

## Entitlement and security

- [x] School Basic is denied.
- [x] School Premium, Individual Premium, and Mentor plans require the publisher `ASSESSMENTS` feature to be implemented and explicitly enabled.
- [x] Feature enablement never overrides plan denial; plan entitlement never overrides feature disablement.
- [x] Every list/start/resume/save/submit/result operation derives student, publisher, school, year, section, and ownership server-side.
- [x] The assessment must match the current section/SectionSubject and an annually adopted, centrally entitled book.
- [x] Attempt reads constrain student, publisher, school, and current academic year; copied foreign IDs fail closed.
- [x] Safe client views omit answer keys, explanations, competency/outcome metadata, tenant IDs, student IDs, adoption state, and Prisma errors before allowed result release.

## Automated coverage

- [x] Premium and publisher-feature combinations.
- [x] Wrong-tenant/owner/year/section query constraints and no browser-owned authority.
- [x] Duplicate active attempt prevention and resume behavior.
- [x] Server timer, due-date cap, expiry, and release timing.
- [x] Deterministic grading for all five objective formats.
- [x] Subjective pending review and provisional result calculation.
- [x] Correct/wrong/skipped/marks/percentage/time summary calculation.
- [x] Safe unanswered projection and result-setting enforcement.
- [x] Mobile one-question UI, autosave, resume, and no immediate answer feedback.
- [x] Additive migration, restrictive foreign keys, indexes, feature fail-closed behavior, and seed idempotency.
- [x] No AI/provider import or request in the Assessment Engine.

## Manual test checklist

- [ ] Apply all pending migrations only through the controlled release workflow in order; never reset production.
- [ ] Create disposable published Chapter, Unit, Term, and Custom assessments using approved same-book questions and settings.
- [ ] Explicitly enable `ASSESSMENTS` for one test publisher; verify another publisher remains disabled.
- [ ] Verify School Basic denial and all three premium plans with enabled/disabled publisher combinations.
- [ ] Try assessment and attempt IDs from another student, school, publisher, section, academic year, book, and chapter.
- [ ] Start the same assessment concurrently in two tabs and confirm one active attempt resumes.
- [ ] Answer each supported type, reload/disconnect, and confirm autosaved answers resume without answer-key exposure.
- [ ] Test untimed, 30, 45, 60, and custom timers; manipulate the browser clock/payload and confirm the server deadline wins.
- [ ] Let an attempt expire and confirm only persisted answers are submitted and unsaved/unanswered items are skipped.
- [ ] Submit with objective, subjective, mixed, and skipped responses; reconcile stored counts and marks to snapshots.
- [ ] Verify subjective responses remain pending human review and no AI/provider request occurs.
- [ ] Verify Immediate, After Due Date, and Never result release plus each score/answer/explanation visibility setting.
- [ ] Revoke premium, publisher feature, adoption, or enrollment mid-attempt and confirm further access fails closed.
- [ ] Inspect HTML/network payloads for answer keys, explanations, tenant IDs, competency/outcome tags, Prisma errors, or protected URLs.
- [ ] Complete keyboard-only, screen-reader, focus, touch-target, narrow-mobile, offline/resume, and poor-network testing.

## Deployment checklist

- [ ] Review `20260714000000_assessment_engine_foundation` after every previously pending migration.
- [ ] Confirm new enums/tables/indexes/partial unique constraint/restrictive foreign keys and `FeatureDefinition` upsert are additive.
- [ ] Confirm the migration does not create or enable a `PublisherFeature` and does not mutate historical Practice/AI records.
- [ ] Populate assessments only through a separately reviewed publication workflow that snapshots approved questions transactionally.
- [ ] Run Prisma format/validate/generate, TypeScript, tests, scoped lint, production build, diff check, and migration status.
- [ ] Reconcile a disposable objective result manually before releasing student traffic.
- [ ] Monitor safe error categories and timer submissions without logging answers, answer keys, student IDs, tenant IDs, or question content.

## Known limitations

Phase 9.7 supplies the student execution and permanent-record foundation, not the governed creator/reviewer portals. There is no teacher/school publication UI, subjective marking UI, correction audit, reassessment workflow, school/teacher/board assessment implementation, separate structured solution field, learning-outcome mapping UI, report dashboard, gap analysis, remedial workflow, proctoring, offline-first service worker, or formal accessibility certification. `showSolutions` is stored for future authoring support but returns no invented content. Historical rows are permanent by operational policy; a future legally reviewed correction/deletion process must be append-only or audited and must not silently rewrite academic evidence.
