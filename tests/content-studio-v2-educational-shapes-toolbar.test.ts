import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EDUCATIONAL_OBJECT_REGISTRY,
  getEducationalObjectDefinition,
} from "../lib/educational-object-registry";
import {
  createV2Frame,
  createV2PageLayout,
  getV2Frame,
  normalizePageLayoutV2,
  updateV2Frame,
} from "../lib/content-layout-v2";
import { getV2ShapePayload } from "../components/content/v2/V2ShapeVisual";
import { shouldSyncV2EducationalEditableDom } from "../components/admin/books/editor/V2EducationalEditor";

const read = (path: string) => readFileSync(path, "utf8");
const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
const studio = read("components/admin/books/ContentManuscriptEditor.tsx");
const educationalVisual = read("components/content/v2/V2EducationalVisual.tsx");
const educationalFrame = read("components/admin/books/editor/V2EducationalFrame.tsx");
const educationalEditor = read("components/admin/books/editor/V2EducationalEditor.tsx");
const shapeVisual = read("components/content/v2/V2ShapeVisual.tsx");
const delivery = read("components/content/V2ContentDocumentRenderer.tsx");

test("JPG, PNG, and WEBP resource creation preserves Resource.type IMAGE separately from canonical MIME", () => {
  assert.match(studio, /input\.type === ResourceType\.IMAGE/);
  assert.match(studio, /type: input\.type/);
  assert.match(studio, /mimeType: uploaded\.contentType/);
  assert.match(workspace, /isV2ImageResource/);
  assert.match(workspace, /isV2VideoResource/);
});

test("every registered Educational Block resolves centralized semantic visual metadata", () => {
  for (const [type] of EDUCATIONAL_OBJECT_REGISTRY) {
    const definition = getEducationalObjectDefinition(type);
    assert.ok(definition.icon);
    assert.ok(definition.description);
    assert.match(definition.theme.border, /^#/);
    assert.match(definition.theme.tint, /^#/);
    assert.match(definition.theme.accent, /^#/);
  }
  assert.match(educationalVisual, /data-v2-educational-theme/);
  assert.match(educationalVisual, /definition\.theme\.border/);
});

test("Educational body uses native caret-preserving editing and canonical payload persistence", () => {
  let domText = "";
  let emitted: string | null = null;
  for (const next of ["a", "ab", "abc", "vikas sharma"]) {
    domText = next;
    emitted = next;
    assert.equal(shouldSyncV2EducationalEditableDom(next, domText, true, emitted), false);
  }
  const frame = createV2Frame("EDUCATIONAL", "page-a", { id: "educational-a", payload: { educationalObjectType: "example", title: "Example", body: "vikas sharma" } });
  const layout = createV2PageLayout({ pages: [{ id: "page-a", frames: [frame] }] });
  const updated = updateV2Frame(layout, "page-a", "educational-a", { payload: { educationalObjectType: "example", title: "Worked example", body: "vikas sharma" } });
  const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(updated)))!;
  assert.equal((getV2Frame(reloaded, "page-a", "educational-a")!.payload as Record<string, unknown>).title, "Worked example");
  assert.equal((getV2Frame(reloaded, "page-a", "educational-a")!.payload as Record<string, unknown>).body, "vikas sharma");
  assert.match(educationalEditor, /contentEditable/);
  assert.match(educationalEditor, /data-v2-educational-editor/);
  assert.match(educationalFrame, /onPayloadChange/);
});

test("Educational children remain canonical parentId child frames for Image, Video, and Table", () => {
  const image = createV2Frame("IMAGE", "page-a", { id: "image-a", parentId: "educational-a", resourceId: "image-resource" });
  const video = createV2Frame("VIDEO", "page-a", { id: "video-a", parentId: "educational-a", resourceId: "video-resource" });
  const table = createV2Frame("TABLE", "page-a", { id: "table-a", parentId: "educational-a", payload: { rows: 1, columns: 1, cells: [""] } });
  const educational = createV2Frame("EDUCATIONAL", "page-a", { id: "educational-a", width: 500, height: 220, children: [image, video, table] });
  const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(createV2PageLayout({ pages: [{ id: "page-a", frames: [educational] }] }))))!;
  const children = reloaded.pages[0]!.frames[0]!.children!;
  assert.deepEqual(children.map((child) => child.parentId), ["educational-a", "educational-a", "educational-a"]);
  for (const child of children) assert.ok(child.x >= 0 && child.y >= 0 && child.x + child.width <= 500 && child.y + child.height <= 220);
  assert.match(workspace, /selectedFrame\.type === "EDUCATIONAL"/);
  assert.match(workspace, /addChildFrame\("IMAGE", resource\.id\)/);
  assert.match(workspace, /addChildFrame\("VIDEO", resource\.id\)/);
  assert.match(workspace, /addChildFrame\("TABLE", undefined, payload\)/);
});

test("the direct Shape picker creates real V2 shape payloads and properties", () => {
  for (const shapeType of ["RECTANGLE", "ROUNDED_RECTANGLE", "ELLIPSE", "LINE"]) {
    const frame = createV2Frame("SHAPE", "page-a", { payload: { shapeType } });
    assert.equal(getV2ShapePayload(frame.payload).shapeType, shapeType);
  }
  assert.match(workspace, /data-v2-shape-picker/);
  assert.match(workspace, /Shape Properties/);
  assert.match(workspace, /Shape fill colour/);
  assert.match(workspace, /Shape border width/);
  assert.match(shapeVisual, /data-v2-shape-type/);
});

test("toolbar has tabs left, actions right, no duplicate module title, and direct Insert commands", () => {
  assert.doesNotMatch(workspace, /aria-label="Module title"/);
  assert.ok(workspace.indexOf('aria-label="Content Studio ribbon"') < workspace.indexOf("data-v2-top-actions"));
  assert.doesNotMatch(workspace, /data-v2-insert-more/);
  for (const label of ["Text Box", "Image", "Video", "Table", "Shape", "Educational Block"]) assert.match(workspace, new RegExp(">" + label + "<"));
  assert.match(workspace, /data-v2-import-controls/);
  assert.match(workspace, /onClick=\{onOpenImport\}/);
  assert.doesNotMatch(workspace, /Accessibility Diagnostics/);
});

test("current V2 delivery remains the preview source while Image, Video, and Table paths remain present", () => {
  assert.match(studio, /V2ContentDocumentRenderer/);
  assert.match(delivery, /V2FrameContent/);
  assert.match(workspace, /getV2VideoDisplayMode/);
  assert.match(workspace, /data-v2-table-chooser/);
});
