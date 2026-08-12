import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  createV2Frame,
  createV2PageLayout,
  updateV2Frame,
} from "../lib/content-layout-v2";
import {
  getV2InlineFrameGeometry,
  getV2TextFramePatch,
  getV2TextWrapExclusions,
  isV2InlineFrame,
  layoutV2TextFrame,
} from "../lib/content-layout-v2-text";

test("V2 text defaults to explicit LTR and preserves explicit RTL", () => {
  const ltr = createV2Frame("TEXT", "page-one", { payload: "Hello world" });
  const rtl = createV2Frame("TEXT", "page-one", { direction: "RTL", payload: "שלום" });
  assert.equal(ltr.direction, "LTR");
  assert.equal(rtl.direction, "RTL");
  assert.equal(ltr.readable, true);
});

test("V2 text auto height grows and fixed text reports overset without losing content", () => {
  const auto = createV2Frame("TEXT", "page-one", { x: 20, y: 20, width: 280, height: 48, heightMode: "AUTO", fontSize: 16, lineHeight: 1.4 });
  const shortPatch = getV2TextFramePatch(auto, "Short text", [auto], 500, 400);
  const longPatch = getV2TextFramePatch(auto, "Long text ".repeat(100), [auto], 500, 400);
  assert.ok(longPatch.height >= shortPatch.height);
  const fixed = createV2Frame("TEXT", "page-one", { x: 20, y: 20, width: 280, height: 48, heightMode: "FIXED", overflow: "OVERSET" });
  const fixedLayout = layoutV2TextFrame(fixed, "Long text ".repeat(100), [fixed]);
  const fixedPatch = getV2TextFramePatch(fixed, "Long text ".repeat(100), [fixed], 500, 400);
  assert.equal(fixedLayout.overset, true);
  assert.equal(fixedPatch.overset, true);
  assert.equal(fixed.height, 48);
});

test("large imported story layout remains bounded while retaining visible text", () => {
  const frame = createV2Frame("TEXT", "page-one", { x: 20, y: 20, width: 280, height: 120, heightMode: "AUTO", fontSize: 16, lineHeight: 1.4 });
  const text = "A".repeat(1_500_000);
  const layout = layoutV2TextFrame(frame, text, [frame]);
  assert.equal(layout.lines.length <= 512, true);
  assert.equal(layout.lines[0]?.text.length > 0, true);
  assert.equal(layout.overset, true);
});
test("V2 rectangular wrap is local, logical-coordinate, and mode-specific", () => {
  const text = createV2Frame("TEXT", "page-one", { x: 20, y: 20, width: 420, height: 300, fontSize: 16, lineHeight: 1.4 });
  const image = createV2Frame("IMAGE", "page-one", { x: 160, y: 20, width: 120, height: 100, layoutMode: "FLOAT", wrapMode: "WRAP_LEFT", wrapPadding: 10 });
  assert.equal(getV2TextWrapExclusions(text, [text, image]).length, 1);
  const left = layoutV2TextFrame(text, "A paragraph that should wrap around the object.", [text, image]);
  assert.ok(left.lines[0]!.width < text.width - 24);
  const right = layoutV2TextFrame(text, "A paragraph that should wrap around the object.", [text, { ...image, wrapMode: "WRAP_RIGHT" }]);
  assert.ok(right.lines[0]!.x > text.x);
  const both = layoutV2TextFrame(text, "A paragraph that should wrap around the object.", [text, { ...image, wrapMode: "WRAP_BOTH" }]);
  assert.ok(both.lines[0]!.width > 0);
  const moved = layoutV2TextFrame(text, "A paragraph that should not wrap on the first line.", [text, { ...image, y: 500 }]);
  assert.equal(moved.lines[0]!.width, text.width - 24);
  const background = layoutV2TextFrame(text, "Background images do not exclude text.", [text, { ...image, layer: "BACKGROUND" }]);
  assert.equal(background.lines[0]!.width, text.width - 24);
});

test("V2 inline placement and reading order remain separate from visual coordinates", () => {
  const text = createV2Frame("TEXT", "page-one", { x: 40, y: 50, width: 300, height: 100, readingOrder: 1 });
  const inline = createV2Frame("IMAGE", "page-one", { x: 700, y: 700, width: 120, height: 80, layoutMode: "INLINE", readingOrder: 2 });
  assert.equal(isV2InlineFrame(inline), true);
  const inlineGeometry = getV2InlineFrameGeometry(inline, [text, inline], 500, 600);
  assert.equal(inlineGeometry.x, text.x);
  assert.ok(inlineGeometry.y > text.y);
  const moved = updateV2Frame(createV2PageLayout({ pages: [{ id: "page-one", frames: [text, inline] }] }), "page-one", text.id, { y: 10 });
  assert.equal(moved.pages[0]?.frames.find((frame) => frame.id === text.id)?.readingOrder, 1);
  assert.equal(moved.pages[0]?.frames.find((frame) => frame.id === inline.id)?.readingOrder, 2);
});

test("V2 text flow uses shared renderer hooks and safe editing behavior", () => {
  const workspace = readFileSync(new URL("../components/admin/books/editor/V2DocumentWorkspace.tsx", import.meta.url), "utf8");
  const textFrame = readFileSync(new URL("../components/admin/books/editor/V2TextFrame.tsx", import.meta.url), "utf8");
  const canvas = readFileSync(new URL("../components/admin/books/editor/V2PageCanvas.tsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../components/admin/books/editor/V2Frame.tsx", import.meta.url), "utf8");
  assert.match(workspace, /Read order/);
  assert.match(workspace, /Text direction/);
  assert.match(textFrame, /dir=\{direction\}/);
  assert.match(textFrame, /aria-multiline/);
  assert.match(textFrame, /getV2TextFramePatch/);
  assert.match(textFrame, /execCommand\("insertText"/);
  assert.match(canvas, /onDraftGeometryChange/);
  assert.match(canvas, /getV2InlineFrameGeometry/);
  assert.match(frame, /isContentEditable/);
});
