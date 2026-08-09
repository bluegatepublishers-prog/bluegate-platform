import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  arrangeV2Frame,
  createV2Frame,
  createV2PageLayout,
  deleteV2Frame,
  duplicateV2Frame,
  getV2Frame,
  moveV2ChildToPage,
  moveV2FrameToContainer,
  normalizePageLayoutV2,
  normalizeV2LayerZIndices,
  updateV2FrameLayer,
} from "../lib/content-layout-v2";

function fixture() {
  const layout = createV2PageLayout({ pageSize: { width: 600, height: 800 }, pages: [{ id: "page-1", frames: [] }] });
  const page = layout.pages[0];
  const background = createV2Frame("IMAGE", page.id, { id: "background", x: 0, y: 0, width: 600, height: 800, layer: "BACKGROUND", zIndex: 9, resourceId: "shared-image" });
  const text = createV2Frame("TEXT", page.id, { id: "heading", x: 120, y: 180, width: 240, height: 60, layer: "CONTENT", zIndex: 5, readingOrder: 1, payload: "Heading" });
  const container = createV2Frame("EDUCATIONAL", page.id, { id: "box", x: 100, y: 200, width: 300, height: 240, layer: "DESIGN", zIndex: 1, payload: { title: "Key Point", fill: "#eef2ff" }, children: [
    createV2Frame("IMAGE", page.id, { id: "box-image", x: 20, y: 30, width: 180, height: 120, zIndex: 0, layer: "CONTENT", resourceId: "shared-image", readable: false, readingOrder: 9 }),
    createV2Frame("TEXT", page.id, { id: "box-text", x: 30, y: 50, width: 220, height: 50, zIndex: 2, layer: "CONTENT", payload: "Text over image", readingOrder: 1 }),
    createV2Frame("EDUCATIONAL", page.id, { id: "invalid-container", x: 0, y: 0, width: 10, height: 10 }),
  ] });
  return { layout: normalizeV2LayerZIndices({ ...layout, pages: [{ ...page, frames: [background, text, container] }] }), pageId: page.id };
}

describe("V2-5 layers and controlled containers", () => {
  it("normalizes layer-local zIndex without changing reading order or geometry", () => {
    const { layout, pageId } = fixture();
    const page = layout.pages.find((entry) => entry.id === pageId)!;
    assert.equal(page.frames.find((frame) => frame.id === "background")?.zIndex, 0);
    const before = page.frames.find((frame) => frame.id === "heading")!;
    const changed = updateV2FrameLayer(layout, pageId, "heading", "BACKGROUND");
    const moved = getV2Frame(changed, pageId, "heading")!;
    assert.deepEqual({ x: moved.x, y: moved.y, readingOrder: moved.readingOrder }, { x: before.x, y: before.y, readingOrder: before.readingOrder });
    assert.equal(moved.layer, "BACKGROUND");
  });

  it("arranges only within the current layer and keeps deterministic zIndex values", () => {
    const { layout, pageId } = fixture();
    const withSecond = { ...layout, pages: layout.pages.map((page) => ({ ...page, frames: [...page.frames, createV2Frame("SHAPE", page.id, { id: "panel", layer: "DESIGN", zIndex: 7 })] })) };
    const changed = arrangeV2Frame(withSecond, pageId, "box", "FRONT");
    assert.equal(getV2Frame(changed, pageId, "box")?.zIndex, 1);
    assert.equal(getV2Frame(changed, pageId, "heading")?.zIndex, 0);
    assert.equal(getV2Frame(changed, pageId, "box")?.readingOrder, getV2Frame(withSecond, pageId, "box")?.readingOrder);
  });

  it("keeps one controlled child level and rejects recursive educational children", () => {
    const { layout, pageId } = fixture();
    const container = getV2Frame(layout, pageId, "box")!;
    assert.equal(container.children?.length, 2);
    assert.equal(container.children?.some((child) => child.type === "EDUCATIONAL"), false);
    const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(layout)));
    assert.equal(reloaded?.pages[0].frames.find((frame) => frame.id === "box")?.children?.length, 2);
  });

  it("converts page coordinates to local coordinates and back without changing IDs or resources", () => {
    const { layout, pageId } = fixture();
    const nested = moveV2FrameToContainer(layout, pageId, "heading", "box");
    const child = getV2Frame(nested, pageId, "heading")!;
    assert.equal(child.parentId, "box");
    assert.deepEqual({ x: child.x, y: child.y }, { x: 20, y: 0 });
    const detached = moveV2ChildToPage(nested, pageId, "box", "heading");
    const pageFrame = getV2Frame(detached, pageId, "heading")!;
    assert.equal(pageFrame.parentId, undefined);
    assert.deepEqual({ x: pageFrame.x, y: pageFrame.y }, { x: 120, y: 200 });
  });

  it("supports child-local stacking, duplicate child IDs, and document-only deletion", () => {
    const { layout, pageId } = fixture();
    const reordered = arrangeV2Frame(layout, pageId, "box-text", "FRONT");
    assert.equal(getV2Frame(reordered, pageId, "box-text")?.zIndex, 1);
    const duplicate = duplicateV2Frame(layout, pageId, "box");
    const duplicateContainer = duplicate.pages[0].frames.find((frame) => frame.id !== "box" && frame.type === "EDUCATIONAL");
    assert.ok(duplicateContainer);
    assert.notEqual(duplicateContainer?.children?.[0].id, "box-image");
    assert.equal(getV2Frame(deleteV2Frame(layout, pageId, "box"), pageId, "box-image"), undefined);
    assert.equal("shared-image", getV2Frame(layout, pageId, "background")?.resourceId);
  });
});

describe("V2-5 authoring surface", () => {
  it("exposes compact navigator, Arrange actions, child actions, and detach controls", () => {
    const source = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
    assert.match(source, /Page Objects/);
    assert.match(source, /Bring to Front/);
    assert.match(source, /Send to Back/);
    assert.match(source, /Move Earlier/);
    assert.match(source, /Move to Page/);
    assert.match(source, /addChildFrame/);
  });

  it("renders clipped controlled containers with the same V2 frame interaction", () => {
    const source = readFileSync("components/admin/books/editor/V2EducationalFrame.tsx", "utf8");
    assert.match(source, /overflow-hidden/);
    assert.match(source, /V2Frame/);
    assert.match(source, /application\/x-v2-frame/);
  });
});
