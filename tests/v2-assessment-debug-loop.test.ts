import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const visual = readFileSync(
  "components/content/v2/V2AssessmentLauncherVisual.tsx",
  "utf8",
);
const overlay = readFileSync(
  "components/content/v2/V2AssessmentLauncherOverlay.tsx",
  "utf8",
);

test("temporary debug reporting and UI are removed", () => {
  assert.doesNotMatch(visual, /V2QuestionLauncherDebug|debugEnabled|reportDebug|data-v2-question-debug/);
  assert.doesNotMatch(overlay, /V2QuestionLauncherDebug|onDebug|resolveDebugPortalTarget|formatDebugRect/);
});

test("overlay lifecycle and fetch handling preserve the functional fixes", () => {
  assert.match(overlay, /selectedIdsKey/);
  assert.match(overlay, /setLoadFailed/);
  assert.match(overlay, /Questions could not be loaded/);
  assert.match(overlay, /portalTarget/);
});

test("teacher launcher remains open without maximum-update-depth code", () => {
  assert.match(visual, /setOpen\(true\)/);
  assert.doesNotMatch(visual, /Maximum update depth/);
  assert.doesNotMatch(overlay, /Maximum update depth/);
});

test("question launcher has no debug-only development branch", () => {
  assert.doesNotMatch(visual, /NODE_ENV|data-v2-question-debug/);
});
