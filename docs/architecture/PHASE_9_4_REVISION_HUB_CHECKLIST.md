# Phase 9.4 — Student Revision Hub

Date: 2026-07-13

## Architecture

- [x] Added `/student-dashboard/books/[bookId]/chapters/[chapterId]/revision` beneath the existing protected student book experience.
- [x] Revision content uses the existing knowledge-collector boundary and an exact approved structured-chapter query.
- [x] The page uses only stored chapter summary, keyword labels, learning outcomes, approved questions/answers, and approved activities.
- [x] No OpenAI/provider call, text generation, raw reviewed text, or extracted text is used.
- [x] Book reader links to approved chapter revision hubs; each hub links back to its book and subject.
- [x] No assignment, assessment, practice engine, AI tutor, gap analysis, mentor, parent, or payment capability was added.

## Honest content mapping

- [x] Summary uses only `BookChapter.summary`.
- [x] Key Points use only stored `ChapterLearningOutcome.outcome` values.
- [x] Keywords are trimmed, deduplicated, and alphabetized.
- [x] Keyword definitions remain explicitly unavailable because the current schema stores keyword labels but not definitions.
- [x] Quick Revision Cards use only approved `BookQuestion` rows with a stored `correctAnswer`.
- [x] Approved activities are displayed without reclassifying them as facts or tips.
- [x] Formulae, important dates, definitions, Remember boxes, common mistakes, and Did You Know facts show honest unavailable states because no typed source fields exist.
- [x] Mind map displays exactly “Mind Map Coming Soon” because no structured mind-map model exists.
- [x] No chapter prose is parsed, summarized, classified, or inferred.

## Security and access

- [x] Page and mutation entry points derive identity through `requireStudent()`.
- [x] Book authorization reuses `getStudentBook()`, which composes current enrollment, academic year, section subject, approved adoption, publisher ownership, and centralized Book entitlement.
- [x] The requested chapter must match both `chapterId` and the authorized `bookId`, be approved, and belong to a published book.
- [x] Direct foreign, wrong-book, wrong-publisher, wrong-year, and unauthorized IDs fail closed.
- [x] Revision Hub has no premium gate; School Basic and every stronger student plan inherit approved-book access.
- [x] Safe view models omit protected book URLs and raw chapter source text.

## Revision checklist and progress

- [x] Added additive `StudentRevisionProgress` scoped by student, chapter, and academic year.
- [x] Stores `summaryRead`, `keywordsRead`, `mindMapRead`, and `revisionCompleted` booleans only.
- [x] Checklist state is personal and explicitly not graded.
- [x] Browser submits only the four exact boolean states; extra fields and malformed values are rejected.
- [x] Student and academic year are derived server-side before authorization and upsert.
- [x] Prior-year rows are preserved through the year-scoped unique key.
- [x] Dashboard displays Revision Completed only when real, current-year completed records exist for currently entitled books.

## Mobile and accessibility

- [x] Content uses stacked cards and responsive grids rather than tables.
- [x] Keywords, revision cards, and activities use native disclosure controls.
- [x] Checklist controls have large targets, keyboard focus, checkbox semantics, live save status, and disabled in-flight state.
- [x] Typography, line height, and whitespace support long summaries on narrow screens.

## Automated checks

- [x] Exact chapter/book scope and approved-only collector behavior.
- [x] Wrong chapter, book, publisher, year, and unauthorized save denial.
- [x] Trusted student/year persistence and cross-student input rejection.
- [x] Checklist validation, load scope, save scope, and current-year dashboard scope.
- [x] Keyword ordering/deduplication and absence of invented definitions.
- [x] Honest empty structured categories and no generated summary fallback.
- [x] Additive, unique, non-destructive migration.

## Manual tests

- [ ] Apply pending migrations through the approved deployment workflow in order; do not reset the database.
- [ ] Sign in with School Basic and each stronger plan and confirm the same approved Revision Hub access.
- [ ] Open an entitled book, choose an approved chapter, and verify the back-to-book/subject path.
- [ ] Confirm the exact stored summary, outcomes, keywords, approved Q&A, and activities appear without added wording.
- [ ] Confirm chapters that lack structured content show honest empty states and “Mind Map Coming Soon.”
- [ ] Try copied chapter IDs from another book, publisher, section, and academic year; confirm safe denial.
- [ ] Toggle every checklist item, reload, and verify current-year state loads correctly.
- [ ] Verify one student's checklist never appears for another student.
- [ ] Complete a revision and confirm the dashboard shows the real Revision Completed card.
- [ ] Revoke the adoption and confirm both hub access and completed-dashboard links disappear.
- [ ] Test keyboard-only operation and narrow mobile widths.
- [ ] Inspect HTML/network payloads for raw reviewed/extracted chapter text, protected file URLs, or tenant detail.

## Deployment notes

- [ ] Review `20260713210000_student_revision_progress` after the already-pending Phase 9.2 migration.
- [ ] Apply migrations only through the controlled migration pipeline.
- [ ] Run Prisma generation, TypeScript, tests, lint, and production build in the release environment.
- [ ] Smoke-test entitled and denied student accounts with approved and unapproved chapters.
- [ ] Verify Admin chapter approval and question/activity approval data before enabling student traffic.
- [ ] Monitor generic revision save/404 failures without logging IDs, tenant facts, or chapter source text.

## Current structured-content limitation

The current knowledge schema has no typed definition, formula, important-date, mind-map, Remember, Exam Tip, Real Life, Did You Know, or common-mistake records. Phase 9.4 does not infer these categories from raw chapter text. Adding publisher-reviewed structured fields for those categories is a separate content-model decision and migration, not an AI-generation task.
