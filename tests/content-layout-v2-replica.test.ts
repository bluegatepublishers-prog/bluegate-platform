import { deflateRawSync } from "node:zlib";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { filterDocumentForMode } from "../lib/content-audience";
import { createContentDocument } from "../lib/content-document";
import { adoptLayoutV2, createV2Frame, setV2PageVisualMode } from "../lib/content-layout-v2";
import { analyzeIdmlPackage, mapIntermediateToV2 } from "../lib/idml-import";

function png(width: number, height: number) {
  const data = new Uint8Array(24);
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(data.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return data;
}

test("Exact and Hybrid recommendations use deterministic reference page images", () => {
  const result = analyzeIdmlPackage(referencePackage(), "hybrid.zip");
  assert.deepEqual(result.pageRecommendations.map((page) => page.recommendation), ["EDITABLE", "EXACT_REPLICA"]);
  assert.deepEqual(result.pageRecommendations.map((page) => page.referenceAvailable), [true, true]);
  const pages = result.document.pageLayout!.pages;
  assert.equal(pages[0].visualMode, undefined);
  assert.equal(pages[1].visualMode, "EXACT_REPLICA");
  assert.equal(pages[1].replica?.sourceKind, "PAGE_IMAGE");
  assert.match(pages[1].replica?.resourceId ?? "", /^idml-replica:/);
  assert.equal(pages[1].frames.every((frame) => frame.renderMode === "SEMANTIC_ONLY"), true);
  assert.ok(result.previewResourceUrls[pages[1].replica!.resourceId!]?.startsWith("data:image/png"));
  const editable = mapIntermediateToV2(result.intermediate, { [pages[1].id]: "EDITABLE" });
  assert.equal(editable.pageLayout!.pages[1].visualMode, undefined);
  assert.equal(editable.pageLayout!.pages[1].frames.every((frame) => frame.renderMode === undefined), true);
});

test("reference page count and aspect mismatches are explicit and never shifted", () => {
  const result = analyzeIdmlPackage(mismatchPackage(), "mismatch.zip");
  assert.match(result.diagnostics.map((item) => item.message).join("\n"), /cover 1 of 2/);
  assert.equal(result.document.pageLayout!.pages.some((page) => page.visualMode === "EXACT_REPLICA"), false);
  const pdfMismatch = analyzeIdmlPackage(pdfMismatchPackage(), "pdf-mismatch.zip");
  assert.match(pdfMismatch.diagnostics.map((item) => item.message).join("\n"), /Reference PDF page count \(1\) does not match IDML page count \(2\)/);
});

test("replica model preserves semantic reading data and filters teacher-only semantics first", () => {
  const pageId = "page-1";
  const teacher = createV2Frame("TEXT", pageId, { id: "teacher-semantic", payload: "Teacher guidance", renderMode: "SEMANTIC_ONLY", audience: "TEACHER", readable: true, readingOrder: 2, x: 20, y: 100, width: 200, height: 40 });
  const student = createV2Frame("TEXT", pageId, { id: "student-semantic", payload: "Visible semantic text", renderMode: "SEMANTIC_ONLY", readable: true, readingOrder: 1, x: 20, y: 20, width: 200, height: 40 });
  const document = adoptLayoutV2(createContentDocument([]), { pageSize: { preset: "CUSTOM", width: 600, height: 400, unit: "px" }, pages: [{ id: pageId, order: 0, width: 600, height: 400, unit: "px", visualMode: "EXACT_REPLICA", replica: { resourceId: "resource-replica", sourceKind: "PAGE_IMAGE", intrinsicWidth: 600, intrinsicHeight: 400, fitMode: "CONTAIN", sourceHash: "hash" }, frames: [teacher, student] }] });
  const studentDocument = filterDocumentForMode(document, "STUDENT", []);
  const teacherDocument = filterDocumentForMode(document, "TEACHER", []);
  assert.deepEqual(studentDocument.pageLayout!.pages[0].frames.map((frame) => frame.id), ["student-semantic"]);
  assert.deepEqual(teacherDocument.pageLayout!.pages[0].frames.map((frame) => frame.id), ["teacher-semantic", "student-semantic"]);
  const switched = setV2PageVisualMode(document.pageLayout!, pageId, "EDITABLE");
  assert.equal(switched.pages[0].replica?.resourceId, "resource-replica");
  assert.equal(switched.pages[0].frames.every((frame) => frame.renderMode === undefined), true);
});

test("shared renderer and Admin controls keep replica presentation unified", () => {
  const renderer = readFileSync("components/content/V2ContentDocumentRenderer.tsx", "utf8");
  const panel = readFileSync("components/admin/books/editor/IdmlImportPanel.tsx", "utf8");
  const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
  assert.match(renderer, /EXACT_REPLICA/);
  assert.match(renderer, /SEMANTIC_ONLY/);
  assert.match(renderer, /sandbox="allow-same-origin"/);
  assert.match(panel, /pageRecommendations/);
  assert.match(panel, /Semantic Overlay/);
  assert.match(workspace, /View as Editable/);
  assert.match(workspace, /Use Replica/);
});

test("unsafe PDF actions and SVG page replicas are rejected with actionable diagnostics", () => {
  const unsafePdf = analyzeIdmlPackage(pdfPackage("/Type /Page /JavaScript (bad)"), "unsafe-pdf.zip");
  assert.match(unsafePdf.diagnostics.map((item) => item.message).join("\n"), /unsupported active\/external actions/);
  const svg = analyzeIdmlPackage(svgPackage(), "unsafe-svg.zip");
  assert.match(svg.diagnostics.map((item) => item.message).join("\n"), /not a supported safe JPEG, PNG, or WebP/);
});

function referencePackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" GeometricBounds="20 40 80 340"/></Page><Page Self="p2" GeometricBounds="400 0 800 600"><Polygon Self="vector" GeometricBounds="420 40 760 560"/></Page></Spread>',
    "Pages/page-001.png": png(600, 400),
    "Pages/page-002.png": png(600, 400),
  });
}

function mismatchPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"/><Page Self="p2" GeometricBounds="400 0 800 600"><Polygon Self="vector" GeometricBounds="420 40 760 560"/></Page></Spread>',
    "Pages/page-001.png": png(600, 400),
  });
}

function pdfMismatchPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"/><Page Self="p2" GeometricBounds="400 0 800 600"/></Spread>',
    "reference.pdf": pdfBytes(""),
  });
}

function pdfPackage(body: string) {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><Polygon Self="vector" GeometricBounds="20 20 380 580"/></Page></Spread>',
    "reference.pdf": pdfBytes(body),
  });
}

function svgPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><Polygon Self="vector" GeometricBounds="20 20 380 580"/></Page></Spread>',
    "Pages/page-001.svg": '<svg><script>alert(1)</script></svg>',
  });
}

function pdfBytes(body: string) { return new TextEncoder().encode(`%PDF-1.7\n${body}\n/Type /Page\n/MediaBox [0 0 600 400]`); }

function packagedIdml(entries: Record<string, string | Uint8Array>) { return zip({ "document.idml": zip(entries) }); }

function zip(entries: Record<string, string | Uint8Array>) {
  const files = Object.entries(entries).map(([name, value]) => ({ name, data: typeof value === "string" ? new TextEncoder().encode(value) : value }));
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const compressed = deflateRawSync(file.data);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(6, 20, true); view.setUint16(10, 8, true); view.setUint32(18, compressed.length, true); view.setUint32(22, file.data.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
    local.push(header, compressed);
    const directory = new Uint8Array(46 + name.length); const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true); directoryView.setUint16(4, 20, true); directoryView.setUint16(6, 20, true); directoryView.setUint16(10, 8, true); directoryView.setUint32(20, compressed.length, true); directoryView.setUint32(24, file.data.length, true); directoryView.setUint16(28, name.length, true); directoryView.setUint32(42, offset, true); directory.set(name, 46); central.push(directory); offset += header.length + compressed.length;
  }
  const centralBytes = concat(central); const end = new Uint8Array(22); const endView = new DataView(end.buffer); endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, files.length, true); endView.setUint16(10, files.length, true); endView.setUint32(12, centralBytes.length, true); endView.setUint32(16, offset, true); return concat([...local, centralBytes, end]);
}

function concat(chunks: Uint8Array[]) { const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0); const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; } return output; }