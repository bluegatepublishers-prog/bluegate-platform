import assert from "node:assert/strict";
import test from "node:test";
import {
  saveReadingProgressWithDependencies,
  togglePageBookmarkWithDependencies,
} from "../lib/student-reading-service";

const context = { studentId: "student-server", academicYearId: "year-server" };

test("progress save uses trusted context and upserts a normalized position", async () => {
  let persisted: unknown;
  const result = await saveReadingProgressWithDependencies(
    { bookId: "book-1", currentPage: 50, totalPages: 40 },
    {
      async getContext() { return context; },
      async authorizeBook(bookId, trusted) {
        assert.equal(bookId, "book-1");
        assert.deepEqual(trusted, context);
        return true;
      },
      async upsert(data) { persisted = data; return data; },
    },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(persisted, {
    ...context,
    bookId: "book-1",
    lastPage: 40,
    totalPages: 40,
    completed: true,
  });
});

test("malformed progress is rejected before identity or database access", async () => {
  let called = false;
  const result = await saveReadingProgressWithDependencies(
    { bookId: "book-1", currentPage: 0, totalPages: 20 },
    {
      async getContext() { called = true; return context; },
      async authorizeBook() { called = true; return true; },
      async upsert() { called = true; },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test("unauthorized books cannot create progress", async () => {
  let persisted = false;
  const result = await saveReadingProgressWithDependencies(
    { bookId: "foreign-book", currentPage: 2, totalPages: 20 },
    {
      async getContext() { return context; },
      async authorizeBook() { return false; },
      async upsert() { persisted = true; },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(persisted, false);
});

test("bookmark toggle receives only trusted student, year, book, and page fields", async () => {
  let persisted: unknown;
  const result = await togglePageBookmarkWithDependencies(
    { bookId: "book-1", pageNumber: 4, totalPages: 10 },
    {
      async getContext() { return context; },
      async authorizeBook() { return true; },
      async toggle(data) { persisted = data; return { bookmarked: true }; },
    },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(persisted, { ...context, bookId: "book-1", pageNumber: 4 });
});

test("invalid and unauthorized bookmarks never persist", async () => {
  let count = 0;
  const dependencies = {
    async getContext() { return context; },
    async authorizeBook() { return false; },
    async toggle() { count += 1; },
  };
  assert.equal((await togglePageBookmarkWithDependencies({ bookId: "book-1", pageNumber: 0 }, dependencies)).ok, false);
  assert.equal((await togglePageBookmarkWithDependencies({ bookId: "book-1", pageNumber: 2 }, dependencies)).ok, false);
  assert.equal(count, 0);
});
