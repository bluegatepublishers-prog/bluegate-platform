import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  collectSnapshotHierarchyDependencyIds,
  collectSnapshotPdfPageNumbers,
} from "../lib/content-release-dependencies";

const release = readFileSync("lib/content-release.ts", "utf8");
const teacherAssessments = readFileSync("lib/teacher-assessments.ts", "utf8");
const questionBank = readFileSync("lib/question-bank-discovery.ts", "utf8");
const studentWorkspaces = readFileSync("lib/student-workspaces.ts", "utf8");
const contentActions = readFileSync("app/admin/books/[id]/content/actions.ts", "utf8");

const chapters = [
  { id: "chapter-1", bookId: "book-a", startPage: 7, endPage: 16, archived: false },
  { id: "chapter-2", bookId: "book-a", startPage: 18, endPage: 26, archived: false },
  { id: "chapter-4", bookId: "book-a", startPage: 36, endPage: 46, archived: false },
];
const modules = [
  { id: "module-1", bookId: "book-a", chapterId: "chapter-1", startPage: 7, endPage: 10, archived: false },
  { id: "module-2", bookId: "book-a", chapterId: "chapter-2", startPage: 18, endPage: 26, archived: false },
  { id: "module-4", bookId: "book-a", chapterId: "chapter-4", startPage: 36, endPage: 46, archived: false },
];

test("full-PDF snapshot pages promote the matching chapter and module ranges", () => {
  const pageNumbers = collectSnapshotPdfPageNumbers({
    pages: [
      { pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 7 } },
      { pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 15 } },
      { pdfBackground: { source: "OTHER", pageNumber: 18 } },
    ],
  });
  assert.deepEqual(pageNumbers, [7, 15]);
  assert.deepEqual(
    collectSnapshotHierarchyDependencyIds({
      bookId: "book-a",
      pageNumbers,
      referencedExerciseIds: [],
      chapters,
      modules,
      exercises: [],
    }),
    { chapterIds: ["chapter-1"], moduleIds: ["module-1"] },
  );
});

test("unrelated, cross-book, and archived hierarchy rows are excluded", () => {
  const result = collectSnapshotHierarchyDependencyIds({
    bookId: "book-a",
    pageNumbers: [7],
    referencedExerciseIds: ["foreign-exercise", "archived-exercise"],
    chapters: [
      ...chapters,
      { id: "foreign-chapter", bookId: "book-b", startPage: 7, endPage: 16, archived: false },
      { id: "archived-chapter", bookId: "book-a", startPage: 7, endPage: 16, archived: true },
    ],
    modules: [
      ...modules,
      { id: "foreign-module", bookId: "book-b", chapterId: "foreign-chapter", startPage: 7, endPage: 16, archived: false },
    ],
    exercises: [
      { id: "foreign-exercise", bookId: "book-b", chapterId: "foreign-chapter", moduleId: "foreign-module", archived: false },
      { id: "archived-exercise", bookId: "book-a", chapterId: "chapter-1", moduleId: "module-1", archived: true },
    ],
  });
  assert.deepEqual(result, { chapterIds: ["chapter-1"], moduleIds: ["module-1"] });
});

test("a referenced exercise promotes its own chapter and module even without a page hit", () => {
  assert.deepEqual(
    collectSnapshotHierarchyDependencyIds({
      bookId: "book-a",
      pageNumbers: [],
      referencedExerciseIds: ["exercise-4"],
      chapters,
      modules,
      exercises: [
        { id: "exercise-4", bookId: "book-a", chapterId: "chapter-4", moduleId: "module-4", archived: false },
      ],
    }),
    { chapterIds: ["chapter-4"], moduleIds: ["module-4"] },
  );
});

test("later-chapter page ranges are treated like chapter-one ranges", () => {
  const result = collectSnapshotHierarchyDependencyIds({
    bookId: "book-a",
    pageNumbers: [36, 40, 46],
    referencedExerciseIds: [],
    chapters,
    modules,
    exercises: [],
  });
  assert.deepEqual(result, { chapterIds: ["chapter-4"], moduleIds: ["module-4"] });
});

test("release records and promotes validated chapter/module dependencies", () => {
  assert.match(release, /collectDependencies\(snapshot, publishPlan!\.snapshotDependencies, publishPlan!\.hierarchyDependencies\)/u);
  assert.match(release, /prepareSnapshotPublishPlan\(input\.actor\.publisherId, input\.bookId, snapshot\)/u);
  assert.match(release, /db\.bookChapter\.findMany\(/u);
  assert.match(release, /db\.bookModule\.findMany\(/u);
  assert.match(release, /db\.bookExercise\.findMany\(/u);
  assert.match(release, /book: \{ publisherId \},\s*archived: false/u);
  assert.match(release, /data: \{ published: true, approved: true, publishedAt: new Date\(\) \}/u);
  assert.match(release, /data: \{ published: true \}/u);
  assert.match(release, /dependencies\.BOOK_CHAPTER/u);
  assert.match(release, /dependencies\.BOOK_MODULE/u);
  assert.match(release, /tx\.contentReleaseVersion\.create\(/u);
});

test("publish transaction contains writes only, not repeated hierarchy or question reads", () => {
  const transactionStart = release.indexOf("const transactionResult = await prisma.$transaction");
  assert.ok(transactionStart >= 0);
  const transaction = release.slice(transactionStart, release.indexOf("\n  }, publishTransactionOptions);", transactionStart));
  assert.doesNotMatch(transaction, /bookChapter\.findMany\(|bookModule\.findMany\(|bookExercise\.findMany\(/u);
  assert.doesNotMatch(transaction, /bookExerciseQuestionGroup\.findFirst\(|bookExerciseQuestionGroup\.findMany\(|bookQuestion\.findMany\(/u);
  assert.doesNotMatch(transaction, /collectSnapshotPdfPageNumbers|collectSnapshotHierarchyDependencyIds/u);
  assert.ok(release.indexOf("const publishPlan") < transactionStart);
  assert.match(release, /async function prepareSnapshotPublishPlan[\s\S]*db\.bookChapter\.findMany\(/u);
  assert.equal((release.match(/collectSnapshotPdfPageNumbers\(/gu) ?? []).length, 1);
  assert.equal((release.match(/collectSnapshotHierarchyDependencyIds\(/gu) ?? []).length, 1);
});

test("exercise, group, question, and resource cascade remains in the same publish transaction", () => {
  assert.match(release, /bookExercise\.updateMany\(/u);
  assert.match(release, /bookExerciseQuestionGroup\.updateMany\(/u);
  assert.match(release, /data: \{ active: true \}/u);
  assert.match(release, /bookQuestion\.updateMany\(/u);
  assert.match(release, /data: \{ approved: true \}/u);
  assert.match(release, /publishResources\(tx, publisherId, bookId, resourceIds\)/u);
});

test("explicit stale question IDs cannot escape launcher scope", () => {
  assert.match(release, /questionIds\.length \? \{ id: \{ in: launcher\.questionIds \} \}/u);
  assert.match(release, /questionType: launcher\.questionType/u);
  assert.match(release, /exerciseId: launcher\.exerciseId/u);
  assert.match(release, /exerciseGroupId: launcher\.groupId/u);
  assert.match(release, /const questions = questionWhere\.length\s*\?/u);
});

test("teacher question-bank eligibility requires a released approved chapter", () => {
  assert.match(teacherAssessments, /approved: true,\s*published: true,\s*archived: false/u);
  assert.match(questionBank, /approved: true,\s*published: true,\s*archived: false/u);
});

test("student chapter eligibility requires both chapter publication flags", () => {
  assert.match(studentWorkspaces, /approved: true,\s*published: true,\s*archived: false/u);
});

test("normal Smart Book publication remains publisher-authenticated and book-owned", () => {
  assert.match(contentActions, /requireLivePublisherAdmin\(\)/u);
  assert.match(contentActions, /requireOwnedBook\(bookId, actor\.publisherId\)/u);
  assert.match(contentActions, /transitionRelease\(/u);
  assert.match(release, /book: \{ publisherId \}/u);
});

test("pre-transaction dependency reads enforce current-book and publisher ownership", () => {
  const plan = release.slice(release.indexOf("async function prepareSnapshotPublishPlan"));
  assert.match(plan, /db\.bookChapter\.findMany\(\{\s*where: \{ bookId, book: \{ publisherId \}, archived: false \}/u);
  assert.match(plan, /db\.bookModule\.findMany\(\{\s*where: \{ bookId, book: \{ publisherId \}, archived: false \}/u);
  assert.match(plan, /db\.bookExercise\.findMany\(\{\s*where: \{ id: \{ in: referencedExerciseIds \}, bookId, book: \{ publisherId \}, archived: false \}/u);
  assert.match(plan, /prisma\.bookExerciseQuestionGroup\.findMany\([\s\S]*?exercise: \{ bookId, book: \{ publisherId \}, archived: false \}/u);
});
