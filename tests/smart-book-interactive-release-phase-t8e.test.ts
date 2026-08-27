import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";

import { gradePracticeAnswer, getPracticeFeedbackAnswer, type PracticeQuestionCandidate } from "@/lib/student-practice-policy";
import {
  buildSmartBookReleaseManifest,
  parseSmartBookReleaseManifest,
  parseStoredSmartBookReleaseManifest,
  type SmartBookReleaseManifestV2,
} from "@/lib/smart-book-release-manifest";
import { buildSmartBookProtectedReleasePayloadFromDatabase } from "@/lib/smart-book-release-protected";
import {
  type SmartBookProtectedQuestion,
  type SmartBookProtectedReleasePayload,
} from "@/lib/smart-book-release-protected";

function manifest() {
  return buildSmartBookReleaseManifest({
    publisherId: "publisher-1",
    bookId: "book-1",
    book: { title: "Book", slug: "book", subtitle: null, edition: null, updatedAt: new Date("2026-08-26T00:00:00.000Z") },
    document: { version: 4, canvas: { width: 100, height: 100 }, blocks: [], periods: [], layoutVersion: 2, pageLayout: { pages: [{ id: "page-1", order: 0, pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 1 }, frames: [] }] } } as never,
    hierarchy: [{ sourceId: "chapter-1", bookId: "book-1", kind: "CHAPTER", parentSourceId: null, partSourceId: null, unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Chapter 1", label: "Chapter 1", number: 1, displayOrder: 0, startPage: 1, endPage: 1 }],
    pdf: { bookPdfVersionId: "pdf-1", objectKey: "books/book-1/pdf.pdf", pageCount: 1, activatedAt: null },
    assets: { resources: [], media: [], activities: [], worksheets: [], assessments: [], questions: [{ sourceId: "question-1", questionType: "MCQ", questionText: "A", options: [{ id: "x", text: "X" }, { id: "y", text: "Y" }], marks: 1, displayOrder: 0, imageResourceId: null }] },
  });
}

function protectedQuestion(questionText: string, correctAnswer: string): SmartBookProtectedQuestion {
  return { sourceId: "question-1", bookId: "book-1", chapterId: "chapter-1", moduleId: null, exerciseId: "exercise-1", exerciseGroupId: "group-1", questionType: "MCQ", questionText, options: [{ id: "x", text: "X" }, { id: "y", text: "Y" }], correctAnswer, explanation: "Released explanation", marks: 1, displayOrder: 0, imageResourceId: null, sourceUpdatedAt: "2026-08-26T00:00:00.000Z" };
}

function stored(protectedQuestion: SmartBookProtectedQuestion, base = manifest()): SmartBookReleaseManifestV2 & { protected: SmartBookProtectedReleasePayload } {
  return { ...base, protected: { schemaVersion: 1, questions: [protectedQuestion], exercises: [], worksheets: [], assessments: [] } };
}

function releaseChecksum(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function candidate(question: SmartBookProtectedQuestion): PracticeQuestionCandidate {
  return { id: question.sourceId, bookId: question.bookId, chapterId: question.chapterId, moduleId: question.moduleId, imageResourceId: question.imageResourceId, questionType: question.questionType, questionText: question.questionText, options: question.options ?? null, correctAnswer: question.correctAnswer ?? null, explanation: question.explanation ?? null, marks: question.marks, approved: true, createdAt: new Date(question.sourceUpdatedAt) };
}

test("public V2 parsing strips protected answers while stored parsing retains them server-side", () => {
  const value = stored(protectedQuestion("A", "x"));
  const publicManifest = parseSmartBookReleaseManifest(value);
  assert.equal((publicManifest as Record<string, unknown>).protected, undefined);
  assert.doesNotMatch(JSON.stringify(publicManifest), /correctAnswer|answerKey|grading/i);
  assert.equal(parseStoredSmartBookReleaseManifest(value).protected.questions[0]?.correctAnswer, "x");
});

test("Release N displays and grades its frozen question after source mutation", () => {
  const releaseN = stored(protectedQuestion("A", "x"));
  const mutatedSource = stored(protectedQuestion("B", "y"));
  const nQuestion = releaseN.protected.questions[0]!;
  const nPlusOneQuestion = mutatedSource.protected.questions[0]!;
  const gradeN = gradePracticeAnswer(candidate(nQuestion), "x");
  const gradeNPlusOne = gradePracticeAnswer(candidate(nPlusOneQuestion), "y");
  assert.equal(releaseN.assets.questions[0]?.questionText, "A");
  assert.equal(gradeN.ok && gradeN.correct, true);
  assert.equal(gradeNPlusOne.ok && gradeNPlusOne.correct, true);
  assert.equal(getPracticeFeedbackAnswer(candidate(nQuestion)), "x");
});

test("protected grading state contributes to release checksum", () => {
  const first = stored(protectedQuestion("A", "x"));
  const second = stored(protectedQuestion("A", "y"));
  assert.notEqual(releaseChecksum(first), releaseChecksum(second));
});

test("missing or foreign protected questions fail the immutable execution contract", () => {
  const value = stored(protectedQuestion("A", "x"));
  assert.throws(() => parseStoredSmartBookReleaseManifest({ ...value, protected: undefined }));
  const foreign = { ...value, protected: { ...value.protected, questions: [{ ...value.protected.questions[0]!, bookId: "book-2" }] } };
  assert.equal(parseSmartBookReleaseManifest(foreign).identity.bookId, "book-1");
  assert.throws(() => parseStoredSmartBookReleaseManifest(foreign));
});

test("immutable release execution has no mutable BookQuestion read in its V2 branch", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/student-practice.ts", "utf8"));
  const branch = source.slice(source.indexOf("async function startImmutableBookQuestionsPractice"), source.indexOf("async function loadImmutablePracticeAttempt"));
  assert.doesNotMatch(branch, /bookQuestion\.(find|findFirst|findMany|findUnique)/);
  assert.match(branch, /protectedPayload\.questions/);
});

test("protected worksheet snapshots retain answer-key storage without exposing it in the safe manifest", async () => {
  const release = manifest();
  release.assets.questions = [];
  release.assets.worksheets.push({ sourceId: "worksheet-1", title: "Worksheet", type: "CLASSROOM", instructions: null, estimatedMinutes: null, difficulty: null, audience: "BOTH", totalMarks: 1, allowOnlineAttempt: true, allowPrint: true, runtimeExerciseId: null, questionIds: [], printableResourceId: null, supportingResourceIds: [] });
  const payload = await buildSmartBookProtectedReleasePayloadFromDatabase({
    publisherId: "publisher-1",
    bookId: "book-1",
    manifest: release,
    database: {
      publisherWorksheet: { findMany: async () => [{ id: "worksheet-1", publisherId: "publisher-1", bookId: "book-1", chapterId: "chapter-1", moduleId: null, exerciseId: null, title: "Worksheet", type: "CLASSROOM", instructions: null, totalMarks: 1, allowOnlineAttempt: true, allowPrint: true, showAnswersAfterSubmit: false, updatedAt: new Date("2026-08-26T00:00:00.000Z"), printableResourceId: null, answerKeyResourceId: "answer-key-1", supportingResourceIds: [], items: [] }] } as never,
      publisherAssessment: { findMany: async () => [] } as never,
      bookQuestion: { findMany: async () => [] } as never,
      bookExercise: { findMany: async () => [] } as never,
      bookExerciseQuestionGroup: { findMany: async () => [] } as never,
      resource: { findMany: async () => [{ id: "answer-key-1", fileUrl: "resources/answer-key-1.pdf" }] } as never,
    } as never,
  });
  assert.equal(payload.worksheets[0]?.answerKeyStorage?.value, "resources/answer-key-1.pdf");
  assert.equal((release.assets.worksheets[0] as Record<string, unknown>).answerKeyResourceId, undefined);
});