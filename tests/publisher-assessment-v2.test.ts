import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createV2AssessmentLauncherPayload,
  createV2PublisherAssessmentLauncherPayload,
  getV2AssessmentLauncherPayload,
} from "../lib/v2-assessment-launcher";
import {
  getPublisherAssessmentLauncherLabel,
  groupPublisherAssessmentItemsByType,
} from "../lib/publisher-assessment-presentation";

test("publisher preview groups by first type occurrence while retaining per-type item order", () => {
  const groups = groupPublisherAssessmentItemsByType([
    { questionType: "MCQ", id: "one" },
    { questionType: "TRUE_FALSE", id: "two" },
    { questionType: "MCQ", id: "three" },
  ]);
  assert.deepEqual(groups.map((group) => group.questionType), ["MCQ", "TRUE_FALSE"]);
  assert.deepEqual(groups[0].items.map((item) => item.id), ["one", "three"]);
});

test("publisher assessment launcher is a safe discriminated payload and question launcher remains intact", () => {
  const publisher = createV2PublisherAssessmentLauncherPayload({ assessmentId: "assessment-1", kind: "MULTI_CHAPTER_TEST" });
  assert.equal(publisher.display.label, "CHAPTER TEST");
  assert.deepEqual(getV2AssessmentLauncherPayload({ type: "ASSESSMENT_LAUNCHER", payload: publisher }), publisher);
  const question = createV2AssessmentLauncherPayload({ exerciseId: "exercise-1", groupId: "group-1" });
  assert.equal(getV2AssessmentLauncherPayload({ type: "ASSESSMENT_LAUNCHER", payload: question })?.launcherType, "question");
  assert.equal(getPublisherAssessmentLauncherLabel("FINAL_EXAM"), "FINAL EXAM");
});

test("Content Studio retains assessment launcher payload and keeps locked launchers separate", () => {
  const editor = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");
  const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
  const preview = readFileSync("components/admin/books/PublisherAssessmentPreview.tsx", "utf8");
  assert.match(editor, /type === "WORKSHEET" && !isWorksheetLauncher/);
  assert.match(workspace, /openInsertSurface\("ASSESSMENT"\)/);
  assert.match(workspace, /createV2PublisherAssessmentLauncherPayload/);
  assert.match(workspace, /assignments\/assessments/);
  assert.match(preview, /groupPublisherAssessmentItemsByType/);
  assert.match(preview, /General Instructions/);
  assert.doesNotMatch(preview, /correctAnswer|explanation|answer key/i);
});
