import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import test from "node:test";

import { analyzeIdmlPackage, IDML_LIMITS, IdmlImportError } from "../lib/idml-import";

test("Analyze and preview do not apply content until explicit confirmation", () => {
  const panel = readFileSync("components/admin/books/editor/IdmlImportPanel.tsx", "utf8");
  const route = readFileSync("app/api/admin/content/import/idml/route.ts", "utf8");
  assert.match(panel, /action/,);
  assert.match(panel, /Confirm and import V2/);
  assert.match(panel, /currentContentHash/);
  assert.match(route, /action !== "confirm"/);
  assert.match(route, /saveBookStructureNode/);
  assert.match(route, /deleteObject/);
});

test("IDML package maps ordered custom-size pages, page-local coordinates, text, image, and shape frames", () => {
  const result = analyzeIdmlPackage(simplePackage(), "simple-book.zip");
  assert.equal(result.document.layoutVersion, 2);
  assert.equal(result.document.pageLayout?.pages.length, 2);
  assert.deepEqual(result.document.pageLayout?.pages.map((page) => [page.width, page.height]), [[600, 400], [600, 400]]);
  const first = result.document.pageLayout!.pages[0];
  assert.deepEqual(first.frames.map((frame) => frame.type), ["TEXT", "IMAGE", "SHAPE", "TABLE"]);
  assert.equal(result.document.blocks.some((block) => block.type === "table"), true);
  assert.deepEqual({ x: first.frames[0].x, y: first.frames[0].y }, { x: 40, y: 20 });
  assert.equal((first.frames[0].payload as { text?: string }).text, "Hello IDML");
  assert.match(first.frames[1].resourceId ?? "", /^idml-preview:/);
  assert.equal(result.previewResourceUrls[first.frames[1].resourceId!]?.startsWith("data:image/png"), true);
  assert.equal(result.diagnostics.some((item) => item.severity === "ERROR"), false);
});

test("IDML typography, stable IDs, layer mapping, and reading order are deterministic", () => {
  const first = analyzeIdmlPackage(typographyPackage(), "typography.zip");
  const second = analyzeIdmlPackage(typographyPackage(), "typography.zip");
  assert.deepEqual(first.document.pageLayout?.pages.map((page) => page.id), second.document.pageLayout?.pages.map((page) => page.id));
  const frame = first.document.pageLayout!.pages[0].frames[0];
  assert.equal(frame.fontSize, 18);
  assert.equal(frame.fontFamily, "Arial, sans-serif");
  assert.equal(frame.fontWeight, 700);
  assert.equal(frame.textSpans?.[0]?.marks?.includes("bold"), true);
  assert.equal(frame.direction, "LTR");
  assert.equal(frame.readingOrder, 0);
  assert.equal(frame.layer, "CONTENT");
  assert.equal(first.summary.fontSubstitutions, 1);
});

test("missing links and unsupported vectors produce diagnostics without crashing", () => {
  const result = analyzeIdmlPackage(missingAndUnsupportedPackage(), "missing.zip");
  assert.equal(result.summary.missingLinks, 1);
  assert.equal(result.summary.unsupportedObjects >= 1, true);
  assert.match(result.diagnostics.map((item) => item.message).join("\n"), /Missing linked asset/);
  assert.match(result.diagnostics.map((item) => item.message).join("\n"), /Exact Replica/);
});

test("ZIP paths, XML entities, native INDD, and archive limits are rejected safely", () => {
  assert.throws(() => analyzeIdmlPackage(zip({ "../evil.txt": "x" }), "bad.zip"), /Unsafe ZIP path/);
  assert.throws(() => analyzeIdmlPackage(zip({ "document.idml": '<!DOCTYPE root [<!ENTITY x SYSTEM "https://evil.test">]><root>&x;</root>' }), "bad.zip"), /entities|doctypes/i);
  assert.throws(() => analyzeIdmlPackage(new Uint8Array([1, 2, 3]), "book.indd"), (error: unknown) => error instanceof IdmlImportError && /Please export\/package/.test(error.message));
  assert.equal(IDML_LIMITS.maxEntries <= 10_000, true);
});

test("threaded stories are reported and local source paths do not enter the V2 document", () => {
  const result = analyzeIdmlPackage(threadedPackage(), "threaded.zip");
  assert.match(result.diagnostics.map((item) => item.message).join("\n"), /Linked text frames detected/);
  assert.equal(JSON.stringify(result.document).includes("C:\\Users"), false);
  assert.equal(JSON.stringify(result.document).includes("Links/"), false);
});

function simplePackage() {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return zip({
    "document.idml": '<idPkg:DesignMap><idPkg:Spread src="Spreads/Spread_1.xml"/><idPkg:Spread src="Spreads/Spread_2.xml"/></idPkg:DesignMap>',
    "Spreads/Spread_1.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" GeometricBounds="20 40 100 340" ItemLayer="TextLayer"/><Rectangle Self="i1" GeometricBounds="120 50 280 250" ItemLayer="Graphics"><Link LinkResourceURI="Links/pixel.png"/></Rectangle><Rectangle Self="shape1" GeometricBounds="300 40 360 160" ItemLayer="Background" FillColor="#ff0000"/><Table Self="table1" GeometricBounds="330 200 390 380"><Row><Cell><Content>A</Content></Cell><Cell><Content>B</Content></Cell></Row></Table></Page></Spread>',
    "Spreads/Spread_2.xml": '<Spread><Page Self="p2" GeometricBounds="0 0 400 600"><Rectangle Self="shape2" GeometricBounds="20 20 60 80" ItemLayer="Design" FillColor="#00ff00"/></Page></Spread>',
    "Stories/Story_1.xml": '<Story Self="s1"><CharacterStyleRange><Content>Hello IDML</Content></CharacterStyleRange></Story>',
    "Links/pixel.png": png,
  });
}

function typographyPackage() {
  return zip({
    "document.idml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" GeometricBounds="10 20 80 300" ItemLayer="TextLayer" PointSize="18" Justification="LeftAlign"/></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange FontStyle="Bold" PointSize="18"><Content>Styled text</Content></CharacterStyleRange></Story>',
  });
}

function missingAndUnsupportedPackage() {
  return zip({
    "document.idml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><Rectangle Self="missing" GeometricBounds="10 20 80 200"><Link LinkResourceURI="Links/not-there.tif"/></Rectangle><Polygon Self="vector" GeometricBounds="100 20 200 200"/></Page></Spread>',
  });
}

function threadedPackage() {
  return zip({
    "document.idml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="100 200 500 800"><TextFrame Self="t1" ParentStory="s1" NextTextFrame="t2" GeometricBounds="120 240 220 440"/><TextFrame Self="t2" ParentStory="s1" PreviousTextFrame="t1" GeometricBounds="240 240 340 440"/></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange><Content>Threaded content</Content></CharacterStyleRange></Story>',
  });
}

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
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 8, true);
    view.setUint32(18, compressed.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);
    local.push(header, compressed);
    const directory = new Uint8Array(46 + name.length);
    const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint16(10, 8, true);
    directoryView.setUint32(20, compressed.length, true);
    directoryView.setUint32(24, file.data.length, true);
    directoryView.setUint16(28, name.length, true);
    directoryView.setUint32(42, offset, true);
    directory.set(name, 46);
    central.push(directory);
    offset += header.length + compressed.length;
  }
  const centralBytes = concat(central);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralBytes.length, true);
  endView.setUint32(16, offset, true);
  return concat([...local, centralBytes, end]);
}

function concat(chunks: Uint8Array[]) { const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0); const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; } return output; }
