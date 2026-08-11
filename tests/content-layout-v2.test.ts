import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  adoptLayoutV2,
  createV2PageLayout,
  getV2CropImagePercentages,
  normalizeV2ImageCrop,
  normalizeV2ImageTransform,
  V2_IMAGE_ZOOM_MAX,
  V2_IMAGE_ZOOM_MIN,
  getContentLayoutVersion,
  isLayoutV2Document,
  normalizePageLayoutV2,
  addV2FrameToPage,
  addV2Page,
  clampV2FrameGeometry,
  createV2Frame,
  reorderV2Page,
  updateV2Frame,
  V2_FRAME_TYPES,
} from "../lib/content-layout-v2";
import {
  createContentDocument,
  createImageBlock,
  createTextBlock,
  normalizeContentDocument,
  serializeContentDocument,
  updateBlock,
} from "../lib/content-document";

test("legacy documents remain V1 without a silent layout conversion", () => {
  const legacy = {
    version: 4,
    blocks: [{
      ...createTextBlock("paragraph", "Legacy text"),
      id: "legacy-text",
      periodId: "lesson-one",
      layout: { x: 18, y: 42, width: 520, height: 90, zIndex: 3 },
    }],
    periods: [{ id: "lesson-one", title: "Lesson One", sortOrder: 0 }],
    layout: "double" as const,
    canvas: { preset: "CUSTOM", width: 900, height: 1300, unit: "mm", orientation: "portrait", margins: { top: 10, right: 12, bottom: 10, left: 12 } },
  };

  const normalized = normalizeContentDocument(legacy);
  assert.equal(getContentLayoutVersion(normalized), 1);
  assert.equal(normalized.layoutVersion, undefined);
  assert.equal(normalized.pageLayout, undefined);
  assert.equal(normalized.layout, "double");
  assert.deepEqual(normalized.periods, legacy.periods);
  assert.equal(normalized.blocks[0]?.id, "legacy-text");
  assert.equal(normalized.blocks[0]?.layout?.x, legacy.blocks[0].layout.x);
  assert.equal(normalized.blocks[0]?.layout?.y, legacy.blocks[0].layout.y);
  assert.equal(normalized.blocks[0]?.layout?.width, legacy.blocks[0].layout.width);
  assert.equal(normalized.blocks[0]?.layout?.height, legacy.blocks[0].layout.height);
  assert.equal(normalized.blocks[0]?.layout?.zIndex, legacy.blocks[0].layout.zIndex);
  assert.equal(JSON.parse(serializeContentDocument(normalized)).layoutVersion, undefined);
  assert.equal(isLayoutV2Document(normalized), false);
});

test("explicit V2 adoption creates one blank page while preserving V1 content and periods", () => {
  const source = createContentDocument(
    [createTextBlock("paragraph", "Keep this in the V1 flow")],
    [{ id: "period-one", title: "Period One", sortOrder: 0 }],
  );
  const adopted = adoptLayoutV2(source);

  assert.equal(getContentLayoutVersion(adopted), 2);
  assert.equal(adopted.layoutVersion, 2);
  assert.equal(adopted.pageLayout?.pages.length, 1);
  assert.deepEqual(adopted.pageLayout?.pages[0]?.frames, []);
  assert.deepEqual(adopted.periods, source.periods);
  assert.equal(adopted.pageLayout?.pages[0] && "periodId" in adopted.pageLayout.pages[0], false);
  assert.equal(adopted.blocks[0]?.type, "paragraph");
});

test("ordinary block updates preserve the adopted V2 page layout", () => {
  const source = adoptLayoutV2(createContentDocument([createTextBlock("paragraph", "Before")]));
  const updated = updateBlock(source, source.blocks[0]!.id, (block) => ({ ...block, text: "After" }));
  assert.equal(updated.layoutVersion, 2);
  assert.equal(updated.pageLayout?.pages[0]?.id, source.pageLayout?.pages[0]?.id);
  assert.equal(updated.blocks[0]?.type, "paragraph");
});

test("V2 page and frame IDs survive normalization and save/reload", () => {
  const layout = createV2PageLayout({
    pageSize: { preset: "CUSTOM", width: 920, height: 1380, unit: "mm" },
    pages: [{
      id: "page-cover",
      frames: [
        {
          id: "frame-heading",
          type: "TEXT",
          x: 90,
          y: 500,
          width: 640,
          height: 120,
          zIndex: 4,
          layer: "CONTENT",
          layoutMode: "ABSOLUTE",
          wrapMode: "NONE",
          direction: "RTL",
          heightMode: "FIXED",
          overflow: "OVERSET",
          readable: true,
          readingOrder: 1,
          language: "hi-IN",
          narrationLabel: "Heading",
        },
        {
          id: "frame-image",
          type: "IMAGE",
          x: 40,
          y: 100,
          width: 400,
          height: 300,
          layer: "DESIGN",
          layoutMode: "FLOAT",
          wrapMode: "WRAP_RIGHT",
          resourceId: "resource-cover",
          fitMode: "CROP",
          crop: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 },
          zoom: 1.4,
          offsetX: 0.05,
          offsetY: -0.1,
          readable: false,
          readingOrder: 2,
        },
      ],
    }],
  });
  const source = adoptLayoutV2(createContentDocument([createImageBlock("image", { resourceId: "resource-cover", alt: "Cover" })]), layout);
  const reloaded = normalizeContentDocument(serializeContentDocument(source));
  const page = reloaded.pageLayout?.pages[0];
  const heading = page?.frames.find((frame) => frame.id === "frame-heading");
  const image = page?.frames.find((frame) => frame.id === "frame-image");

  assert.equal(page?.id, "page-cover");
  assert.equal(reloaded.pageLayout?.pageSize.width, 920);
  assert.equal(reloaded.pageLayout?.pageSize.height, 1380);
  assert.equal(reloaded.pageLayout?.pageSize.unit, "mm");
  assert.equal(heading?.readingOrder, 1);
  assert.equal(heading?.y, 500);
  assert.equal(heading?.direction, "RTL");
  assert.equal(heading?.heightMode, "FIXED");
  assert.equal(heading?.overflow, "OVERSET");
  assert.equal(heading?.language, "hi-IN");
  assert.equal(heading?.narrationLabel, "Heading");
  assert.equal(image?.readingOrder, 2);
  assert.equal(image?.y, 100);
  assert.equal(image?.resourceId, "resource-cover");
  assert.equal(image?.fitMode, "CROP");
  assert.deepEqual(image?.crop, { x: 0.1, y: 0.2, width: 0.7, height: 0.6 });
  assert.equal(image?.zoom, 1.4);
  assert.equal(image?.offsetX, 0.05);
  assert.equal(image?.offsetY, -0.1);
});

test("malformed V2 geometry and metadata normalize to safe values", () => {
  const normalized = normalizeContentDocument({
    version: 4,
    layoutVersion: 2,
    blocks: [],
    pageLayout: {
      pageSize: { preset: "CUSTOM", width: -10, height: 0, unit: "invalid" },
      pages: [{
        id: "page-safe",
        width: -1,
        height: 0,
        unit: "invalid",
        frames: [{
          id: "frame-safe",
          type: "TEXT",
          x: -40,
          y: -20,
          width: -4,
          height: 0,
          layer: "invalid",
          layoutMode: "invalid",
          wrapMode: "invalid",
          readingOrder: "invalid",
        }],
      }],
    },
  });
  const frame = normalized.pageLayout?.pages[0]?.frames[0];

  assert.equal(getContentLayoutVersion(normalized), 2);
  assert.equal(normalized.pageLayout?.pageSize.width, 1);
  assert.equal(normalized.pageLayout?.pageSize.height, 1);
  assert.equal(normalized.pageLayout?.pageSize.unit, "px");
  assert.equal(frame?.x, 0);
  assert.equal(frame?.y, 0);
  assert.equal(frame?.width, 1);
  assert.equal(frame?.height, 1);
  assert.equal(frame?.layer, "CONTENT");
  assert.equal(frame?.layoutMode, "FLOW");
  assert.equal(frame?.wrapMode, "NONE");
  assert.equal(frame?.readingOrder, 0);
});

test("missing V2 IDs are rejected during read normalization but generated during explicit creation", () => {
  const malformed = normalizePageLayoutV2({
    pageSize: { width: 800, height: 1000, unit: "px" },
    pages: [{ frames: [{ type: "TEXT" }] }],
  });
  assert.equal(malformed, undefined);

  const created = createV2PageLayout();
  const page = created.pages[0];
  assert.ok(page?.id);
  assert.equal(page?.frames.length, 0);
  assert.equal(new Set(created.pages.map((entry) => entry.id)).size, created.pages.length);
});

test("V2 geometry commits stay inside the logical page and page IDs survive reorder", () => {
  const layout = createV2PageLayout({ pageSize: { width: 500, height: 700, unit: "px" } });
  const page = layout.pages[0]!;
  const frame = createV2Frame("TEXT", page.id, { x: 20, y: 20, width: 100, height: 80 });
  const withFrame = addV2FrameToPage(layout, page.id, frame);
  const moved = updateV2Frame(withFrame, page.id, frame.id, { x: 480, y: 680, width: 200, height: 200 });
  const bounded = moved.pages[0]!.frames[0]!;
  assert.equal(bounded.x, 300);
  assert.equal(bounded.y, 500);
  assert.equal(bounded.width, 200);
  assert.equal(bounded.height, 200);
  assert.deepEqual(clampV2FrameGeometry({ x: -10, y: -10, width: 999, height: 999 }, 500, 700), { x: 0, y: 0, width: 500, height: 700 });

  const withSecondPage = addV2Page(moved);
  const secondPageId = withSecondPage.pages[1]!.id;
  const reordered = reorderV2Page(withSecondPage, secondPageId, -1);
  assert.equal(reordered.pages[0]?.id, secondPageId);
  assert.equal(reordered.pages[1]?.id, page.id);
  assert.equal(reordered.pages[1]?.frames[0]?.id, frame.id);
});

test("V2 workspace uses logical page scaling, absolute frames, clipping, and dedicated switching", () => {
  const workspace = readFileSync(new URL("../components/admin/books/editor/V2DocumentWorkspace.tsx", import.meta.url), "utf8");
  const canvas = readFileSync(new URL("../components/admin/books/editor/V2PageCanvas.tsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../components/admin/books/editor/V2Frame.tsx", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../components/admin/books/ContentManuscriptEditor.tsx", import.meta.url), "utf8");
  assert.match(workspace, /data-v2-unified-workspace/);
  assert.doesNotMatch(workspace, /Content Studio · Page Layout V2/);
  assert.match(workspace, /addV2Page/);
  assert.match(workspace, /reorderV2Page/);
  assert.match(canvas, /transform: `scale\(\$\{scale\}\)`/);
  assert.match(canvas, /overflow-hidden/);
  assert.match(frame, /left: `\$\{geometry\.x\}px`/);
  assert.match(frame, /top: `\$\{geometry\.y\}px`/);
  assert.doesNotMatch(frame, /transform: `translate/);
  assert.match(editor, /if \(usesLayoutV2\)/);
  assert.match(editor, /<V2DocumentWorkspace/);
});
test("the V2 frame type contract includes the planned content families", () => {
  assert.deepEqual(V2_FRAME_TYPES, [
    "TEXT",
    "IMAGE",
    "TABLE",
    "VIDEO",
    "EDUCATIONAL",
    "ACTIVITY",
    "WORKSHEET",
    "EXERCISE",
    "SHAPE",
  ]);
});

test("V2 image FIT, FILL, and CROP transforms stay normalized", () => {
  const fit = createV2Frame("IMAGE", "page-one", { resourceId: "image-one", fitMode: "FIT" });
  const fill = createV2Frame("IMAGE", "page-one", { resourceId: "image-one", fitMode: "FILL" });
  const crop = createV2Frame("IMAGE", "page-one", {
    resourceId: "image-one",
    fitMode: "CROP",
    crop: { x: 0.2, y: 0.1, width: 0.6, height: 0.75 },
    zoom: 2.25,
    offsetX: 0.15,
    offsetY: -0.2,
  });
  assert.equal(fit.fitMode, "FIT");
  assert.equal(fill.fitMode, "FILL");
  assert.deepEqual(normalizeV2ImageCrop({ x: 2, y: -1, width: 4, height: 0 }), { x: 0, y: 0, width: 1, height: 0.0001 });
  assert.deepEqual(normalizeV2ImageTransform({ crop: crop.crop, zoom: 99, offsetX: -4, offsetY: 4 }), {
    crop: crop.crop,
    zoom: V2_IMAGE_ZOOM_MAX,
    offsetX: -1,
    offsetY: 1,
  });
  assert.deepEqual(getV2CropImagePercentages(crop), getV2CropImagePercentages({ crop: crop.crop, zoom: crop.zoom, offsetX: crop.offsetX, offsetY: crop.offsetY }));
  assert.equal(V2_IMAGE_ZOOM_MIN, 1);
});

test("V2 image crop, aspect lock, resize geometry, and replacement persist independently", () => {
  const layout = createV2PageLayout({
    pageSize: { width: 900, height: 1200, unit: "px" },
    pages: [{
      id: "page-one",
      frames: [{
        id: "image-frame",
        type: "IMAGE",
        x: 80,
        y: 140,
        width: 420,
        height: 280,
        zIndex: 7,
        layer: "BACKGROUND",
        layoutMode: "ABSOLUTE",
        aspectLocked: true,
        resourceId: "old-image",
        fitMode: "CROP",
        crop: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 },
        zoom: 1.75,
        offsetX: 0.2,
        offsetY: -0.1,
      }],
    }],
  });
  const resized = updateV2Frame(layout, "page-one", "image-frame", { width: 500, height: 320 });
  const replaced = updateV2Frame(resized, "page-one", "image-frame", {
    resourceId: "new-image",
    fitMode: "FIT",
    crop: { x: 0, y: 0, width: 1, height: 1 },
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(replaced)));
  const frame = reloaded?.pages[0]?.frames[0];
  assert.deepEqual(frame && { id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height, zIndex: frame.zIndex, layer: frame.layer }, {
    id: "image-frame", x: 80, y: 140, width: 500, height: 320, zIndex: 7, layer: "BACKGROUND",
  });
  assert.equal(frame?.aspectLocked, true);
  assert.equal(frame?.resourceId, "new-image");
  assert.equal(frame?.fitMode, "FIT");
  assert.deepEqual(frame?.crop, { x: 0, y: 0, width: 1, height: 1 });
});

test("V2 image UI keeps crop interaction separate from frame geometry", () => {
  const workspace = readFileSync(new URL("../components/admin/books/editor/V2DocumentWorkspace.tsx", import.meta.url), "utf8");
  const canvas = readFileSync(new URL("../components/admin/books/editor/V2PageCanvas.tsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../components/admin/books/editor/V2Frame.tsx", import.meta.url), "utf8");
  assert.match(workspace, /FIT/);
  assert.match(workspace, /FILL/);
  assert.match(workspace, /Crop/);
  assert.match(workspace, /Replace Image/);
  assert.match(workspace, /Upload Image/);
  assert.match(workspace, /getV2CropImagePercentages/);
  assert.match(workspace, /onPointerUp={endPan}/);
  assert.match(workspace, /object-contain/);
  assert.match(workspace, /object-cover/);
  assert.match(canvas, /object-cover/);
  assert.match(frame, /aspectLocked \|\| event\.shiftKey/);
  assert.match(frame, /overflow-hidden/);
});
