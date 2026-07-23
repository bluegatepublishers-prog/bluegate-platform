# Phase 1.1 Milestone 1 — Curriculum Database Foundation

## Status

- Implemented in codebase.
- Not deployed.
- Migration created but not applied in this milestone.

## Implemented hierarchy (additive)

- Publisher -> Book -> BookEdition -> BookUnit -> BookChapter -> BookModule -> BookTopic -> BookExercise -> BookQuestion
- VideoLesson is added as a curriculum-linked media entity anchored to `publisherId` and `bookId`.

## Compatibility boundary

- `BookChapter` remains the canonical compatibility boundary.
- Existing `chapterId` requirements were preserved on chapter-centric legacy models:
  - `BookQuestion.chapterId`
  - `ChapterLearningOutcome.chapterId`
  - `ChapterActivity.chapterId`
  - existing student practice/revision/assessment flows remain chapter-scoped.
- New foreign keys on legacy models are nullable to avoid breaking existing data paths.

## New models

- `BookEdition`
- `BookUnit`
- `BookModule`
- `BookTopic`
- `BookExercise`
- `VideoLesson`
- Enum: `CurriculumExerciseType`
- Enum: `CurriculumDifficultyLevel` (`BEGINNER`, `EASY`, `MEDIUM`, `HARD`, `ADVANCED`)

## Existing models changed (additive only)

- `Publisher`: added `videoLessons`
- `Book`: added `editions`, `units`, `modules`, `topics`, `exercises`, `videoLessons`
- `BookChapter`: added nullable `unitId`, `editionId` and relations to module/topic/exercise/video/resource scaffolding
- `BookQuestion`: added nullable `exerciseId`, `moduleId`, `topicId`
- `BookExercise`: `difficulty` changed to nullable `CurriculumDifficultyLevel`; added nullable `code`
- `BookTopic`: `keywords` stored as `String[] @default([])`; added nullable `code`
- `BookEdition`: preserves nullable `code` and adds scoped uniqueness `@@unique([bookId, code])`
- `BookUnit`: added nullable `code`
- `BookModule`: added nullable `code`
- `ChapterLearningOutcome`: added nullable `moduleId`, `topicId`
- `ChapterActivity`: added nullable `moduleId`, `topicId`, `exerciseId`
- `Resource`: added nullable curriculum references (`editionId`, `unitId`, `chapterId`, `moduleId`, `topicId`, `exerciseId`)

## Stable curriculum code strategy

- Nullable stable `code` fields were added to curriculum entities to support durable references independent of title/order.
- `BookEdition` enforces scoped uniqueness in the database via `@@unique([bookId, code])`.
- For `BookUnit`, `BookModule`, `BookTopic`, and `BookExercise`, parent+code indexes were added for lookup/performance, but strict scoped uniqueness is deferred to the service layer in a follow-up milestone.
- Reason for deferral: parent scope includes nullable links (especially `editionId` and optional topic linkage), and PostgreSQL nullable unique behavior can permit duplicate null-scoped values that would be misleading as a hard guarantee at this stage.

## Deletion rules implemented

- Book-owned new curriculum entities use conservative ownership links with explicit foreign-key actions.
- Optional curriculum references on legacy models use `SetNull`.
- `BookQuestion.exerciseId` uses `SetNull`.
- Required parent chains for newly introduced required links use `Restrict` where child existence must block deletion.
- No cascade path was introduced from curriculum entities into student attempts, assessment history, AI conversations, or audit events.

## Tenant isolation strategy

- New curriculum entities are anchored by required `bookId` where applicable.
- `VideoLesson` also keeps required `publisherId` for direct tenant filtering.
- Existing publisher ownership guard patterns remain unchanged.

## Migration

- Migration: `20260724000000_curriculum_engine_foundation`
- Additive-only SQL:
  - Creates enums and new tables
  - Adds nullable columns to existing tables
  - Adds indexes and foreign keys
  - No drop/rename/destructive data rewrite
  - `BookTopic.keywords` is created as `TEXT[] DEFAULT ARRAY[]::TEXT[]`
  - `BookExercise.difficulty` is created as nullable `CurriculumDifficultyLevel`

## Deferred intentionally

- Curriculum Explorer UI
- Dual-write/backfill workflows
- Production migration deployment
- Video upload/playback UI
- API/UI exposure for new curriculum entities

## Milestone 2 — Curriculum Service and Authorization Layer

- Service layer added in [lib/curriculum/](/C:/Users/vikky/bluegate-platform/lib/curriculum) with business-logic-only boundaries:
  - `edition.service.ts`, `unit.service.ts`, `module.service.ts`, `topic.service.ts`, `exercise.service.ts`, `video-lesson.service.ts`, `chapter.service.ts`, `validation.service.ts`, `audit.ts`
- Ownership-chain rules enforce publisher -> book -> curriculum node verification for all mutations and hierarchy validators.
- Scoped code enforcement is implemented in service layer for non-null codes:
  - Edition: unique within book
  - Unit: unique within edition, or within edition-less units for a book
  - Module: unique within chapter
  - Topic: unique within module
  - Exercise: unique in narrowest scope (topic, else module, else chapter)
- Archive/restore semantics:
  - Archive requires active-entity validation.
  - Restore validates ownership with `allowArchived` on target entity while still enforcing parent-chain ownership.
- Error contracts:
  - Expected domain failures return `CurriculumValidationError` with structured codes (`CROSS_PUBLISHER_SCOPE`, `CROSS_BOOK_SCOPE`, `INVALID_PARENT_CHAIN`, `PARENT_ARCHIVED`, `DUPLICATE_CODE`, etc.).
  - Generic `Error` is not used for expected validation paths.
- Audit atomicity:
  - Successful create/update/archive/restore writes use one Prisma transaction for mutation + success audit.
  - Denied attempts are captured by best-effort denied-audit logging outside mutation transactions.
- Compatibility adapter:
  - `getChapterWithCurriculum()` preserves chapter-first reads while projecting modules/topics/exercises.
- Milestone 3 deferred:
  - No new public API routes, UI pages, navigation exposure, or deployment workflow in this phase.
- Migration status remains unchanged: `20260724000000_curriculum_engine_foundation` is still unapplied.

## Validation snapshot

Commands run for this milestone:

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `git diff --check`

Additional inspection:

- `git status --short`
- `git diff --stat`
- `git diff -- prisma/schema.prisma`
- `git diff -- prisma/migrations`
- `git diff -- tests`
