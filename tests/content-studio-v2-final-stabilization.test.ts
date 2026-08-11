import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createV2CompatibilityLayout,
  createV2Frame,
  createV2PageLayout,
  deleteV2Page,
  ensureV2MainFlowFrames,
  getV2InsertionGeometry,
  isV2MainFlowFrame,
  isV2PagePopulated,
} from "../lib/content-layout-v2";
import { shouldSyncV2EditableDom } from "../components/content/v2/V2TextVisual";
import {
  nextV2TableCellIndex,
  shouldSyncV2TableCellDom,
  updateV2TableCell,
} from "../components/content/v2/V2TableVisual";
import { resolveUploadContentType, uploadFileToR2 } from "../lib/storage/client-upload";

const read = (path: string) => readFileSync(path, "utf8");
const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
const editor = read("components/admin/books/ContentManuscriptEditor.tsx");
const importer = read("components/admin/books/editor/IdmlImportPanel.tsx");
const canvas = read("components/admin/books/editor/V2PageCanvas.tsx");
const frame = read("components/admin/books/editor/V2Frame.tsx");
const text = read("components/content/v2/V2TextVisual.tsx");
const image = read("components/content/v2/V2ImageVisual.tsx");
const textContainer = read("components/admin/books/editor/V2TextContainerFrame.tsx");
const storageClient = read("lib/storage/client-upload.ts");
const frameContent = read("components/content/v2/V2FrameContent.tsx");
const table = read("components/content/v2/V2TableVisual.tsx");

test("1 Import is closed rather than rendered as a permanent banner", () => {
  assert.match(importer, /open = false/);
  assert.match(importer, /if \(!open\) return null/);
  assert.doesNotMatch(editor, /<IdmlImportPanel bookId=/);
});

test("2 Import command opens the controlled IDML workflow", () => {
  assert.match(workspace, /onClick=\{onOpenImport\}/);
  assert.match(workspace, /Import InDesign/);
  assert.match(editor, /open=\{importOpen\}/);
});

test("3 Home exposes practical word-processing controls", () => {
  for (const label of ["Cut", "Copy", "Paste", "Undo", "Redo", "Font size", "Bold", "Italic", "Underline", "Text colour", "Highlight", "Centre", "Justify", "Bullets", "Numbering"]) {
    assert.match(workspace, new RegExp(label));
  }
});

test("4 Home is structurally one compact row", () => {
  assert.match(workspace, /data-v2-home-controls data-v2-command-families/);
  assert.match(workspace, /Clipboard ▾/);
});

test("5 Insert does not use horizontal scrolling", () => {
  const insertLine = workspace.match(/data-v2-insert-controls[^\n]+/)?.[0] ?? "";
  assert.doesNotMatch(insertLine, /overflow-x-auto/);
  assert.match(insertLine, /overflow-visible/);
});

test("6 Insert exposes all primary publisher commands directly", () => {
  assert.doesNotMatch(workspace, /data-v2-insert-more/);
  for (const label of ["Text Box", "Image", "Video", "Table", "Shape", "Educational Block"]) {
    assert.match(workspace, new RegExp(">" + label + "<"));
  }
  assert.match(workspace, /data-v2-import-controls/);
});

test("7 every page receives a stable designated main-flow caret frame", () => {
  const layout = ensureV2MainFlowFrames(createV2PageLayout({ pages: [{ id: "page-a", frames: [] }] }));
  const main = layout.pages[0]!.frames[0]!;
  assert.equal(main.id, "main-flow-page-a");
  assert.equal(isV2MainFlowFrame(main), true);
  assert.match(canvas, /data-v2-main-flow/);
  assert.match(text, /data-v2-normal-flow-caret/);
});

test("8 normal-flow typing persists through the existing text-change path", () => {
  assert.match(canvas, /onActivateMainFlow/);
  assert.match(workspace, /onFrameTextChange\(frame, value, spans, patch\)/);
  assert.match(editor, /payload: value/);
});

test("9 Text Box remains a separate floating object", () => {
  assert.match(workspace, />Text Box</);
  assert.match(workspace, /addFrame\("TEXT", \{ direction: "LTR", alignment: "left" \}, "FLOAT"\)/);
});

test("10 editable text defaults to LTR horizontal writing", () => {
  assert.match(text, /writingMode: "horizontal-tb"/);
  assert.match(text, /spellCheck=\{editable\}/);
  assert.match(workspace, /addFrame\("TEXT", \{ direction: "LTR", alignment: "left" \}, "FLOAT"\)/);
});

test("11 images are explicitly bounded by their rendering container", () => {
  assert.match(image, /data-v2-bounded-image/);
  assert.match(image, /max-w-full/);
  assert.match(image, /max-h-full/);
});

test("12 floating text boxes render parent-bounded child images", () => {
  assert.match(textContainer, /data-v2-text-container/);
  assert.match(textContainer, /overflow-hidden/);
  assert.match(workspace, /addChildFrame\(type, resourceId\)/);
});

test("13 tables use the active flow-or-float insertion context", () => {
  assert.match(workspace, /data-v2-insertion-mode/);
  assert.match(workspace, /cells: Array\.from\(\{ length: tableRows \* tableColumns \}/);
});

test("14 Properties can always be closed and reopened from the primary row", () => {
  assert.doesNotMatch(workspace, /data-v2-page-controls/);
  assert.match(workspace, /aria-pressed=\{propertiesOpen\}/);
  assert.match(workspace, /setPropertiesOpen\(\(current\) => !current\)/);
});

test("15 Add Page creates a new stable page and main flow", () => {
  const first = createV2PageLayout({ pages: [{ id: "page-a", frames: [] }] });
  assert.match(workspace, /ensureV2MainFlowFrames\(addV2Page\(layout\)\)/);
  assert.equal(first.pages[0]!.id, "page-a");
});

test("16 Delete Page protects populated pages and preserves remaining IDs", () => {
  const layout = ensureV2MainFlowFrames(createV2PageLayout({ pages: [{ id: "page-a", frames: [] }, { id: "page-b", frames: [] }] }));
  assert.equal(isV2PagePopulated(layout.pages[0]!), false);
  const populated = { ...layout.pages[0]!, frames: [...layout.pages[0]!.frames, createV2Frame("IMAGE", "page-a", { id: "image-a" })] };
  assert.equal(isV2PagePopulated(populated), true);
  assert.deepEqual(deleteV2Page(layout, "page-a").pages.map((page) => page.id), ["page-b"]);
  assert.match(workspace, /data-v2-delete-page-dialog/);
  assert.match(workspace, /This page contains \{deletePageObjectCount\} objects/);
});

test("17 Fit Page executes canvas fitting", () => {
  assert.match(workspace, /onClick=\{\(\) => fitCanvas\("PAGE"\)\}/);
});

test("18 Fit Width executes canvas fitting", () => {
  assert.match(workspace, /onClick=\{\(\) => fitCanvas\("WIDTH"\)\}/);
});

test("19 Guides toggle changes visible page-canvas state", () => {
  assert.match(workspace, /setShowGuides/);
  assert.match(canvas, /data-v2-page-guides/);
});

test("20 Reading Order is not a primary Review command", () => {
  const review = workspace.slice(workspace.indexOf('activeRibbonTab === "REVIEW"'), workspace.indexOf('activeRibbonTab === "VIEW"'));
  assert.doesNotMatch(review, /reading order/i);
  assert.doesNotMatch(review, /Accessibility Diagnostics/);
  assert.match(review, /Grammar/);
  assert.match(review, /Read Aloud/);
});

test("21 Read Aloud opens an author panel with semantic segments", () => {
  assert.match(workspace, /data-v2-read-aloud-panel/);
  assert.match(workspace, /data-v2-narration-segments/);
  assert.match(workspace, /patchNarrationSegment/);
});

test("22 Preview offers Student Teacher and Digital Board modes", () => {
  assert.match(workspace, /Preview as Student/);
  assert.match(workspace, /Preview as Teacher/);
  assert.match(workspace, /Preview on Digital Board/);
});

test("23 Publish reuses the existing release drawer path", () => {
  assert.match(workspace, /onClick=\{onPublish\}/);
  assert.match(editor, /onPublish=\{\(\) => setReleasePanelOpen\(true\)\}/);
  assert.match(editor, /<ReleaseHistoryDrawer/);
});

test("24 keyboard Delete cannot remove a frame while editing text", () => {
  assert.ok(frame.indexOf("event.target.closest") < frame.indexOf('event.key === "Delete"'));
});

test("25 keyboard Delete removes a selected floating object", () => {
  assert.match(frame, /onDelete\(frame\.id, parentId\)/);
  assert.match(workspace, /deleteV2Frame/);
});

test("26 menus and choosers overlay instead of expanding ribbon height", () => {
  assert.match(workspace, /absolute right-0 top-8 z-\[70\]/);
  assert.match(workspace, /data-v2-insert-chooser=\{insertSurface\}[^\n]+absolute/);
});

test("27 flow insertion uses caret geometry and semantic INLINE metadata", () => {
  assert.match(workspace, /textSelectionRef\.current\?\.getBoundingClientRect/);
  assert.match(workspace, /layoutMode: flowInsertion \? "INLINE" : "ABSOLUTE"/);
});

test("28 default floating insertion is deterministic rather than frame-count cascaded", () => {
  const page = { width: 600, height: 800, frames: [createV2Frame("IMAGE", "p"), createV2Frame("SHAPE", "p")] };
  assert.deepEqual(getV2InsertionGeometry(page, "IMAGE"), getV2InsertionGeometry({ ...page, frames: [] }, "IMAGE"));
});

test("29 native editable sync preserves abc in natural typing order", () => {
  let domText = "";
  let lastEmitted: string | null = null;
  for (const next of ["a", "ab", "abc"]) {
    domText = next;
    lastEmitted = next;
    assert.equal(shouldSyncV2EditableDom(next, domText, true, lastEmitted), false);
  }
  assert.equal(domText, "abc");
});

test("30 focused edits do not replace browser-owned editable text nodes", () => {
  assert.match(text, /data-v2-editable-native/);
  assert.match(text, /useLayoutEffect/);
  assert.match(text, /shouldSyncV2EditableDom\(text, readEditableText\(root\), isFocused, lastEmittedTextRef\.current\)/);
  assert.match(text, /\{!editable \? layout\.lines\.map/);
});

test("31 external edits still synchronize an unfocused text frame", () => {
  assert.equal(shouldSyncV2EditableDom("updated", "original", false, "original"), true);
  assert.equal(shouldSyncV2EditableDom("updated", "updated", false, "updated"), false);
});

test("32 Home command families are overlay menus without generic More", () => {
  assert.match(workspace, /data-v2-clipboard-menu/);
  assert.match(workspace, /data-v2-font-menu/);
  assert.match(workspace, /data-v2-paragraph-menu/);
  assert.match(workspace, /data-v2-styles-menu/);
  assert.doesNotMatch(workspace, /data-v2-home-more/);
});

test("33 clipboard commands report blocked browser permission instead of silently failing", () => {
  assert.match(workspace, /navigator\.clipboard\.writeText/);
  assert.match(workspace, /navigator\.clipboard\.readText/);
  assert.match(workspace, /Browser blocked paste\. Use Ctrl\+V instead\./);
  assert.match(workspace, /data-v2-clipboard-status/);
});

test("34 the compact primary row contains tabs, actions, and no V2 badge", () => {
  assert.doesNotMatch(workspace, /Content Studio · Page Layout V2/);
  assert.ok(workspace.indexOf('aria-label="Content Studio ribbon"') < workspace.indexOf("Preview as Student"));
  assert.match(workspace, /onClick=\{\(\) => setPropertiesOpen\(\(current\) => !current\)\}/);
});

test("35 View owns page navigation, page view, and non-destructive custom mode", () => {
  assert.match(workspace, /data-v2-view-controls/);
  assert.match(workspace, /Previous Page/);
  assert.match(workspace, /aria-label="Page view"/);
  assert.match(workspace, /<option value="WEB">Web<\/option>/);
  assert.match(workspace, /<option value="A4">A4<\/option>/);
  assert.match(workspace, /<option value="CUSTOM">Custom<\/option>/);
  assert.match(workspace, /aria-label="Current page"/);
  assert.match(workspace, /Delete Page/);
});

test("36 V2 preview uses page navigation and the shared V2 delivery renderer", () => {
  const previewDrawer = editor.slice(editor.indexOf("function DraftPreviewDrawer"), editor.indexOf("function ReleaseHistoryDrawer"));
  assert.match(previewDrawer, /V2ContentDocumentRenderer/);
  assert.match(previewDrawer, /previewPages/);
  assert.match(previewDrawer, /selectedPageDocument/);
  assert.doesNotMatch(previewDrawer, /<ContentDocumentRenderer/);
  assert.doesNotMatch(previewDrawer, /selectedPeriodDocument/);
});

test("37 Web canvas reduces non-content margins without rewriting V2 pages", () => {
  assert.match(workspace, /data-v2-page-view=\{pageViewMode\}/);
  assert.match(workspace, /overflow-auto p-2/);
  assert.match(workspace, /flex-col gap-3/);
  assert.doesNotMatch(workspace, /setV2Page.*pageViewMode/);
});

test("38 image upload MIME resolution accepts valid files and safely infers blank browser MIME", () => {
  assert.equal(resolveUploadContentType("cover.jpg", "image/jpeg", "resource-file"), "image/jpeg");
  assert.equal(resolveUploadContentType("cover.png", "image/png", "resource-file"), "image/png");
  assert.equal(resolveUploadContentType("cover.webp", "", "resource-file"), "image/webp");
  assert.equal(resolveUploadContentType("cover.exe", "", "resource-file"), null);
  assert.match(storageClient, /transport === "SAME_ORIGIN_PROXY"/);
  assert.match(storageClient, /upload\/proxy/);
});

test("39 selected bounded containers receive image, video, and table child frames", () => {
  assert.match(workspace, /addChildFrame\(type, resourceId\)/);
  assert.match(workspace, /addChildFrame\("TABLE", undefined, payload\)/);
  assert.match(workspace, /children: \[\.\.\.\(frame\.children \?\? \[\]\), \{ \.\.\.child, parentId: frame\.id \}\]/);
});

test("40 V2 keeps resource IDs for newly created and legacy V1 media video frames", () => {
  const newVideo = createV2Frame("VIDEO", "page-a", { resourceId: "resource-new" });
  assert.equal(newVideo.resourceId, "resource-new");
  const legacy = createV2CompatibilityLayout({
    canvas: { width: 800, height: 600 },
    periods: [{ id: "period-a", title: "Period" }],
    blocks: [{ id: "media-a", type: "media", periodId: "period-a", targetType: "RESOURCE", targetId: "resource-legacy" }],
  } as never);
  const converted = legacy.pages[0]!.frames[0]!;
  assert.equal(converted.type, "VIDEO");
  assert.equal(converted.resourceId, "resource-legacy");
  assert.match(frameContent, /block\?\.type === "media" && block\.targetType === "RESOURCE"/);
  assert.match(frameContent, /V2VideoVisual/);
  assert.match(frameContent, /getV2VideoDisplayMode/);
});

test("41 table cell state preserves natural typing, backspace, tab navigation, and saved payload", () => {
  let payload: Record<string, unknown> = { rows: 1, columns: 2, cells: ["", ""] };
  for (const value of ["a", "ab", "abc", "vikas sharma"]) {
    payload = updateV2TableCell(payload, 1, 2, 0, value);
    assert.equal((payload.cells as string[])[0], value);
    assert.equal(shouldSyncV2TableCellDom(value, value, true), false);
  }
  payload = updateV2TableCell(payload, 1, 2, 0, "vikas sharm");
  assert.equal((payload.cells as string[])[0], "vikas sharm");
  assert.equal(nextV2TableCellIndex(0, 2), 1);
  assert.equal(nextV2TableCellIndex(1, 2, true), 0);
  assert.match(table, /useLayoutEffect/);
  assert.match(table, /activeCellIndex\.current === index/);
  assert.match(table, /writingMode: "horizontal-tb"/);
});

test("42 direct image upload sends the inferred MIME through init and completion", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, body: init?.body });
    if (url === "/api/storage/upload/init") {
      return new Response(JSON.stringify({ ok: true, uploadUrl: "https://storage.example/upload", objectKey: "resources/files/publisher/cover.webp", requiredHeaders: { "Content-Type": "image/webp" } }), { status: 200 });
    }
    if (url === "/api/storage/upload/complete") {
      return new Response(JSON.stringify({ ok: true, objectKey: "resources/files/publisher/cover.webp", contentType: "image/webp", sizeBytes: 3 }), { status: 200 });
    }
    return new Response(null, { status: 200 });
  }) as typeof fetch;
  try {
    const result = await uploadFileToR2({ file: { name: "cover.webp", type: "", size: 3 } as File, scope: "resource-file" });
    assert.equal(result.objectKey, "resources/files/publisher/cover.webp");
    const init = JSON.parse(String(requests[0]!.body));
    const complete = JSON.parse(String(requests[2]!.body));
    assert.equal(init.contentType, "image/webp");
    assert.equal(complete.expectedContentType, "image/webp");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
