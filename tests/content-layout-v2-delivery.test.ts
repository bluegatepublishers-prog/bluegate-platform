import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createV2Frame, createV2PageLayout } from "../lib/content-layout-v2";
import { sortV2Frames, V2_LAYER_ORDER } from "../lib/content-layout-v2-rendering";

test("delivery keeps layer/z-index painting independent from reading order", () => {
  const layout = createV2PageLayout({ pageSize: { width: 600, height: 800 }, pages: [{ id: "page-1", frames: [] }] });
  const pageId = layout.pages[0].id;
  const frames = [
    createV2Frame("TEXT", pageId, { id: "late-reading", layer: "CONTENT", zIndex: 1, readingOrder: 99 }),
    createV2Frame("IMAGE", pageId, { id: "background", layer: "BACKGROUND", zIndex: 50, readingOrder: 1 }),
    createV2Frame("SHAPE", pageId, { id: "design", layer: "DESIGN", zIndex: 0, readingOrder: 0 }),
    createV2Frame("TEXT", pageId, { id: "early-reading", layer: "CONTENT", zIndex: 2, readingOrder: 0 }),
  ];
  assert.deepEqual(sortV2Frames(frames).map((frame) => frame.id), ["background", "late-reading", "early-reading", "design"]);
  assert.equal(V2_LAYER_ORDER.BACKGROUND < V2_LAYER_ORDER.CONTENT, true);
  assert.equal(V2_LAYER_ORDER.CONTENT < V2_LAYER_ORDER.DESIGN, true);
});

test("shared V2 delivery renderer preserves V1 fallback and audience mode", () => {
  const source = readFileSync("components/content/V2ContentDocumentRenderer.tsx", "utf8");
  assert.match(source, /getContentLayoutVersion\(document\) !== 2/);
  assert.match(source, /<StructuredContentRenderer document=\{document\} mode=\{mode\}/);
  assert.match(source, /mode=\{mode\} linkedAssets/);
  assert.doesNotMatch(source, /\/api\/admin\/resources/);
  assert.match(source, /data-v2-delivery-frame-id/);
});

test("student and teacher delivery resolve protected audience-specific resource routes", () => {
  const source = readFileSync("lib/content-delivery.ts", "utf8");
  assert.match(source, /ResourceAudience\.STUDENT, ResourceAudience\.BOTH/);
  assert.match(source, /ResourceAudience\.TEACHER_ONLY, ResourceAudience\.BOTH/);
  assert.match(source, /\/api\/student\/resources/);
  assert.match(source, /\/api\/resources/);
  assert.match(source, /published: true/);
  assert.match(source, /archived: false/);
  assert.match(source, /bookResourceLinks/);
});

test("Admin and delivery share the V2 text/image/container presentation primitives", () => {
  const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
  const textFrame = readFileSync("components/admin/books/editor/V2TextFrame.tsx", "utf8");
  const educationalFrame = readFileSync("components/admin/books/editor/V2EducationalFrame.tsx", "utf8");
  const pageCanvas = readFileSync("components/admin/books/editor/V2PageCanvas.tsx", "utf8");
  assert.match(workspace, /@\/components\/content\/v2\/V2FrameContent/);
  assert.match(workspace, /@\/components\/content\/v2\/V2ImageVisual/);
  assert.match(textFrame, /@\/components\/content\/v2\/V2TextVisual/);
  assert.match(educationalFrame, /@\/components\/content\/v2\/V2EducationalVisual/);
  assert.match(pageCanvas, /sortV2Frames/);
});
