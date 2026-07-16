import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("My Books derives books from the safe subject projection and scopes progress to server identity", async () => {
  const source = await read("lib/student-books.ts");
  assert.match(source, /await requireStudent\(\)/);
  assert.match(source, /await getStudentSubjects\(\)/);
  assert.match(source, /studentId: identity\.student\.id/);
  assert.match(source, /academicYearId: identity\.academicYear\.id/);
  assert.doesNotMatch(source, /premium/i);
});

test("reader access reuses central full-book entitlement with explicit academic scope", async () => {
  const source = await read("lib/student-books.ts");
  assert.match(source, /getBookEntitlementForAuthenticatedUser/);
  assert.match(source, /sectionId: identity\.enrollment\.sectionId/);
  assert.match(source, /sectionSubjectId: book\.sectionSubjectId/);
  assert.match(source, /if \(!decision\.allowed\) return null/);
});

test("reader receives only the protected route and exposes no download control", async () => {
  const source = await read("components/student/StudentPdfReader.tsx");
  assert.match(source, /url: `\/api\/books\/\$\{bookId\}\/full-pdf`/);
  assert.doesNotMatch(source, /fullBookPdf|download=/);
  assert.doesNotMatch(source, /Download/);
});

test("progress schema is additive, year-scoped, unique, and migration is non-destructive", async () => {
  const [schema, migration] = await Promise.all([
    read("prisma/schema.prisma"),
    read("prisma/migrations/20260713180000_student_book_reading_progress/migration.sql"),
  ]);
  assert.match(schema, /model StudentBookProgress/);
  assert.match(schema, /@@unique\(\[studentId, bookId, academicYearId\]\)/);
  assert.match(schema, /model StudentBookBookmark/);
  assert.match(schema, /@@unique\(\[studentId, bookId, academicYearId, pageNumber\]\)/);
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM/i);
});
