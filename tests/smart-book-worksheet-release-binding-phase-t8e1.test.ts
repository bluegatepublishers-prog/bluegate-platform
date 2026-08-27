
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { resolveManifestWorksheetExecution } from "../lib/smart-book-release-projection";
import type { SmartBookReleaseManifestV2 } from "../lib/smart-book-release-manifest";
import type {
  SmartBookProtectedQuestion,
  SmartBookProtectedReleasePayload,
} from "../lib/smart-book-release-protected";

const root = process.cwd();
const worksheetService = readFileSync(path.join(root, "lib/student-worksheet.ts"), "utf8");
const runtime = readFileSync(path.join(root, "lib/smart-book-release-runtime.ts"), "utf8");
const launcherRoute = readFileSync(path.join(root, "app/api/student/worksheets/launcher/route.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  path.join(
    root,
    "prisma/migrations/20260827120000_bind_smart_book_worksheet_attempt_to_release/migration.sql",
  ),
  "utf8",
);

function release(input: {
  title?: string;
  questionText?: string;
  correctAnswer?: string;
  publisherId?: string;
  bookId?: string;
  worksheetId?: string;
  questionId?: string;
} = {}) {
  const publisherId = input.publisherId ?? "publisher-1";
  const bookId = input.bookId ?? "book-1";
  const worksheetId = input.worksheetId ?? "worksheet-1";
  const questionId = input.questionId ?? "question-1";
  const question: SmartBookProtectedQuestion = {
    sourceId: questionId,
    bookId,
    chapterId: "chapter-1",
    moduleId: null,
    exerciseId: null,
    exerciseGroupId: null,
    questionType: "MCQ",
    questionText: input.questionText ?? "Released question",
    options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
    correctAnswer: input.correctAnswer ?? "a",
    explanation: "Released explanation",
    marks: 2,
    displayOrder: 0,
    imageResourceId: null,
    sourceUpdatedAt: "2026-08-27T00:00:00.000Z",
  };
  const manifest = {
    schemaVersion: 2,
    identity: { publisherId, bookId, targetType: "BOOK", targetId: bookId, sourceUpdatedAt: "2026-08-27T00:00:00.000Z" },
    book: { title: "Released Book", slug: "released-book", subtitle: null, edition: null },
    hierarchy: [{
      sourceId: "chapter-1",
      kind: "CHAPTER",
      parentSourceId: null,
      partSourceId: null,
      unitSourceId: null,
      chapterSourceId: null,
      moduleSourceId: null,
      topicSourceId: null,
      title: "Chapter 1",
      label: "Chapter 1",
      number: 1,
      displayOrder: 0,
      startPage: 1,
      endPage: 2,
      releaseVisible: true,
    }],
    contentDocument: {
      version: 4,
      canvas: { width: 100, height: 100 },
      blocks: [],
      periods: [],
      layoutVersion: 2,
      pageLayout: { pages: [{ id: "page-1", order: 0, pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 1 }, frames: [] }] },
    } as never,
    pdf: { bookPdfVersionId: "pdf-1", objectKey: "books/book-1/pdf.pdf", pageCount: 2, activatedAt: null },
    dependencies: [],
    assets: {
      resources: [],
      media: [],
      activities: [],
      worksheets: [{
        sourceId: worksheetId,
        title: input.title ?? "Released worksheet",
        type: "CLASSROOM",
        instructions: "Released instructions",
        estimatedMinutes: 10,
        difficulty: "EASY",
        audience: "BOTH",
        totalMarks: 2,
        allowOnlineAttempt: true,
        allowPrint: true,
        runtimeExerciseId: null,
        questionIds: [questionId],
        printableResourceId: null,
        supportingResourceIds: [],
      }],
      assessments: [],
      questions: [{
        sourceId: questionId,
        questionType: "MCQ",
        questionText: question.questionText,
        options: question.options as never,
        marks: question.marks,
        displayOrder: question.displayOrder,
        imageResourceId: null,
      }],
    },
  } as unknown as SmartBookReleaseManifestV2;
  const protectedPayload: SmartBookProtectedReleasePayload = {
    schemaVersion: 1,
    questions: [question],
    exercises: [],
    worksheets: [{
      sourceId: worksheetId,
      publisherId,
      bookId,
      chapterId: "chapter-1",
      moduleId: null,
      exerciseId: null,
      title: input.title ?? "Released worksheet",
      type: "CLASSROOM",
      instructions: "Released instructions",
      totalMarks: 2,
      allowOnlineAttempt: true,
      allowPrint: true,
      showAnswersAfterSubmit: true,
      sourceUpdatedAt: "2026-08-27T00:00:00.000Z",
      questionIds: [questionId],
      printableResourceId: null,
      answerKeyResourceId: "answer-key-secret",
      answerKeyStorage: { kind: "OBJECT_KEY", value: "private/answer-key.pdf" },
      supportingResourceIds: [],
    }],
    assessments: [],
  };
  return { manifest, protectedPayload };
}

function execute(value: ReturnType<typeof release>, worksheetId = "worksheet-1") {
  return resolveManifestWorksheetExecution({
    manifest: value.manifest,
    protectedPayload: value.protectedPayload,
    publisherId: "publisher-1",
    bookId: "book-1",
    worksheetId,
  });
}

test("StudentWorksheetAttempt is the canonical persisted worksheet lifecycle owner", () => {
  const attempt = schema.slice(schema.indexOf("model StudentWorksheetAttempt {"), schema.indexOf("model StudentWorksheetResponse {"));
  assert.match(attempt, /status\s+StudentWorksheetAttemptStatus/u);
  assert.match(attempt, /responses\s+StudentWorksheetResponse\[\]/u);
  assert.match(worksheetService, /startStudentWorksheetAttempt/u);
  assert.match(worksheetService, /saveStudentWorksheetResponse/u);
  assert.match(worksheetService, /submitStudentWorksheetAttempt/u);
});

test("release binding relation is nullable, indexed, restrictive, and additive", () => {
  const attempt = schema.slice(schema.indexOf("model StudentWorksheetAttempt {"), schema.indexOf("model StudentWorksheetResponse {"));
  assert.match(attempt, /contentReleaseVersionId\s+String\?/u);
  assert.match(attempt, /contentReleaseVersion\s+ContentReleaseVersion\?/u);
  assert.match(attempt, /@@index\(\[contentReleaseVersionId\]\)/u);
  assert.match(schema, /worksheetAttempts\s+StudentWorksheetAttempt\[\]/u);
  assert.match(attempt, /onDelete: Restrict/u);
  assert.match(migration, /ADD COLUMN "contentReleaseVersionId" TEXT/u);
  assert.match(migration, /CREATE INDEX "StudentWorksheetAttempt_contentReleaseVersionId_idx"/u);
  assert.match(migration, /ADD CONSTRAINT "StudentWorksheetAttempt_contentReleaseVersionId_fkey"/u);
  assert.doesNotMatch(migration, /\\bDROP\\s+(TABLE|COLUMN|TYPE)\\b|\\bDELETE\\s+FROM\\b|\\bTRUNCATE\\s+TABLE\\b|\\bUPDATE\\s+"StudentWorksheetAttempt"/iu);
});

test("new Smart Book attempts store the server-selected release and ignore browser release selection", () => {
  assert.match(worksheetService, /contentReleaseVersionId: scope\.releaseVersionId/u);
  assert.match(worksheetService, /showAnswersAfterSubmit: scope\.worksheet\.showAnswersAfterSubmit/u);
  assert.match(worksheetService, /resolvePublishedSmartBookContent/u);
  assert.doesNotMatch(launcherRoute, /releaseVersionId/u);
  assert.doesNotMatch(launcherRoute, /bookId/u);
});

test("release worksheet presentation and grading are resolved from the same immutable release", () => {
  const value = execute(release({ title: "Release N", questionText: "Question A", correctAnswer: "a" }));
  assert.ok(value);
  assert.equal(value.worksheet.title, "Release N");
  assert.equal(value.questions[0]?.question.questionText, "Question A");
  assert.equal(value.questions[0]?.question.correctAnswer, "a");
  assert.equal(value.worksheet.showAnswersAfterSubmit, true);
  assert.equal(value.questions[0]?.position, 1);
});

test("Release N remains stable while a new release and mutable source change", () => {
  const releaseN = execute(release({ title: "Release N", questionText: "Question A", correctAnswer: "a" }));
  const releaseNPlusOne = execute(release({ title: "Release N+1", questionText: "Question B", correctAnswer: "b" }));
  assert.equal(releaseN?.worksheet.title, "Release N");
  assert.equal(releaseN?.questions[0]?.question.questionText, "Question A");
  assert.equal(releaseN?.questions[0]?.question.correctAnswer, "a");
  assert.equal(releaseNPlusOne?.worksheet.title, "Release N+1");
  assert.equal(releaseNPlusOne?.questions[0]?.question.questionText, "Question B");
  assert.equal(releaseNPlusOne?.questions[0]?.question.correctAnswer, "b");
});

test("new attempt resolution uses N+1 only when the server resolves N+1", () => {
  const current = execute(release({ title: "Release N+1", questionText: "Question B", correctAnswer: "b" }));
  assert.equal(current?.worksheet.title, "Release N+1");
  assert.equal(current?.questions[0]?.question.correctAnswer, "b");
  assert.match(worksheetService, /resolveSmartBookContentReleaseVersion/u);
  assert.match(runtime, /id: input\.releaseVersionId/u);
});

test("safe and protected worksheet state must agree exactly", () => {
  const value = release();
  value.protectedPayload.worksheets[0]!.title = "Mutable mismatch";
  assert.equal(execute(value), null);
  const questionMismatch = release();
  questionMismatch.protectedPayload.worksheets[0]!.questionIds = ["foreign-question"];
  assert.equal(execute(questionMismatch), null);
});

test("raw worksheet and question IDs cannot bypass the bound release", () => {
  const value = release();
  assert.equal(execute(value, "foreign-worksheet"), null);
  value.manifest.assets.worksheets[0]!.questionIds = ["foreign-question"];
  assert.equal(execute(value), null);
});

test("cross-publisher, cross-book, and foreign-question release lineage fails closed", () => {
  const foreignPublisher = release({ publisherId: "publisher-2" });
  assert.equal(execute(foreignPublisher), null);
  const foreignBook = release({ bookId: "book-2" });
  assert.equal(execute(foreignBook), null);
  const foreignQuestion = release();
  foreignQuestion.protectedPayload.questions[0]!.bookId = "book-2";
  assert.equal(execute(foreignQuestion), null);
});

test("safe presentation contains no answer key or protected explanation", () => {
  const value = execute(release());
  assert.ok(value);
  const safe = JSON.stringify({
    worksheet: value.worksheet,
    questions: value.questions.map((item) => ({
      questionId: item.question.id,
      question: item.question.questionText,
      options: item.question.options,
    })),
  });
  assert.doesNotMatch(safe, /correctAnswer|answer-key-secret|private\/answer-key\.pdf|Released explanation/u);
});

test("missing or malformed release-bound attempts fail closed with a student-safe message", () => {
  assert.match(worksheetService, /This worksheet attempt is unavailable\./u);
  assert.match(worksheetService, /if \(attempt\.contentReleaseVersionId\)/u);
  assert.match(runtime, /parseStoredSmartBookReleaseManifest/u);
  assert.match(runtime, /catch \{/u);
});

test("existing attempt reload uses persisted release version rather than current release", () => {
  assert.match(worksheetService, /resolveSmartBookContentReleaseVersion\(\{/u);
  assert.match(worksheetService, /releaseVersionId: attempt\.contentReleaseVersionId/u);
  assert.doesNotMatch(
    worksheetService.slice(
      worksheetService.indexOf("if (attempt.contentReleaseVersionId)"),
      worksheetService.indexOf("if (await hasPublishedSmartBookRelease"),
    ),
    /publisherWorksheet\.(find|findFirst|findMany|findUnique)|bookQuestion\.(find|findFirst|findMany|findUnique)/u,
  );
});

test("attempt operational state stays live and is not copied into release snapshots", () => {
  assert.match(schema, /responses\s+StudentWorksheetResponse\[\]/u);
  assert.match(worksheetService, /status: StudentWorksheetAttemptStatus\.SUBMITTED/u);
  assert.match(worksheetService, /submittedAt: now/u);
  assert.match(worksheetService, /marksAwarded: summary\.marksAwarded/u);
  assert.doesNotMatch(worksheetService, /snapshot:.*marksAwarded/u);
});

test("answer writes and submission remain atomic and student-scoped", () => {
  assert.match(worksheetService, /prisma\.\$transaction\(async \(tx\)/u);
  assert.match(worksheetService, /studentId: scope\.identity\.student\.id/u);
  assert.match(worksheetService, /status: StudentWorksheetAttemptStatus\.IN_PROGRESS/u);
  assert.match(worksheetService, /studentWorksheetResponse\.upsert/u);
});

test("live authorization remains required for a release-bound attempt", () => {
  assert.match(worksheetService, /await requireStudent\(\)/u);
  assert.match(worksheetService, /await getStudentBook\(attempt\.bookId\)/u);
  assert.match(worksheetService, /hasPublishedSmartBookRelease/u);
});

test("no V1 or mutable fallback is introduced for Smart Book execution", () => {
  assert.doesNotMatch(runtime, /LEGACY_V1|schemaVersion\s*===\s*1/u);
  const bound = worksheetService.slice(
    worksheetService.indexOf("if (attempt.contentReleaseVersionId)"),
    worksheetService.indexOf("if (await hasPublishedSmartBookRelease"),
  );
  assert.doesNotMatch(bound, /publisherWorksheet\.(find|findFirst|findMany|findUnique)|bookQuestion\.(find|findFirst|findMany|findUnique)/u);
});
