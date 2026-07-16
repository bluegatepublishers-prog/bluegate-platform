# Phase 9.5 — Student Practice Engine

Date: 2026-07-13

## Architecture and scope

- [x] Added chapter practice beneath the protected student book/revision journey.
- [x] Reused `BookQuestion`; no parallel or duplicated question bank was introduced.
- [x] Uses approved structured content only and makes no OpenAI or other provider request.
- [x] Excludes formal examinations, assignments, gap analysis, remedials, adaptive selection, rankings, tutor review, parent reporting, and payment logic.
- [x] Recorded ADR-022: automatic practice is limited to validated deterministic machine-gradable types.

## Entitlement rules

- [x] Every entry point derives the active student, enrollment, academic year, school, and publisher on the server.
- [x] Book access reuses annual adoption and centralized student book entitlement.
- [x] Practice additionally requires the publisher `INTERACTIVE_QUIZZES` module and the matching premium entitlement.
- [x] `SCHOOL_BASIC` sees a locked card and cannot start or use an attempt.
- [x] `SCHOOL_PREMIUM`, `INDIVIDUAL_PREMIUM`, and `INDIVIDUAL_PREMIUM_MENTOR` may use Practice only while both entitlement gates remain enabled.
- [x] Publisher feature absence/disablement fails closed; the migration does not grant it to publishers.

## Supported question types and selection

- [x] Supports `MCQ`, `TRUE_FALSE`, and `FILL_BLANK` only.
- [x] MCQ requires at least two unique string options and a correct answer matching one option.
- [x] True/False requires an explicit true/false answer.
- [x] Fill blank uses trimmed, collapsed-space, case-insensitive exact comparison only.
- [x] Subjective, malformed, unapproved, wrong-book, and wrong-chapter questions are excluded.
- [x] Selection is server-side and deterministic by creation time and ID, defaults to five, and is capped at 20.
- [x] The browser cannot nominate the authoritative question set.

## Answer safety and grading

- [x] Initial and unanswered question views contain only ID, sequence, text, type, safe options, and marks.
- [x] Correct answers, explanations, approval fields, review metadata, tenant IDs, and full records are omitted before answer submission.
- [x] Each answer is shape-validated and graded on the server from the current approved question.
- [x] Correctness and awarded marks are server-calculated; browser values are ignored.
- [x] Approved correct answer and explanation are returned only for the question just answered.
- [x] Duplicate/concurrent answer writes are guarded by a conditional transactional update.

## Attempt lifecycle

- [x] One `IN_PROGRESS` attempt is allowed per student, academic year, and chapter.
- [x] Starting while one exists resumes it; a partial unique index also closes concurrent-start races.
- [x] Attempt creation and response placeholders are transactional.
- [x] Every response refers to an existing question; answer keys are not copied to response rows.
- [x] Final submission requires all questions to be answered.
- [x] Counts, marks, percentage, status, and submission time are recomputed and stored transactionally.
- [x] `SUBMITTED` attempts reject later answer mutation.
- [x] Retry is available after submission and creates a new attempt while preserving history.

## Result and integration behavior

- [x] Revision Hub shows locked, empty, start, continue, or retry state from real authorization and attempt records.
- [x] Attempt UI presents one question at a time with progress, selected state, previous/next controls, immediate feedback, and explicit final confirmation.
- [x] Result shows book/chapter, attempted/correct totals, percentage, encouraging copy, answered-question review, approved answers/explanations, retry, and return navigation.
- [x] No ranking, predicted mark, comparison, diagnosis, or invented analytics is shown.

## Security

- [x] Operations require the authenticated active `STUDENT` role and current enrollment.
- [x] Publisher, school, section, subject, academic-year adoption, book, and chapter scope are recomputed through centralized helpers.
- [x] Publisher module and effective premium feature entitlement are revalidated for start, answer, submit, load, and result operations.
- [x] Attempts are queried by server-derived student and academic year, not route ownership claims.
- [x] Answer mutation verifies `IN_PROGRESS`, response membership, and unanswered state.
- [x] Result access requires owner, current year, reauthorized content scope, and `SUBMITTED` status.
- [x] API failures return generic friendly messages without IDs, Prisma errors, entitlement reasons, or tenant facts.

## Mobile and accessibility review

- [x] Uses stacked responsive cards and no wide table.
- [x] Answer controls have large targets, visible selected/focus states, radio semantics, and keyboard-operable native buttons/input.
- [x] Progress and errors use readable text; save feedback uses a live region.
- [x] Final submission has a clear irreversible-action confirmation.
- [ ] Complete keyboard-only, screen-reader, and narrow-device manual testing before release; no formal compliance claim is made.

## Automated coverage

- [x] Plan and publisher-feature entitlement behavior.
- [x] Exact book/chapter/approval/type selection, malformed structures, deterministic limit, and safe no-answer views.
- [x] MCQ, True/False, fill-blank, invalid answer, server marks, and score calculation.
- [x] Active-attempt resume, ownership/year scope, response membership, immutability, incomplete submission, and safe result review.
- [x] Additive migration, indexes/foreign keys, and enum migration transaction safety.

## Manual test checklist

- [ ] Apply pending migrations only through the approved release workflow; never reset the database.
- [ ] Explicitly enable `INTERACTIVE_QUIZZES` for a test publisher and verify disabling it immediately denies all practice operations.
- [ ] Verify School Basic sees “Practice is available with Premium” and cannot bypass it with direct API/route calls.
- [ ] Verify each premium plan can start only an adopted, approved current-year book chapter.
- [ ] Test copied book, chapter, attempt, response, and question IDs from another student, year, school, or publisher.
- [ ] Confirm an eligible chapter with no supported approved questions shows the honest empty state.
- [ ] Submit correct and incorrect answers for every supported type and compare feedback to publisher-approved content.
- [ ] Inspect initial HTML/network payloads and confirm no unanswered correct answer or explanation is present.
- [ ] Reload midway, confirm the active attempt resumes, and verify already-answered questions remain read-only.
- [ ] Attempt concurrent start and duplicate answer requests; confirm only one active attempt/answer persists.
- [ ] Confirm incomplete final submission is rejected, complete submission is immutable, and retry preserves the earlier result.
- [ ] Revoke adoption or premium access mid-attempt and confirm subsequent access fails closed.
- [ ] Complete keyboard-only, screen-reader, focus, and narrow-mobile review.

## Deployment checklist

- [ ] Review and apply `20260713230000_add_interactive_quizzes_feature_key` before `20260713231000_student_practice_engine_foundation`.
- [ ] Apply both only after all earlier pending migrations, through the controlled migration pipeline.
- [ ] Do not combine the PostgreSQL enum addition and its first table/data use in one transaction.
- [ ] Configure publisher-level `INTERACTIVE_QUIZZES` availability explicitly; migration defaults to no publisher grant.
- [ ] Run Prisma format/validate/generate, TypeScript, tests, scoped lint, production build, and migration status in release.
- [ ] Smoke-test entitled, basic, disabled-feature, revoked-adoption, foreign-ID, and no-question states.
- [ ] Monitor generic start/answer/submit failures without logging answer keys, student answers, raw IDs, or tenant details.

## Future handling

Subjective questions remain excluded from automatic practice. A future phase may add student self-practice or an explicit teacher-review workflow without AI grading. Learning-gap analysis may later consume immutable submitted-attempt facts, but Phase 9.5 creates no diagnosis, recommendation, or remedial record and makes no adaptive decision.
