import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { filterDocumentForMode } from "../lib/content-audience";
import { createContentDocument, createImageBlock, createMediaBlock, createTableBlock, createTextBlock, type ContentBlock } from "../lib/content-document";
import { adoptLayoutV2, createV2CompatibilityLayout, createV2Frame } from "../lib/content-layout-v2";

const read = (path: string) => readFileSync(path, "utf8");

test("legacy V1 content projects into stable V2 pages and frames without rewriting the source document", () => {
  const source = createContentDocument([
    { ...createTextBlock("paragraph", "Legacy text"), id: "legacy-text" },
    { ...createImageBlock("image", { resourceId: "image-resource", alt: "Legacy image" }), id: "legacy-image" },
    { ...createMediaBlock({ mediaKind: "video", targetId: "video-resource" }), id: "legacy-video" },
    { ...createTableBlock("table", undefined, { rows: 2, columns: 2 }), id: "legacy-table" },
  ]);
  const before = JSON.stringify(source);
  const projection = createV2CompatibilityLayout(source);
  assert.equal(JSON.stringify(source), before);
  assert.equal(source.layoutVersion, undefined);
  assert.equal(projection.pages.length, 1);
  assert.deepEqual(projection.pages[0]?.frames.map((frame) => [frame.id, frame.type, frame.contentRef?.blockId]), [
    ["legacy-v1-frame-legacy-text", "TEXT", "legacy-text"],
    ["legacy-v1-frame-legacy-image", "IMAGE", "legacy-image"],
    ["legacy-v1-frame-legacy-video", "VIDEO", "legacy-video"],
    ["legacy-v1-frame-legacy-table", "TABLE", "legacy-table"],
  ]);
});

test("publisher always opens the unified V2 workspace and only editing promotes a legacy document", () => {
  const editor = read("components/admin/books/ContentManuscriptEditor.tsx");
  assert.match(editor, /createV2CompatibilityLayout/);
  assert.match(editor, /workspaceDocument/);
  assert.match(editor, /data-testid="content-studio-editor"/);
  assert.match(editor, /const usesLayoutV2 = true/);
  assert.match(editor, /if \(usesLayoutV2\)/);
  assert.match(editor, /layoutVersion: 2 as const, pageLayout: createV2CompatibilityLayout\(current\)/);
});

test("V2 ribbon keeps every primary Insert command visible directly", () => {
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
  assert.match(workspace, /data-v2-ribbon/);
  assert.match(workspace, /\["HOME", "INSERT", "REVIEW", "VIEW", "IMPORT"\]/);
  assert.match(workspace, /\["TEXT", "IMAGE", "VIDEO", "TABLE", "EDUCATIONAL"\]/);
  assert.doesNotMatch(workspace, /data-v2-insert-more/);
  for (const label of ["Image", "Video", "Table", "Shape", "Educational Block"]) assert.match(workspace, new RegExp(">" + label + "<"));
  assert.match(workspace, /data-v2-import-controls/);
  assert.match(workspace, /data-v2-right-panel/);
  assert.match(workspace, /xl:grid-cols-\[minmax\(0,1fr\)_18rem\]/);
});

test("Teacher navigation exposes the existing Teaching Plan, shared V2 viewer, and assignment context", () => {
  const overview = read("app/teacher-dashboard/classes/[sectionId]/page.tsx");
  const viewer = read("app/teacher-dashboard/classes/[sectionId]/content/[chapterId]/page.tsx");
  assert.match(overview, /teacher-v2-content-entry/);
  assert.match(overview, /Teaching Plan &amp; Published Book Pages/);
  assert.match(viewer, /V2ContentDocumentRenderer/);
  assert.match(viewer, /Create Classwork \/ Homework/);
});

test("Student dashboard links into the existing V2 chapter workspace and student work remains available", () => {
  const dashboard = read("app/student-dashboard/page.tsx");
  const chapter = read("app/student-dashboard/subjects/[sectionSubjectId]/chapters/[chapterId]/page.tsx");
  assert.match(dashboard, /My Class content/);
  assert.match(dashboard, /tab=chapters/);
  assert.match(chapter, /StudentWorkBook/);
  assert.match(chapter, /Read/);
  assert.match(chapter, /Ask AI/);
});

test("V2 audience rules continue to filter teacher-only frames for students", () => {
  const pageId = "audience-page";
  const blocks = [createTextBlock("paragraph", "Student text")] as ContentBlock[];
  const document = adoptLayoutV2(createContentDocument(blocks), {
    pageSize: { width: 600, height: 800, unit: "px" },
    pages: [{ id: pageId, order: 0, width: 600, height: 800, unit: "px", frames: [
      createV2Frame("TEXT", pageId, { id: "student-frame", payload: "Student content", audience: "ALL" }),
      createV2Frame("TEXT", pageId, { id: "teacher-frame", payload: "Teacher content", audience: "TEACHER" }),
    ] }],
  });
  assert.deepEqual(filterDocumentForMode(document, "STUDENT", []).pageLayout?.pages[0]?.frames.map((frame) => frame.id), ["student-frame"]);
  assert.deepEqual(filterDocumentForMode(document, "TEACHER", []).pageLayout?.pages[0]?.frames.map((frame) => frame.id), ["student-frame", "teacher-frame"]);
});
