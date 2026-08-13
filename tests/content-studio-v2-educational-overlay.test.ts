import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const button = read("components/content/v2/V2EducationalButtonVisual.tsx");
const overlay = read("components/content/v2/V2EducationalOverlay.tsx");
const frameContent = read("components/content/v2/V2FrameContent.tsx");
const authoring = read("components/admin/books/editor/V2EducationalFrame.tsx");

test("shared educational overlay is portal-rendered, accessible, closable, and locks page scroll", () => {
  assert.match(overlay, /createPortal/);
  assert.match(overlay, /role="dialog"/);
  assert.match(overlay, /aria-modal="true"/);
  assert.match(overlay, /Escape/);
  assert.match(overlay, /event\.target === event\.currentTarget/);
  assert.match(overlay, /document\.body\.style\.overflow/);
  assert.match(overlay, /data-v2-educational-overlay-close/);
});

test("delivery buttons are keyboard-activatable while authoring remains explicit Preview", () => {
  assert.match(button, /openable = false/);
  assert.match(button, /type="button"/);
  assert.match(button, /aria-haspopup="dialog"/);
  assert.match(button, /event\.stopPropagation\(\)/);
  assert.match(button, /V2EducationalOverlay/);
  assert.match(authoring, /V2EducationalPreviewAction/);
  assert.match(button, /data-v2-educational-preview/);
  assert.match(authoring, /previewContent/);
});

test("V2 delivery wraps the existing one-block renderer and leaves authoring non-openable", () => {
  assert.match(frameContent, /renderBlock\?\.\(block\)/);
  assert.match(frameContent, /openable=\{videoPresentation === "DELIVERY"\}/);
  assert.match(frameContent, /return <V2EducationalButtonVisual frame=\{frame\} block=\{block\} openable/);
  assert.doesNotMatch(frameContent, /Prisma|AssessmentAttempt|StudentPracticeAttempt/);
});

test("stale references use the shared unavailable surface without exposing IDs", () => {
  assert.match(overlay, /This content is currently unavailable\./);
  assert.doesNotMatch(overlay, /blockId|targetId|server error/i);
});
