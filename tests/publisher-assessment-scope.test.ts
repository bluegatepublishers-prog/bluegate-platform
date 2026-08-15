import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const service = readFileSync(path.join(root, "lib/publisher-assessment.ts"), "utf8").replace(/\r/g, "");
const migration = readFileSync(
  path.join(root, "prisma/migrations/20260816010000_publisher_assessment_chapter_scope/migration.sql"),
  "utf8",
);

test("publisher assessment multi-scope is normalized ordered chapter membership, not a term/part assumption", () => {
  const scope = schema.slice(
    schema.indexOf("model PublisherAssessmentChapterScope {"),
    schema.indexOf("model PublisherAssessmentItem {"),
  );
  assert.match(scope, /assessmentId\s+String/u);
  assert.match(scope, /chapterId\s+String/u);
  assert.match(scope, /position\s+Int/u);
  assert.match(scope, /assessment\s+PublisherAssessment/u);
  assert.match(scope, /chapter\s+BookChapter/u);
  assert.match(scope, /@@unique\(\[assessmentId, chapterId\]\)/u);
  assert.match(scope, /@@index\(\[assessmentId, position\]\)/u);
  assert.match(scope, /@@index\(\[chapterId\]\)/u);
  assert.match(schema, /chapterScopes\s+PublisherAssessmentChapterScope\[\]/u);
  assert.match(schema, /publisherAssessmentChapterScopes\s+PublisherAssessmentChapterScope\[\]/u);
  assert.doesNotMatch(schema, /PublisherAssessmentPartScope/u);
});

test("multi-chapter and multi-term scopes require valid ordered non-duplicate chapter sets", () => {
  assert.match(service, /validateChapterIds\(bookId, requestedChapterIds, 2, "MULTI_CHAPTER_TEST"\)/u);
  assert.match(service, /validateChapterIds\(bookId, requestedChapterIds, 2, "MULTI_TERM_TEST"\)/u);
  assert.match(service, /validateChapterIds\(bookId, requestedChapterIds, 1, "TERM_TEST"\)/u);
  assert.match(service, /Duplicate chapter scope is not allowed\./u);
  assert.match(service, /Every selected chapter must belong to this book\./u);
  assert.match(service, /where: \{ id: \{ in: ids \}, bookId \}/u);
  assert.match(service, /chapterIds\.map\(\(chapterId, position\) => \(\{ assessmentId, chapterId, position \}\)\)/u);
});

test("kind transitions and replacement clear stale membership transactionally", () => {
  assert.match(service, /const keepingKind = kind === current\.kind/u);
  assert.match(service, /const existingChapterIds = keepingKind \? await currentChapterIds\(current\.id\) : \[\]/u);
  assert.match(service, /await replaceChapterScopeInTransaction\(tx, assessment\.id, scope\.chapterIds\)/u);
  assert.match(service, /publisherAssessmentChapterScope\.deleteMany\(\{ where: \{ assessmentId \} \}\)/u);
  assert.match(service, /BOOK_TEST:[\s\S]*?assertOnlyBookScope/u);
  assert.match(service, /FINAL_EXAM:[\s\S]*?assertOnlyBookScope/u);
  assert.match(service, /chapterIds: \[\]/u);
});

test("singular chapter and unit scopes remain strict, and published or archived assessments cannot mutate scope", () => {
  assert.match(service, /CHAPTER_TEST:[\s\S]*?assertOnlyChapterScope/u);
  assert.match(service, /UNIT_TEST:[\s\S]*?assertOnlyUnitScope/u);
  assert.match(service, /\$\{label\} requires one chapterId\./u);
  assert.match(service, /\$\{label\} requires one unitId\./u);
  assert.match(service, /Published assessments are immutable\./u);
  assert.match(service, /Restore this assessment before changing it\./u);
  assert.match(service, /Only draft assessments can change scope\./u);
});

test("chapter scope migration is additive and queryable", () => {
  assert.match(migration, /CREATE TABLE "PublisherAssessmentChapterScope"/u);
  assert.match(migration, /REFERENCES "PublisherAssessment"/u);
  assert.match(migration, /REFERENCES "BookChapter"/u);
  assert.match(migration, /assessmentId_position_idx/u);
  assert.match(migration, /chapterId_idx/u);
  assert.doesNotMatch(migration, /\bDROP\s+(?:TABLE|COLUMN|TYPE)\b|\bDELETE\s+FROM\b|\bTRUNCATE\s+TABLE\b/iu);
});
