import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getV2InsertionGeometry } from "../lib/content-layout-v2";

const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
const canvas = readFileSync("components/admin/books/editor/V2PageCanvas.tsx", "utf8");
const frame = readFileSync("components/admin/books/editor/V2Frame.tsx", "utf8");
const editor = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");

test("editor ribbon is sticky inside a bounded workspace", () => {
  assert.match(workspace, /data-v2-sticky-header/);
  assert.match(workspace, /sticky top-0 z-40/);
  assert.match(workspace, /h-full min-h-0[^"]*overflow-hidden/);
});

test("only the active tab contributes its command group", () => {
  for (const tab of ["HOME", "INSERT", "REVIEW", "VIEW"]) assert.match(workspace, new RegExp(`activeRibbonTab === "${tab}"`));
  assert.match(workspace, /data-active-tab=\{activeRibbonTab\}/);
});

test("Home exposes primary text formatting controls", () => {
  for (const label of ["Font", "Font size", "Bold", "Italic", "Underline", "Text colour", "Highlight", "Text alignment", "Bullets", "Numbering"]) assert.match(workspace, new RegExp(label));
});

test("advanced Home formatting is grouped under named menus", () => {
  for (const label of ["Clipboard ▾", "Font ▾", "Paragraph ▾", "Styles ▾"]) assert.match(workspace, new RegExp(label));
  assert.doesNotMatch(workspace, /data-v2-home-more/);
  for (const label of ["Strikethrough", "Superscript", "Subscript", "Increase Indent", "Decrease Indent", "Line Spacing"]) assert.match(workspace, new RegExp(label));
});

test("Insert exposes the primary publishing objects", () => {
  for (const label of ["Text Box", "Image", "Video", "Table", "Shape", "Educational Block"]) assert.match(workspace, new RegExp(`>${label}<`));
  assert.match(workspace, /data-v2-import-controls/);
  assert.doesNotMatch(workspace, /data-v2-insert-more/);
});

test("Image opens the resource and upload chooser before creating a frame", () => {
  assert.match(workspace, /openInsertSurface\("IMAGE"\)/);
  assert.match(workspace, /data-v2-insert-chooser=\{insertSurface\}/);
  assert.match(workspace, /Choose existing \{insertSurface\.toLowerCase\(\)\}/);
  assert.match(editor, /onUploadResource=/);
});

test("Video opens the resource and upload chooser", () => {
  assert.match(workspace, /openInsertSurface\("VIDEO"\)/);
  assert.match(workspace, /videoResources/);
  assert.match(workspace, /accept=\{insertSurface === "IMAGE" \? "image\/\*" : "video\/\*"\}/);
});

test("Table opens a rows and columns chooser", () => {
  assert.match(workspace, /data-v2-table-chooser/);
  assert.match(workspace, />Rows</);
  assert.match(workspace, />Columns</);
  assert.match(workspace, />Create Table</);
  assert.match(editor, /createTableBlock\("table", undefined, \{ rows, columns \}\)/);
});

test("every inserted frame becomes selected and is scrolled into view", () => {
  assert.match(workspace, /setSelectedFrameId\(frame\.id\)/);
  assert.match(workspace, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
  assert.match(workspace, /focus\(\{ preventScroll: true \}\)/);
});

test("default and explicit insertion geometry remain in page bounds", () => {
  const page = { width: 300, height: 220, frames: [] };
  const fallback = getV2InsertionGeometry(page, "TABLE");
  const explicit = getV2InsertionGeometry(page, "IMAGE", { x: 999, y: 999 });
  for (const geometry of [fallback, explicit]) {
    assert.ok(geometry.x >= 0 && geometry.y >= 0);
    assert.ok(geometry.x + geometry.width <= page.width);
    assert.ok(geometry.y + geometry.height <= page.height);
  }
  assert.match(canvas, /data-v2-insertion-point/);
});

test("Educational Block uses the canonical picker and becomes selected", () => {
  assert.match(workspace, /EDUCATIONAL_OBJECT_REGISTRY\.map/);
  assert.match(workspace, /getEducationalObjectDefinition\(type\)/);
  assert.match(workspace, /educationalObjectType: type, title: definition\.defaultTitle, body: ""/);
  assert.match(editor, /isEducationalObjectType/);
});

test("Arrange commands are contextual and the former giant row is hidden", () => {
  assert.match(workspace, /data-v2-contextual-actions/);
  assert.match(workspace, /data-v2-arrange-menu/);
  assert.match(workspace, /data-v2-authoring-controls="arrange-legacy-hidden"/);
  assert.match(workspace, /className="hidden flex-wrap[^"]*" data-v2-authoring-controls/);
});

test("Delete removes a selected non-text object", () => {
  assert.match(frame, /event\.key === "Delete" \|\| event\.key === "Backspace"/);
  assert.match(frame, /onDelete\(frame\.id, parentId\)/);
  assert.match(workspace, /onDeleteFrame=\{\(frameId\) => deleteFrame\(frameId\)\}/);
});

test("Backspace in text editing does not delete the frame", () => {
  const editGuard = frame.indexOf("event.target.closest");
  const deleteBranch = frame.indexOf('event.key === "Delete"');
  assert.ok(editGuard >= 0 && editGuard < deleteBranch);
  assert.match(frame, /\[contenteditable="true"\]/);
});

test("View controls render only in the View tab", () => {
  assert.match(workspace, /activeRibbonTab === "VIEW"/);
  assert.match(workspace, />Fit Page</);
  assert.match(workspace, />Fit Width</);
  assert.match(workspace, /data-v2-view-controls/);
  assert.match(workspace, />Properties</);
  assert.match(workspace, />Guides</);
});

test("Flow controls live in properties instead of a permanent toolbar", () => {
  assert.match(workspace, /data-v2-layout-properties/);
  assert.match(workspace, /Flow &amp; Wrap/);
  assert.match(workspace, /<div className="hidden flex-wrap items-center gap-2 border-b border-slate-200/);
});

test("Read Aloud is collapsed behind the Review command", () => {
  assert.match(workspace, /aria-expanded=\{narrationOpen\}/);
  assert.match(workspace, /narrationOpen \? <div data-v2-read-aloud-panel/);
  assert.match(workspace, /<div className="hidden flex-wrap items-center gap-3 border-b border-blue-200/);
});

test("properties and canvas use separate non-overlapping scroll regions", () => {
  assert.match(workspace, /data-v2-editor-body/);
  assert.match(workspace, /data-v2-canvas-scroll/);
  assert.match(workspace, /data-v2-right-panel/);
  assert.match(workspace, /h-full min-h-0[^"]*overflow-y-auto/);
  assert.match(workspace, /xl:grid-cols-\[minmax\(0,1fr\)_18rem\]/);
});
