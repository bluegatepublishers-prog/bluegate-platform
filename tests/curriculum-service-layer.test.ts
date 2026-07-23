import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CurriculumValidationError,
  normalizeCurriculumCode,
  type CurriculumValidationLoaders,
  validateBookOwnership,
  validateChapterBelongsToUnit,
  validateEditionBelongsToBook,
  validateExerciseBelongsToTopic,
  validateModuleBelongsToChapter,
  validateQuestionBelongsToExercise,
  validateTopicBelongsToModule,
  validateUnitBelongsToBook,
  validateVideoLessonBelongsToBook,
} from "../lib/curriculum/validation.service";

const actor = { userId: "admin-1", publisherId: "publisher-1" };

function makeLoaders(overrides: Partial<Record<keyof CurriculumValidationLoaders, unknown>> = {}): CurriculumValidationLoaders {
  const base: CurriculumValidationLoaders = {
    loadBook: async () => ({ id: "book-1", publisherId: "publisher-1", published: true }),
    loadEdition: async () => ({ id: "edition-1", bookId: "book-1", published: true, archived: false }),
    loadUnit: async () => ({ id: "unit-1", bookId: "book-1", editionId: "edition-1", published: true, archived: false }),
    loadChapter: async () => ({ id: "chapter-1", bookId: "book-1", unitId: "unit-1", editionId: "edition-1" }),
    loadModule: async () => ({ id: "module-1", bookId: "book-1", chapterId: "chapter-1", unitId: "unit-1", published: true, archived: false }),
    loadTopic: async () => ({ id: "topic-1", bookId: "book-1", chapterId: "chapter-1", moduleId: "module-1", published: true, archived: false }),
    loadExercise: async () => ({
      id: "exercise-1",
      bookId: "book-1",
      chapterId: "chapter-1",
      moduleId: "module-1",
      topicId: "topic-1",
      published: true,
      archived: false,
    }),
    loadQuestion: async () => ({ id: "question-1", bookId: "book-1", chapterId: "chapter-1", exerciseId: "exercise-1" }),
    loadVideoLesson: async () => ({
      id: "lesson-1",
      publisherId: "publisher-1",
      bookId: "book-1",
      editionId: "edition-1",
      unitId: "unit-1",
      chapterId: "chapter-1",
      moduleId: "module-1",
      topicId: "topic-1",
      exerciseId: "exercise-1",
      published: true,
      archived: false,
    }),
  };
  return { ...base, ...overrides } as CurriculumValidationLoaders;
}

test("same-publisher valid hierarchy create chain succeeds", async () => {
  const loaders = makeLoaders();
  await assert.doesNotReject(async () => {
    await validateBookOwnership({ actor, bookId: "book-1" }, loaders);
    await validateEditionBelongsToBook({ actor, bookId: "book-1", editionId: "edition-1" }, loaders);
    await validateUnitBelongsToBook({ actor, bookId: "book-1", unitId: "unit-1", editionId: "edition-1" }, loaders);
    await validateChapterBelongsToUnit({ actor, bookId: "book-1", chapterId: "chapter-1", unitId: "unit-1" }, loaders);
    await validateModuleBelongsToChapter({ actor, bookId: "book-1", chapterId: "chapter-1", moduleId: "module-1" }, loaders);
    await validateTopicBelongsToModule({ actor, bookId: "book-1", chapterId: "chapter-1", moduleId: "module-1", topicId: "topic-1" }, loaders);
    await validateExerciseBelongsToTopic({
      actor,
      bookId: "book-1",
      chapterId: "chapter-1",
      moduleId: "module-1",
      topicId: "topic-1",
      exerciseId: "exercise-1",
    }, loaders);
  });
});

test("cross-publisher book is rejected", async () => {
  const loaders = makeLoaders({ loadBook: async () => ({ id: "book-1", publisherId: "publisher-2", published: true }) });
  await assert.rejects(
    validateBookOwnership({ actor, bookId: "book-1" }, loaders),
    (error) => error instanceof CurriculumValidationError && error.code === "CROSS_PUBLISHER_SCOPE",
  );
});

test("cross-book unit/chapter combination is rejected", async () => {
  const loaders = makeLoaders({
    loadChapter: async () => ({ id: "chapter-1", bookId: "book-1", unitId: "unit-2", editionId: "edition-1" }),
    loadUnit: async () => ({ id: "unit-1", bookId: "book-1", editionId: "edition-1", published: true, archived: false }),
  });
  await assert.rejects(
    validateChapterBelongsToUnit({ actor, bookId: "book-1", chapterId: "chapter-1", unitId: "unit-1" }, loaders),
    (error) => error instanceof CurriculumValidationError && error.code === "INVALID_PARENT_CHAIN",
  );
});

test("cross-chapter module/topic combination is rejected", async () => {
  const loaders = makeLoaders({
    loadTopic: async () => ({ id: "topic-1", bookId: "book-1", chapterId: "chapter-2", moduleId: "module-1", published: true, archived: false }),
  });
  await assert.rejects(
    validateTopicBelongsToModule({ actor, bookId: "book-1", chapterId: "chapter-1", moduleId: "module-1", topicId: "topic-1" }, loaders),
    (error) => error instanceof CurriculumValidationError && error.code === "INVALID_PARENT_CHAIN",
  );
});

test("archived required parent is rejected and restore path may opt-in with allowArchived", async () => {
  const loaders = makeLoaders({
    loadUnit: async () => ({ id: "unit-1", bookId: "book-1", editionId: "edition-1", published: true, archived: true }),
  });
  await assert.rejects(
    validateUnitBelongsToBook({ actor, bookId: "book-1", unitId: "unit-1" }, loaders),
    (error) => error instanceof CurriculumValidationError && error.code === "PARENT_ARCHIVED",
  );
  await assert.doesNotReject(
    validateUnitBelongsToBook({ actor, bookId: "book-1", unitId: "unit-1", allowArchived: true }, loaders),
  );
});

test("conflicting optional parent chain is rejected for exercise validator", async () => {
  const loaders = makeLoaders({
    loadExercise: async () => ({
      id: "exercise-1",
      bookId: "book-1",
      chapterId: "chapter-1",
      moduleId: "module-1",
      topicId: "topic-2",
      published: true,
      archived: false,
    }),
  });
  await assert.rejects(
    validateExerciseBelongsToTopic({
      actor,
      bookId: "book-1",
      chapterId: "chapter-1",
      moduleId: "module-1",
      topicId: "topic-1",
      exerciseId: "exercise-1",
    }, loaders),
    (error) => error instanceof CurriculumValidationError && error.code === "INVALID_PARENT_CHAIN",
  );
});

test("video lesson ownership rejects cross-publisher references", async () => {
  const loaders = makeLoaders({
    loadVideoLesson: async () => ({
      id: "lesson-1",
      publisherId: "publisher-2",
      bookId: "book-1",
      editionId: null,
      unitId: null,
      chapterId: null,
      moduleId: null,
      topicId: null,
      exerciseId: null,
      published: true,
      archived: false,
    }),
  });
  await assert.rejects(
    validateVideoLessonBelongsToBook({ actor, bookId: "book-1", videoLessonId: "lesson-1" }, loaders),
    (error) => error instanceof CurriculumValidationError && error.code === "CROSS_PUBLISHER_SCOPE",
  );
});

test("normalizeCurriculumCode preserves values and trims empty codes to null", () => {
  assert.equal(normalizeCurriculumCode("  ABC-101 "), "ABC-101");
  assert.equal(normalizeCurriculumCode("   "), null);
  assert.equal(normalizeCurriculumCode(null), null);
});

test("service layer enforces stable-code scoped collision checks", () => {
  const edition = readFileSync("lib/curriculum/edition.service.ts", "utf8");
  const unit = readFileSync("lib/curriculum/unit.service.ts", "utf8");
  const moduleService = readFileSync("lib/curriculum/module.service.ts", "utf8");
  const topic = readFileSync("lib/curriculum/topic.service.ts", "utf8");
  const exercise = readFileSync("lib/curriculum/exercise.service.ts", "utf8");

  assert.match(edition, /DUPLICATE_CODE/);
  assert.match(edition, /bookEdition\.findFirst/);
  assert.match(unit, /editionId: null/);
  assert.match(unit, /Unit code already exists among edition-less units in this book/);
  assert.match(moduleService, /chapterId: input\.chapterId/);
  assert.match(topic, /moduleId: input\.moduleId/);
  assert.match(exercise, /input\.topicId[\s\S]*\{\s*topicId:\s*input\.topicId,\s*code:\s*input\.code\s*\}/);
});

test("curriculum mutations remain transaction atomic with success audit write", () => {
  const files = [
    "lib/curriculum/edition.service.ts",
    "lib/curriculum/unit.service.ts",
    "lib/curriculum/module.service.ts",
    "lib/curriculum/topic.service.ts",
    "lib/curriculum/exercise.service.ts",
    "lib/curriculum/video-lesson.service.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /runCurriculumMutationWithDeniedAudit/);
    assert.match(source, /prisma\.\$transaction\(async \(tx\)/);
    assert.match(source, /writeCurriculumAuditEvent\(tx,/);
  }
});

test("denied audit helper is wired for validation failures", () => {
  const source = readFileSync("lib/curriculum/audit.ts", "utf8");
  assert.match(source, /recordTrustedDeniedAudit/);
  assert.match(source, /reasonCodeFromValidationError/);
  assert.match(source, /runCurriculumMutationWithDeniedAudit/);
});

test("chapter compatibility adapter still projects chapter with nested curriculum tree", () => {
  const source = readFileSync("lib/curriculum/chapter.service.ts", "utf8");
  assert.match(source, /export async function getChapterWithCurriculum/);
  assert.match(source, /modules:/);
  assert.match(source, /topics:/);
  assert.match(source, /exercises:/);
  assert.match(source, /chapter:/);
});

test("existing chapter workflows remain present for backward compatibility", async () => {
  const source = readFileSync("app/admin/books/[id]/knowledge-actions.ts", "utf8");
  assert.match(source, /export async function saveChapter/);
  assert.match(source, /export async function saveQuestion/);
  await assert.doesNotReject(async () => {
    await validateQuestionBelongsToExercise({
      actor,
      bookId: "book-1",
      chapterId: "chapter-1",
      exerciseId: "exercise-1",
      questionId: "question-1",
    }, makeLoaders());
  });
});
