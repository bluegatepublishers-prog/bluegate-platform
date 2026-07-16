import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("revision page requires student identity and denies foreign route IDs", async () => {
  const source = await read("app/student-dashboard/books/[bookId]/chapters/[chapterId]/revision/page.tsx");
  assert.match(source, /await requireStudent\(\)/);
  assert.match(source, /getStudentRevisionHub\(bookId, chapterId\)/);
  assert.match(source, /if \(!hub\) notFound\(\)/);
});

test("revision resolver authorizes the book before loading an exact approved chapter", async () => {
  const [resolver, collector] = await Promise.all([
    read("lib/student-revision.ts"),
    read("lib/ai/knowledge-collector.ts"),
  ]);
  const bookAuthorization = resolver.indexOf("await getStudentBook(bookId)");
  const chapterCollection = resolver.indexOf("collectApprovedStructuredChapter(bookId, chapterId)");
  assert.ok(bookAuthorization >= 0 && bookAuthorization < chapterCollection);
  assert.match(collector, /where: \{ id: chapterId, bookId, approved: true, book: \{ published: true \} \}/);
  assert.match(collector, /questions: \{\s*where: \{ approved: true \}/);
  assert.match(collector, /activities: \{\s*where: \{ approved: true \}/);
});

test("student revision projection does not load raw chapter text or call a provider", async () => {
  const resolver = await read("lib/student-revision.ts");
  const collector = await read("lib/ai/knowledge-collector.ts");
  const structured = collector.slice(
    collector.indexOf("collectApprovedStructuredChapter"),
    collector.indexOf("collectStudentChapterKnowledge"),
  );
  assert.doesNotMatch(structured, /reviewedText|extractedText/);
  assert.doesNotMatch(resolver, /OpenAI|provider|generate/i);
});

test("checklist load and save are scoped to current server-derived student and year", async () => {
  const resolver = await read("lib/student-revision.ts");
  assert.match(resolver, /studentId: identity\.student\.id/);
  assert.match(resolver, /academicYearId: identity\.academicYear\.id/);
  assert.match(resolver, /studentId_chapterId_academicYearId/);
  assert.match(resolver, /progress \?\? emptyChecklist/);
});

test("dashboard completed revisions use only real current-year completed rows for entitled books", async () => {
  const resolver = await read("lib/student-revision.ts");
  assert.match(resolver, /const books = await getStudentBooks\(\)/);
  assert.match(resolver, /revisionCompleted: true/);
  assert.match(resolver, /academicYearId: identity\.academicYear\.id/);
  assert.match(resolver, /chapter: \{ bookId: \{ in: bookIds \}, approved: true \}/);
});

test("revision migration is additive, unique, year-scoped, and non-destructive", async () => {
  const [schema, migration] = await Promise.all([
    read("prisma/schema.prisma"),
    read("prisma/migrations/20260713210000_student_revision_progress/migration.sql"),
  ]);
  assert.match(schema, /model StudentRevisionProgress/);
  assert.match(schema, /@@unique\(\[studentId, chapterId, academicYearId\]\)/);
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM|ALTER COLUMN/i);
});
