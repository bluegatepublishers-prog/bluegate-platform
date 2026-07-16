import assert from "node:assert/strict";
import test from "node:test";
import { buildStudentBookLibrary } from "../lib/student-book-policy";
import type { StudentSubjectViewModel } from "../lib/student-subject-policy";

function subject(
  sectionSubjectId: string,
  book: StudentSubjectViewModel["book"],
): StudentSubjectViewModel {
  return {
    sectionSubjectId,
    subjectId: `subject-${sectionSubjectId}`,
    subjectName: book?.subjectName ?? "Mathematics",
    subjectSlug: "mathematics",
    teacherName: null,
    book,
    resources: [],
    resourceCounts: { videos: 0, worksheets: 0, ppts: 0, pdfs: 0, other: 0 },
    totalStudentResources: 0,
    hasApprovedBook: Boolean(book),
  };
}

const book = {
  id: "book-1",
  title: "Number Trails",
  coverImage: null,
  series: "Bluegate Maths",
  className: "Class 6",
  subjectName: "Mathematics",
};

test("My Books includes only book-bearing safe subject projections and deduplicates books", () => {
  const result = buildStudentBookLibrary([
    subject("ss-1", book),
    subject("ss-2", null),
    subject("ss-3", book),
  ], []);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    ...book,
    subjectName: "Mathematics",
    sectionSubjectId: "ss-1",
    progress: null,
  });
});

test("My Books maps real current-year progress into continue and completed states", () => {
  const lastReadAt = new Date("2026-07-13T10:00:00.000Z");
  const [inProgress] = buildStudentBookLibrary([subject("ss-1", book)], [{
    bookId: "book-1",
    lastPage: 15,
    totalPages: 60,
    completedAt: null,
    lastReadAt,
  }]);
  assert.deepEqual(inProgress.progress, {
    lastPage: 15,
    totalPages: 60,
    percent: 25,
    completed: false,
    lastReadAt: lastReadAt.toISOString(),
  });

  const [completed] = buildStudentBookLibrary([subject("ss-1", book)], [{
    bookId: "book-1",
    lastPage: 60,
    totalPages: 60,
    completedAt: lastReadAt,
    lastReadAt,
  }]);
  assert.equal(completed.progress?.completed, true);
  assert.equal(completed.progress?.percent, 100);
});

test("unrelated progress cannot introduce an unauthorized book", () => {
  const result = buildStudentBookLibrary([subject("ss-1", book)], [{
    bookId: "foreign-book",
    lastPage: 10,
    totalPages: 10,
    completedAt: new Date(),
    lastReadAt: new Date(),
  }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "book-1");
  assert.equal(result[0].progress, null);
});
