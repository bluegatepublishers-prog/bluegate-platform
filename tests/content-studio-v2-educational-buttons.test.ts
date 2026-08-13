import assert from "node:assert/strict";
import test from "node:test";

import type { ContentBlock } from "../lib/content-document";
import { createV2Frame, createV2PageLayout, duplicateV2Frame } from "../lib/content-layout-v2";
import { getV2EducationalButtonType, getV2EducationalButtonPresentation, isV2EducationalButtonBlock } from "../components/content/v2/V2EducationalButtonVisual";

const block = (value: Record<string, unknown>) => value as unknown as ContentBlock;

test("universal educational mapping uses the canonical compact labels", () => {
  const frame = createV2Frame("EDUCATIONAL", "page-a", { id: "edu-a" });
  assert.equal(getV2EducationalButtonType(frame, block({ type: "educationalObject", objectType: "learningObjective", text: "" })), "LEARNING_OBJECTIVE");
  assert.equal(getV2EducationalButtonType(frame, block({ type: "educationalObject", objectType: "teacherNote", text: "" })), "TEACHER_NOTE");
  assert.equal(getV2EducationalButtonType(frame, block({ type: "educationalObject", objectType: "hots", text: "" })), "HOTS");
  assert.equal(getV2EducationalButtonType(frame, block({ type: "educationalObject", objectType: "didYouKnow", text: "" })), "DID_YOU_KNOW");
  assert.equal(getV2EducationalButtonType(frame, block({ type: "educationalObject", objectType: "vocabulary", text: "" })), "VOCABULARY");
  assert.equal(getV2EducationalButtonType(frame, block({ type: "educationalObject", objectType: "example", text: "" })), "EXAMPLE");
  assert.equal(getV2EducationalButtonType(frame, block({ type: "observationBox", text: "" })), "OBSERVATION");
  assert.equal(getV2EducationalButtonType(frame, block({ type: "educationalObject", objectType: "caseStudy", text: "" })), "CASE_STUDY");
});

test("database-backed and authored learning objects resolve to button families without copying records", () => {
  const frame = createV2Frame("ACTIVITY", "page-a", { id: "activity-a", contentRef: { blockId: "activity-block" } });
  assert.equal(getV2EducationalButtonType(frame, block({ type: "activity", fields: [] })), "ACTIVITY");
  assert.equal(getV2EducationalButtonType(createV2Frame("WORKSHEET", "page-a"), block({ type: "worksheet", questions: [] })), "WORKSHEET");
  assert.equal(getV2EducationalButtonType(createV2Frame("EXERCISE", "page-a"), block({ type: "exercise", questions: [], groups: [] })), "EXERCISE");
  assert.equal(getV2EducationalButtonType(createV2Frame("TEXT", "page-a"), block({ type: "linkedAsset", assetKind: "video", label: "Lesson", targetType: "VIDEO_LESSON", targetId: "video-a" })), "VIDEO");
  assert.equal(isV2EducationalButtonBlock(block({ type: "linkedAsset" })), true);
  assert.equal(isV2EducationalButtonBlock(block({ type: "paragraph", text: "Keep this as text", spans: [] })), false);
});

test("missing references are visibly disabled and frame duplication preserves the same block reference", () => {
  const frame = createV2Frame("EDUCATIONAL", "page-a", { id: "edu-a", contentRef: { blockId: "block-a" } });
  const presentation = getV2EducationalButtonPresentation(frame);
  assert.equal(presentation.disabled, true);
  assert.equal(presentation.label, "Did You Know?");

  const duplicated = duplicateV2Frame(createV2PageLayout({ pages: [{ id: "page-a", frames: [frame] }] }), "page-a", "edu-a");
  const frames = duplicated.pages[0]!.frames;
  assert.equal(frames.length, 2);
  assert.notEqual(frames[1]!.id, frame.id);
  assert.equal(frames[1]!.contentRef?.blockId, "block-a");
});

test("button presentation excludes formal assessment and test types from the Stage 1 registry", () => {
  const source = getV2EducationalButtonType.toString();
  assert.doesNotMatch(source, /ASSESSMENT|TEST/);
});
