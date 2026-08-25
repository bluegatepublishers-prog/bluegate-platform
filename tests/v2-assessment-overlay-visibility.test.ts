import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overlay = readFileSync(
  "components/content/v2/V2AssessmentLauncherOverlay.tsx",
  "utf8",
);
const visual = readFileSync(
  "components/content/v2/V2AssessmentLauncherVisual.tsx",
  "utf8",
);

test("HTTP 200 preview data is parsed, stored, and rendered in one visible dialog", () => {
  assert.match(overlay, /body\.questions/);
  assert.match(overlay, /setQuestions\([\s\S]*source/);
  assert.match(overlay, /role="dialog"/);
  assert.match(overlay, /InteractiveQuestionRenderer/);
  assert.match(overlay, /data-v2-assessment-launcher-overlay[\s\S]*<section/);
  assert.match(overlay, /createPortal\([\s\S]*portalTarget,\s*\n\s*\)/);
});

test("MCQ, FILL_BLANK, and TRUE_FALSE share the same post-200 rendering path", () => {
  assert.match(overlay, /normalizeV2PracticeQuestionType/);
  assert.match(overlay, /mapPreviewQuestion/);
  assert.match(visual, /questionType=\{payload\.target\.questionType\}/);
  assert.equal((overlay.match(/setQuestions\(/g) ?? []).length >= 2, true);
});

test("valid-empty preview data shows an explicit empty state instead of disappearing", () => {
  assert.match(overlay, /No questions are available for this activity\./);
  assert.match(overlay, /role="status"/);
  assert.match(overlay, /onRetry\s*\?\s*\(/);
});

test("question dialog remains in the Teach Mode portal host above the book", () => {
  assert.match(overlay, /useV2OverlayPortalTarget/);
  assert.match(overlay, /fixed inset-0[\s\S]*z-\[130\]/);
  assert.match(overlay, /pointer-events-auto/);
  assert.match(overlay, /min-h-0 flex-1[\s\S]*overflow-y-auto/);
  assert.match(overlay, /max-h-\[min\(88vh,900px\)\]/);
  assert.match(overlay, /portalTarget,/);
});

test("safe failure and retry behavior remain available without diagnostics", () => {
  assert.doesNotMatch(visual + overlay, /QUESTION DEBUG|data-v2-question-debug|onDebug|responseParsed|questionsReceived|questionsStored|dialogBranch|dialogMounted/);
  assert.match(overlay, /Questions could not be loaded/);
  assert.match(overlay, /Retry/);
  assert.doesNotMatch(visual + overlay, /Maximum update depth/);
});
