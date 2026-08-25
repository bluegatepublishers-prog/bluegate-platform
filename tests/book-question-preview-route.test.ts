import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  "app/api/teacher/book-questions/preview/route.ts",
  "utf8",
);
const overlay = readFileSync(
  "components/content/v2/V2AssessmentLauncherOverlay.tsx",
  "utf8",
);
const teacherBooks = readFileSync(
  "lib/teacher-books.ts",
  "utf8",
);
const bookQuestions = readFileSync(
  "lib/book-questions.ts",
  "utf8",
);


test("teacher preview returns a controlled success or failure response", () => {
  assert.match(route, /NextResponse\.json/);
  assert.match(route, /ok: true[\s\S]*questions: result/);
  assert.match(route, /PREVIEW_TIMEOUT_MS = 8_000/);
  assert.match(route, /},\s*503/);
  assert.match(route, /Book Questions are temporarily unavailable/);
  assert.match(route, /response serialization started/);
  assert.match(route, /response returned/);
});

test("preview authorization remains teacher-book entitlement based", () => {
  assert.match(route, /getTeacherBook/);
  assert.match(route, /if \(!teacherBook\)/);
  assert.match(teacherBooks, /getBookEntitlementForAuthenticatedUser/);
  assert.match(teacherBooks, /if \(!decision\.allowed/);
});

test("preview traces the exact awaited database stages", () => {
  for (const stage of [
    "route entered",
    "exercise/group lookup started",
    "exercise/group lookup completed",
    "auth started",
    "auth completed",
    "teacher auth started",
    "teacher auth completed",
    "preview exercise query started",
    "preview group query started",
    "preview question query started",
    "preview question query completed",
  ]) {
    assert.match(route + teacherBooks + bookQuestions, new RegExp(stage));
  }
  assert.match(route, /lastStage/);
  assert.match(route, /preview timeout after/);
});

test("MCQ, FILL_BLANK, and TRUE_FALSE preserve one request path and payload", () => {
  assert.equal(
    (overlay.match(/\/api\/teacher\/book-questions\/preview/g) ?? []).length,
    1,
  );
  assert.match(overlay, /encodeURIComponent\(\s*exerciseId/);
  assert.match(overlay, /encodeURIComponent\(\s*groupId/);
  assert.match(overlay, /encodeURIComponent\(questionType\)/);
  assert.match(overlay, /encodeURIComponent\(selectedIds\.join\(\",\"\)\)/);
  assert.match(route, /requestedQuestionIds/);
  assert.match(route, /approved/);
  assert.match(route, /archived/);
  assert.match(overlay, /Questions could not be loaded\./);
  assert.match(overlay, />\s*Retry\s*</);
});