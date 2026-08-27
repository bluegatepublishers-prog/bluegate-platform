import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Prisma } from "@prisma/client";

import {
  buildCanonicalAssessmentReleaseSnapshot,
  type PreparedPublisherAssessmentInstantiation,
} from "../lib/smart-book-assessment-snapshot";
import { resolveManifestAssessmentExecution } from "../lib/smart-book-release-projection";
import type { SmartBookReleaseManifestV2 } from "../lib/smart-book-release-manifest";
import type {
  SmartBookProtectedQuestion,
  SmartBookProtectedReleasePayload,
} from "../lib/smart-book-release-protected";

const root = process.cwd();
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(path.join(root, "prisma/migrations/20260827170000_bind_assessment_to_smart_book_release_origin/migration.sql"), "utf8");
const service = readFileSync(path.join(root, "lib/smart-book-assessment.ts"), "utf8");
const snapshotService = readFileSync(path.join(root, "lib/smart-book-assessment-snapshot.ts"), "utf8");
const route = readFileSync(path.join(root, "app/api/teacher/smart-book/publisher-assessments/instantiate/route.ts"), "utf8");
const launcher = readFileSync(path.join(root, "components/content/v2/V2AssessmentLauncherVisual.tsx"), "utf8");
const overlay = readFileSync(path.join(root, "components/content/v2/V2PublisherAssessmentLauncherOverlay.tsx"), "utf8");

function release(input: {
  publisherId?: string;
  bookId?: string;
  assessmentId?: string;
  displayLabel?: string;
  questions?: Array<{ id: string; text: string; answer: string | null; explanation: string | null; marks: number; type?: string; options?: unknown }>;
} = {}) {
  const publisherId = input.publisherId ?? "publisher-1";
  const bookId = input.bookId ?? "book-1";
  const assessmentId = input.assessmentId ?? "assessment-template-1";
  const questionInputs = input.questions ?? [
    { id: "question-1", text: "Released question one", answer: "a", explanation: "Released explanation one", marks: 2, options: ["a", "b"] },
    { id: "question-2", text: "Released question two", answer: "true", explanation: "Released explanation two", marks: 1, type: "TRUE_FALSE", options: null },
  ];
  const questions: SmartBookProtectedQuestion[] = questionInputs.map((question, index) => ({
    sourceId: question.id,
    bookId,
    chapterId: "chapter-1",
    moduleId: null,
    exerciseId: null,
    exerciseGroupId: null,
    questionType: question.type ?? "MCQ",
    questionText: question.text,
    options: question.options === undefined ? ["a", "b"] : question.options,
    correctAnswer: question.answer,
    explanation: question.explanation,
    marks: question.marks,
    displayOrder: index,
    imageResourceId: null,
    sourceUpdatedAt: "2026-08-27T12:00:00.000Z",
  }));
  const safeAssessment = {
    sourceId: assessmentId,
    kind: "CHAPTER_TEST",
    displayLabel: input.displayLabel ?? "CHAPTER TEST",
    deliveryMode: "BOTH",
    instructions: "Use released instructions.",
    durationMinutes: 30,
    totalMarks: questions.reduce((sum, question) => sum + question.marks, 0),
    allowOnlineAttempt: true,
    allowPrint: true,
    chapterId: "chapter-1",
    moduleId: null,
    unitId: null,
    partId: null,
    chapterIds: [],
    sectionInstructions: [{ questionType: "MCQ", instruction: "Choose one." }],
    itemSourceIds: questions.map((_, index) => "assessment-item-" + (index + 1)),
    questionIds: questions.map((question) => question.sourceId),
    sourceUpdatedAt: "2026-08-27T12:00:00.000Z",
    releaseVersionId: null,
  };
  const manifest = {
    schemaVersion: 2,
    identity: { publisherId, bookId, targetType: "BOOK", targetId: bookId, sourceUpdatedAt: "2026-08-27T12:00:00.000Z" },
    book: { title: "Released Book", slug: "released-book", subtitle: null, edition: null },
    hierarchy: [{
      sourceId: "chapter-1", kind: "CHAPTER", parentSourceId: null, partSourceId: null, unitSourceId: null,
      chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Chapter 1", label: "Chapter 1",
      number: 1, displayOrder: 0, startPage: 1, endPage: 2, releaseVisible: true,
    }],
    contentDocument: {
      version: 4, canvas: { width: 100, height: 100 }, blocks: [], periods: [], layoutVersion: 2,
      pageLayout: { pages: [{ id: "page-1", order: 0, pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 1 }, frames: [] }] },
    },
    pdf: { bookPdfVersionId: "pdf-1", objectKey: "books/book-1/pdf.pdf", pageCount: 2, activatedAt: null },
    dependencies: [],
    assets: {
      resources: [], media: [], activities: [], worksheets: [], assessments: [safeAssessment],
      questions: questions.map((question) => ({
        sourceId: question.sourceId,
        questionType: question.questionType,
        questionText: question.questionText,
        options: question.options,
        marks: question.marks,
        displayOrder: question.displayOrder,
        imageResourceId: null,
      })),
    },
  } as unknown as SmartBookReleaseManifestV2;
  const protectedPayload: SmartBookProtectedReleasePayload = {
    schemaVersion: 1,
    questions: questions.map((question) => ({ ...question })),
    exercises: [],
    worksheets: [],
    assessments: [{
      sourceId: assessmentId,
      publisherId,
      bookId,
      kind: safeAssessment.kind,
      deliveryMode: safeAssessment.deliveryMode,
      instructions: safeAssessment.instructions,
      durationMinutes: safeAssessment.durationMinutes,
      totalMarks: safeAssessment.totalMarks,
      allowOnlineAttempt: safeAssessment.allowOnlineAttempt,
      allowPrint: safeAssessment.allowPrint,
      chapterId: safeAssessment.chapterId,
      moduleId: safeAssessment.moduleId,
      unitId: safeAssessment.unitId,
      partId: safeAssessment.partId,
      chapterIds: [...safeAssessment.chapterIds],
      sourceUpdatedAt: safeAssessment.sourceUpdatedAt,
      sectionInstructions: safeAssessment.sectionInstructions.map((item) => ({ ...item })),
      items: questions.map((question, index) => ({
        sourceId: safeAssessment.itemSourceIds[index]!,
        questionId: question.sourceId,
        position: index,
        question: { ...question },
      })),
    }],
  };
  return { manifest, protectedPayload };
}

function execute(value: ReturnType<typeof release>, overrides: Partial<{ publisherId: string; bookId: string; assessmentId: string }> = {}) {
  return resolveManifestAssessmentExecution({
    manifest: value.manifest,
    protectedPayload: value.protectedPayload,
    publisherId: overrides.publisherId ?? "publisher-1",
    bookId: overrides.bookId ?? "book-1",
    publisherAssessmentId: overrides.assessmentId ?? "assessment-template-1",
  });
}

function prepared(value: ReturnType<typeof release>, releaseVersionId: string): PreparedPublisherAssessmentInstantiation {
  const execution = execute(value);
  assert.ok(execution);
  return {
    publisherId: "publisher-1",
    schoolId: "school-1",
    academicYearId: "year-1",
    schoolClassId: "class-1",
    sectionId: "section-1",
    sectionSubjectId: "section-subject-1",
    bookId: "book-1",
    teachingPeriodId: "period-1",
    createdById: "teacher-user-1",
    contentReleaseVersionId: releaseVersionId,
    publisherAssessmentId: execution.assessment.sourceId,
    assessment: execution.assessment,
    questions: execution.questions,
  };
}

test("Assessment owns nullable immutable release and Publisher Assessment origin", () => {
  const assessment = schema.slice(schema.indexOf("model Assessment {"), schema.indexOf("model AssessmentSettings {"));
  assert.equal(assessment.includes("contentReleaseVersionId String?"), true);
  assert.equal(assessment.includes("publisherAssessmentId   String?"), true);
  assert.equal(assessment.includes("contentReleaseVersion   ContentReleaseVersion?"), true);
  assert.equal(assessment.includes("publisherAssessment     PublisherAssessment?"), true);
  assert.equal(assessment.includes("onDelete: Restrict, onUpdate: Cascade"), true);
  assert.equal(schema.includes("assessmentOrigins"), true);
  assert.equal(schema.includes("instantiatedAssessments Assessment[]"), true);
});

test("release-origin indexes and additive restrictive migration are exact", () => {
  assert.equal(schema.includes("@@index([contentReleaseVersionId, publisherAssessmentId, schoolId, academicYearId, sectionId, sectionSubjectId]"), true);
  assert.equal(schema.includes("@@index([publisherAssessmentId])"), true);
  assert.match(migration, /ADD COLUMN "contentReleaseVersionId" TEXT/u);
  assert.match(migration, /ADD COLUMN "publisherAssessmentId" TEXT/u);
  assert.match(migration, /Assessment_release_assessment_scope_idx/u);
  assert.match(migration, /Assessment_publisherAssessmentId_idx/u);
  assert.equal((migration.match(/ON DELETE RESTRICT ON UPDATE CASCADE/gu) ?? []).length, 2);
  assert.equal(["DROP TABLE", "DROP COLUMN", "DELETE FROM", "TRUNCATE TABLE", 'UPDATE "ASSESSMENT" SET'].some((token) => migration.toUpperCase().includes(token)), false);
});

test("ordinary Assessments retain null-compatible origins with no uniqueness constraint", () => {
  const assessment = schema.slice(schema.indexOf("model Assessment {"), schema.indexOf("model AssessmentSettings {"));
  assert.equal(assessment.includes("contentReleaseVersionId String?"), true);
  assert.equal(assessment.includes("@@unique([contentReleaseVersionId"), false);
});

test("released presentation and execution snapshots come from the same exact release", () => {
  const value = execute(release());
  assert.ok(value);
  assert.equal(value.assessment.title, "CHAPTER TEST");
  assert.deepEqual(value.questions.map((question) => question.questionText), ["Released question one", "Released question two"]);
  assert.deepEqual(value.questions.map((question) => question.correctAnswer), ["a", "true"]);
  assert.deepEqual(value.questions.map((question) => question.sequence), [1, 2]);
  assert.equal(value.assessment.totalMarks, 3);
});

test("N remains immutable and a new server-selected N+1 uses only N+1 snapshots", () => {
  const n = release({ displayLabel: "RELEASE N", questions: [{ id: "question-n", text: "Question N", answer: "x", explanation: "Explanation N", marks: 2, options: ["x", "y"] }] });
  const nPlusOne = release({ displayLabel: "RELEASE N PLUS ONE", questions: [{ id: "question-n1", text: "Question N+1", answer: "y", explanation: "Explanation N+1", marks: 4, options: ["x", "y"] }] });
  n.manifest.assets.assessments[0]!.sourceId = "assessment-template-1";
  nPlusOne.manifest.assets.assessments[0]!.sourceId = "assessment-template-1";
  const first = buildCanonicalAssessmentReleaseSnapshot(prepared(n, "release-version-n"));
  const second = buildCanonicalAssessmentReleaseSnapshot(prepared(nPlusOne, "release-version-n-plus-one"));
  assert.equal(first.assessment.contentReleaseVersionId, "release-version-n");
  assert.equal(first.assessment.title, "RELEASE N");
  assert.equal(first.questions[0]?.questionText, "Question N");
  assert.equal(first.questions[0]?.correctAnswer, "x");
  assert.equal(second.assessment.contentReleaseVersionId, "release-version-n-plus-one");
  assert.equal(second.assessment.title, "RELEASE N PLUS ONE");
  assert.equal(second.questions[0]?.questionText, "Question N+1");
  assert.equal(second.questions[0]?.correctAnswer, "y");
});

test("canonical AssessmentQuestion writes preserve every protected immutable field", () => {
  const snapshot = buildCanonicalAssessmentReleaseSnapshot(prepared(release(), "release-version-n"));
  assert.equal(snapshot.assessment.publisherAssessmentId, "assessment-template-1");
  assert.equal(snapshot.assessment.status, "DRAFT");
  assert.deepEqual(snapshot.questions.map((question) => ({
    id: question.questionId,
    text: question.questionText,
    options: question.options,
    answer: question.correctAnswer,
    explanation: question.explanation,
    marks: question.marks,
    sequence: question.sequence,
  })), [
    { id: "question-1", text: "Released question one", options: ["a", "b"], answer: "a", explanation: "Released explanation one", marks: 2, sequence: 1 },
    { id: "question-2", text: "Released question two", options: Prisma.JsonNull, answer: "true", explanation: "Released explanation two", marks: 1, sequence: 2 },
  ]);
});

test("safe/protected identity, configuration, item order, and embedded question mismatches fail closed", () => {
  const config = release();
  config.protectedPayload.assessments[0]!.durationMinutes = 31;
  assert.equal(execute(config), null);
  const order = release();
  order.protectedPayload.assessments[0]!.items.reverse();
  assert.equal(execute(order), null);
  const embedded = release();
  embedded.protectedPayload.assessments[0]!.items[0]!.question.correctAnswer = "b";
  assert.equal(execute(embedded), null);
  const safeQuestion = release();
  safeQuestion.manifest.assets.questions[0]!.questionText = "Tampered safe question";
  assert.equal(execute(safeQuestion), null);
});

test("raw or foreign Publisher Assessment, Book, and Publisher identities fail closed", () => {
  const value = release();
  assert.equal(execute(value, { assessmentId: "foreign-assessment" }), null);
  assert.equal(execute(value, { bookId: "book-2" }), null);
  assert.equal(execute(value, { publisherId: "publisher-2" }), null);
  const embeddedForeignBook = release();
  embeddedForeignBook.protectedPayload.assessments[0]!.items[0]!.question.bookId = "book-2";
  assert.equal(execute(embeddedForeignBook), null);
});

test("invalid or incomplete released questions cannot create a canonical snapshot", () => {
  const invalidMarks = prepared(release(), "release-version-n");
  invalidMarks.assessment.totalMarks += 1;
  assert.throws(() => buildCanonicalAssessmentReleaseSnapshot(invalidMarks));
  const invalidOrder = prepared(release(), "release-version-n");
  invalidOrder.questions[1]!.sequence = 7;
  assert.throws(() => buildCanonicalAssessmentReleaseSnapshot(invalidOrder));
});

test("service selects the current release server-side and authorizes Teacher scope before use", () => {
  assert.match(service, /requireTeacherSubject/u);
  assert.match(service, /bookAdoptions/u);
  assert.match(service, /resolvePublishedSmartBookContent/u);
  assert.match(service, /resolveAuthorizedTeachingPeriod/u);
  assert.match(service, /isPublisherFeatureEnabled/u);
  assert.match(service, /resolveManifestAssessmentExecution/u);
});

test("browser release and question overrides are rejected", () => {
  for (const key of ["contentReleaseVersionId", "releaseId", "releaseVersionId", "versionNumber", "questionId", "questionIds"]) {
    assert.match(route, new RegExp('"' + key + '"'));
  }
  assert.doesNotMatch(route, /resolveSmartBookContentReleaseVersion/u);
  assert.doesNotMatch(overlay, /contentReleaseVersionId|releaseVersionId|versionNumber|questionIds/u);
});

test("creation is atomic, release-N guarded, and transaction-level idempotent", () => {
  const creation = service.slice(service.indexOf("export async function createCanonicalAssessmentFromPreparedRelease"), service.indexOf("function normalizeInput"));
  assert.equal(creation.includes("prisma.$transaction"), true);
  assert.equal(creation.includes("pg_advisory_xact_lock"), true);
  assert.equal(creation.includes("contentReleaseVersion.findFirst"), true);
  assert.equal(creation.includes("id: prepared.contentReleaseVersionId"), true);
  assert.equal(creation.includes("assessment.findFirst"), true);
  assert.equal(creation.includes("assessment.create"), true);
  assert.equal(creation.includes("assessmentQuestion.createMany"), true);
  assert.doesNotMatch(creation, /publisherAssessment.(find|findFirst|findMany|findUnique)/u);
  assert.doesNotMatch(creation, /bookQuestion.(find|findFirst|findMany|findUnique)/u);
});

test("instantiation creates a reviewable draft and does not auto-publish or create attempts", () => {
  assert.equal(snapshotService.includes("status: AssessmentStatus.DRAFT"), true);
  assert.doesNotMatch(service, /AssessmentStatus.(ACTIVE|SCHEDULED)/u);
  assert.doesNotMatch(service, /assessmentAttempt.(create|createMany)/u);
  assert.match(overlay, /Review assessment in Question Builder/u);
});

test("Student launcher remains fail-closed while class-scoped Teacher launcher is enabled", () => {
  assert.match(launcher, /mode === "TEACHER"/u);
  assert.match(launcher, /teacherInstantiationContext/u);
  assert.match(overlay, /mode === "STUDENT"/u);
  assert.match(overlay, /No student attempt has been created/u);
  assert.equal(overlay.includes("/api/student/assessment"), false);
});

test("protected assessment answer/config changes alter future release checksums", () => {
  const first = release();
  const second = release();
  second.protectedPayload.assessments[0]!.items[0]!.question.correctAnswer = "b";
  const checksum = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  assert.notEqual(checksum(first.protectedPayload), checksum(second.protectedPayload));
});
