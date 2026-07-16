import assert from "node:assert/strict";
import test from "node:test";
import {
  readingProgressPercent,
  validateBookmarkPage,
  validateReadingPosition,
} from "../lib/student-reading-policy";

test("reading position accepts valid pages and marks the last page complete", () => {
  assert.deepEqual(validateReadingPosition(7, 20), {
    ok: true,
    lastPage: 7,
    totalPages: 20,
    completed: false,
  });
  assert.deepEqual(validateReadingPosition(20, 20), {
    ok: true,
    lastPage: 20,
    totalPages: 20,
    completed: true,
  });
});

test("overflow pages are clamped while malformed and non-positive values are rejected", () => {
  assert.deepEqual(validateReadingPosition(25, 20), {
    ok: true,
    lastPage: 20,
    totalPages: 20,
    completed: true,
  });
  for (const value of [0, -1, 1.5, "2", Number.NaN, 100_001]) {
    assert.equal(validateReadingPosition(value, 20).ok, false);
  }
  assert.equal(validateReadingPosition(2, 0).ok, false);
});

test("bookmark validation and progress percentages use safe bounds", () => {
  assert.equal(validateBookmarkPage(9, 8), 8);
  assert.equal(validateBookmarkPage(0, 8), null);
  assert.equal(readingProgressPercent(15, 60), 25);
  assert.equal(readingProgressPercent(5, null), null);
});
