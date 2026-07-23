# Master Development Plan

## Phase 1.1 — Curriculum Engine Foundation

- Milestone 1: Curriculum Database Foundation — Implemented, validated where possible, not deployed
  - Additive Prisma schema extension for:
    - `BookEdition`, `BookUnit`, `BookModule`, `BookTopic`, `BookExercise`, `VideoLesson`
    - `CurriculumExerciseType` and `CurriculumDifficultyLevel` enums
  - Backward-compatible extension of chapter-centric legacy models with nullable curriculum references
  - Stable nullable `code` fields added to curriculum entities (database uniqueness deferred for nullable parent scopes except `BookEdition`)
  - Additive migration prepared:
    - `20260724000000_curriculum_engine_foundation`
  - No deployment executed in this milestone
- Milestone 2: Curriculum Service & Authorization Layer — Implemented, validated where possible, not deployed
  - Service boundaries established in [lib/curriculum/](/C:/Users/vikky/bluegate-platform/lib/curriculum)
  - Ownership-chain validation and cross-tenant/cross-book rejection enforced
  - Scoped stable-code collision checks added in service layer
  - Atomic mutation + success audit transactions plus denied-audit best-effort logging added
  - Chapter-first compatibility adapter retained via `getChapterWithCurriculum()`
  - No Milestone 3 API/UI exposure started
