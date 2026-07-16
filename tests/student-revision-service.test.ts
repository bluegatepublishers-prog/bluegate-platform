import assert from "node:assert/strict";
import test from "node:test";
import { saveRevisionChecklistWithDependencies } from "../lib/student-revision-service";

const context = { studentId: "student-server", academicYearId: "year-server" };
const checklist = { summaryRead: true, keywordsRead: true, mindMapRead: false, revisionCompleted: false };

test("authorized checklist save persists server-derived student and academic year", async () => {
  let saved: unknown;
  const result = await saveRevisionChecklistWithDependencies(
    { bookId: "book-1", chapterId: "chapter-1", checklist },
    {
      async getContext() { return context; },
      async authorize(bookId, chapterId, trusted) {
        assert.deepEqual([bookId, chapterId, trusted], ["book-1", "chapter-1", context]);
        return true;
      },
      async upsert(data) { saved = data; return data; },
    },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(saved, { ...context, chapterId: "chapter-1", checklist });
});

test("malformed checklist is denied before identity, authorization, or persistence", async () => {
  let called = false;
  const result = await saveRevisionChecklistWithDependencies(
    { bookId: "book-1", chapterId: "chapter-1", checklist: { summaryRead: true } },
    {
      async getContext() { called = true; return context; },
      async authorize() { called = true; return true; },
      async upsert() { called = true; },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(called, false);
});

for (const label of ["wrong chapter", "wrong book", "wrong publisher", "wrong year", "unauthorized"] as const) {
  test(`${label} denial cannot create or change revision progress`, async () => {
    let persisted = false;
    const result = await saveRevisionChecklistWithDependencies(
      { bookId: "denied-book", chapterId: "denied-chapter", checklist },
      {
        async getContext() { return context; },
        async authorize() { return false; },
        async upsert() { persisted = true; },
      },
    );
    assert.equal(result.ok, false);
    assert.equal(persisted, false);
  });
}

test("browser cannot select another student or prior academic year", async () => {
  let saved: unknown;
  await saveRevisionChecklistWithDependencies(
    {
      bookId: "book-1",
      chapterId: "chapter-1",
      checklist: { ...checklist, studentId: "attacker", academicYearId: "old-year" },
    },
    {
      async getContext() { return context; },
      async authorize() { return true; },
      async upsert(data) { saved = data; return data; },
    },
  );
  assert.equal(saved, undefined);
});
