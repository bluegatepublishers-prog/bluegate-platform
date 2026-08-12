import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deflateRawSync } from "node:zlib";

import { analyzeIdmlPackage, IDML_LIMITS, IdmlImportError } from "../lib/idml-import";

const MB = 1024 * 1024;

type ZipValue = string | Uint8Array;
type ZipOptions = {
  storedPaths?: readonly string[];
  declaredUncompressedBytes?: Record<string, number>;
};

test("Analyze and preview do not apply content until explicit confirmation", () => {
  const panel = readFileSync("components/admin/books/editor/IdmlImportPanel.tsx", "utf8");
  const route = readFileSync("app/api/admin/content/import/idml/route.ts", "utf8");
  assert.match(panel, /action/);
  assert.match(panel, /Confirm and import V2/);
  assert.match(panel, /currentContentHash/);
  assert.match(route, /action !== "confirm"/);
  assert.match(route, /saveBookStructureNode/);
  assert.match(route, /deleteObject/);
  assert.equal(route.indexOf('action !== "confirm"') < route.indexOf("persistAssets"), true);
  assert.match(route, /idmlXmlError/);
  assert.match(route, /idmlSizeError/);
  assert.match(panel, /Import analysis failed/);
  assert.match(panel, /Import analysis stopped/);
  assert.match(panel, /not an invalid-XML error/);
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
  assert.throws(() => analyzeIdmlPackage(packagedIdml({ "designmap.xml": '<!DOCTYPE root [<!ENTITY x SYSTEM "https://evil.test">]><root>&x;</root>' }), "bad.zip"), /entities|doctypes/i);
  assert.throws(() => analyzeIdmlPackage(new Uint8Array([1, 2, 3]), "book.indd"), (error: unknown) => error instanceof IdmlImportError && /Please export\/package/.test(error.message));
  assert.equal(IDML_LIMITS.maxOuterPackageEntries <= 10_000, true);
  assert.equal(IDML_LIMITS.maxCompressionRatio <= 100, true);
});

test("threaded stories are reported and local source paths do not enter the V2 document", () => {
  const result = analyzeIdmlPackage(threadedPackage(), "threaded.zip");
  assert.match(result.diagnostics.map((item) => item.message).join("\n"), /Linked text frames detected/);
  assert.equal(JSON.stringify(result.document).includes("C:\\Users"), false);
  assert.equal(JSON.stringify(result.document).includes("Links/"), false);
});

test("a valid 45.2 MB Spread XML is below the 250 MB limit and passes analysis", () => {
  const spread = largeSpreadXml(Math.ceil(45.2 * MB));
  const input = packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread_uc7.xml"/></DesignMap>',
    "Spreads/Spread_uc7.xml": spread,
  }, "book.idml", { storedPaths: ["Spreads/Spread_uc7.xml"] });
  const result = analyzeIdmlPackage(input, "book.zip");
  assert.equal(Buffer.byteLength(spread, "utf8"), Math.ceil(45.2 * MB));
  assert.equal(result.document.pageLayout?.pages.length, 1);
  assert.equal(IDML_LIMITS.maxInternalXmlEntryBytes, 250 * MB);
});

test("a nested IDML archive can safely exceed the previous 80 MB ceiling", () => {
  const nested = idmlArchive({
    "designmap.xml": "<DesignMap/>",
    "Links/large-unreferenced.bin": new Uint8Array(81 * MB).fill(0x61),
  }, { storedPaths: ["Links/large-unreferenced.bin"] });
  assert.equal(nested.byteLength > 80 * MB, true);
  assert.equal(IDML_LIMITS.maxNestedIdmlCompressedBytes, 250 * MB);
  const result = analyzeIdmlPackage(zip({ "book.idml": nested }), "book.zip");
  assert.equal(result.intermediate.source, "IDML");
});

test("normal internal XML succeeds and direct IDML uses the same nested-IDML rules as a package", () => {
  const nested = idmlArchive(simpleEntries());
  const direct = analyzeIdmlPackage(nested, "chapter.idml");
  const packaged = analyzeIdmlPackage(zip({ "chapter.idml": nested }), "chapter.zip");
  assert.equal(direct.document.pageLayout?.pages.length, packaged.document.pageLayout?.pages.length);
  assert.equal(direct.document.pageLayout?.pages[0]?.frames.length, packaged.document.pageLayout?.pages[0]?.frames.length);
  assert.equal(IDML_LIMITS.maxNestedIdmlCompressedBytes, 250 * MB);
});

test("an XML entry above 250 MB gets a size error rather than an invalid-XML error", () => {
  const declaredBytes = IDML_LIMITS.maxInternalXmlEntryBytes + MB;
  const input = packagedIdml({
    "designmap.xml": "<DesignMap/>",
    "Spreads/Spread_large.xml": pseudoRandomBytes(3 * MB, 1),
  }, "book.idml", { declaredUncompressedBytes: { "Spreads/Spread_large.xml": declaredBytes } });
  const error = capture(() => analyzeIdmlPackage(input, "book.zip"));
  assert.ok(error instanceof IdmlImportError);
  assert.equal(error.sizeError?.category, "INTERNAL_XML");
  assert.equal(error.sizeError?.entryPath, "book.idml -> Spreads/Spread_large.xml");
  assert.equal(error.sizeError?.allowedBytes, 250 * MB);
  assert.match(error.sizeError?.problem ?? "", /250 MB import limit/u);
  assert.equal(error.xmlError, undefined);
  assert.doesNotMatch(error.message, /invalid XML/i);
});

test("the total internal XML safety limit is enforced before XML bytes are decoded", () => {
  const declared = 175 * MB;
  const input = packagedIdml({
    "designmap.xml": "<DesignMap/>",
    "Resources/filler-1.xml": pseudoRandomBytes(3 * MB, 1),
    "Resources/filler-2.xml": pseudoRandomBytes(3 * MB, 2),
    "Resources/filler-3.xml": pseudoRandomBytes(3 * MB, 3),
  }, "chapter.idml", { declaredUncompressedBytes: {
    "Resources/filler-1.xml": declared,
    "Resources/filler-2.xml": declared,
    "Resources/filler-3.xml": declared,
  } });
  const error = capture(() => analyzeIdmlPackage(input, "chapter.zip"));
  assert.ok(error instanceof IdmlImportError);
  assert.equal(error.sizeError?.category, "INTERNAL_XML");
  assert.equal(error.sizeError?.allowedBytes, 500 * MB);
  assert.match(error.sizeError?.problem ?? "", /500 MB import limit/u);
});

test("oversized total uncompressed IDML is rejected before extraction", () => {
  const declared = 200 * MB;
  const input = packagedIdml({
    "designmap.xml": "<DesignMap/>",
    "Resources/filler-1.bin": pseudoRandomBytes(3 * MB, 1),
    "Resources/filler-2.bin": pseudoRandomBytes(3 * MB, 2),
    "Resources/filler-3.bin": pseudoRandomBytes(3 * MB, 3),
    "Resources/filler-4.bin": pseudoRandomBytes(3 * MB, 4),
  }, "chapter.idml", { declaredUncompressedBytes: {
    "Resources/filler-1.bin": declared,
    "Resources/filler-2.bin": declared,
    "Resources/filler-3.bin": declared,
    "Resources/filler-4.bin": declared,
  } });
  const error = capture(() => analyzeIdmlPackage(input, "chapter.zip"));
  assert.ok(error instanceof IdmlImportError);
  assert.equal(error.sizeError?.category, "NESTED_IDML");
  assert.equal(error.sizeError?.allowedBytes, 750 * MB);
  assert.match(error.sizeError?.problem ?? "", /750 MB import limit/u);
});

test("native INDD and linked binaries are not XML decoded", () => {
  const result = analyzeIdmlPackage(packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><Rectangle Self="image" GeometricBounds="10 10 100 100"><Link LinkResourceURI="Links/raw.bin"/></Rectangle></Page></Spread>',
    "Links/raw.bin": new Uint8Array([0xff, 0x00, 0xfe, 0x80]),
    "Links/original.indd": new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
  }), "binary.zip");
  assert.equal(result.document.pageLayout?.pages.length, 1);
  assert.match(result.diagnostics.map((item) => item.message).join("\n"), /Unsupported linked asset format/);
});

test("publisher hyperlinks remain previewable and only safe HTTP links are active", () => {
  const result = analyzeIdmlPackage(hyperlinkPackage(), "hyperlinks.zip");
  assert.equal(result.document.pageLayout?.pages.length, 1);
  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.warnings >= 1, true);
  assert.match(result.diagnostics.map((item) => `${item.severity} ${item.objectType}: ${item.message}`).join("\n"), /WARNING HYPERLINK: Hyperlink requires review in Spreads\/Spread\.xml/);
  assert.equal(result.diagnostics.some((item) => item.severity === "ERROR" && item.objectType === "HYPERLINK"), false);
  const payload = result.document.pageLayout!.pages[0].frames[0].payload as { hyperlinks?: Array<{ url: string; active: boolean }> };
  assert.deepEqual(payload.hyperlinks?.map((link) => [link.url, link.active]), [["javascript:alert(1)", false], ["https://example.test/lesson", true]]);
});
test("a legitimate story larger than the old 1 MB limit reaches TextFrame and preview data", () => {
  const storyBytes = 1_500_000;
  const result = analyzeIdmlPackage(largeStoryPackage("story-large", storyBytes), "large-story.zip");
  assert.equal(result.summary.errors, 0);
  assert.equal(result.intermediate.stories[0]?.text.length, storyBytes);
  const frame = result.intermediate.pages[0]?.frames[0];
  assert.equal(frame?.type, "TEXT");
  assert.equal(frame?.text?.length, storyBytes);
  const previewFrame = result.document.pageLayout?.pages[0]?.frames[0];
  assert.equal((previewFrame?.payload as { text?: string }).text?.length, storyBytes);
  assert.equal(IDML_LIMITS.maxStoryTextBytes, 50 * MB);
});

test("spread-level path geometry without GeometricBounds reaches the visible preview model", () => {
  const result = analyzeIdmlPackage(pathGeometryPackage(), "path-geometry.zip");
  const page = result.intermediate.pages[0];
  const frame = page?.frames[0];
  const previewFrame = result.document.pageLayout?.pages[0]?.frames[0];

  assert.equal(result.summary.errors, 0);
  assert.equal(frame?.type, "TEXT");
  assert.ok(frame && frame.width > 0 && frame.height > 0);
  assert.equal(frame?.text, "Path geometry text");
  assert.equal(previewFrame?.type, "TEXT");
  assert.equal((previewFrame?.payload as { text?: string }).text, "Path geometry text");
  assert.ok(previewFrame && previewFrame.x >= 0 && previewFrame.y >= 0);
  assert.ok(previewFrame && previewFrame.x + previewFrame.width <= 600 && previewFrame.y + previewFrame.height <= 400);
});
test("grouped path geometry composes ancestor transforms for page ownership", () => {
  const result = analyzeIdmlPackage(groupedPathGeometryPackage(), "grouped-path-geometry.zip");
  const frame = result.intermediate.pages[0]?.frames[0];
  const previewFrame = result.document.pageLayout?.pages[0]?.frames[0];

  assert.equal(result.summary.errors, 0);
  assert.equal(frame?.type, "TEXT");
  assert.equal(frame?.text, "Grouped text");
  assert.deepEqual({ x: frame?.x, y: frame?.y, width: frame?.width, height: frame?.height }, { x: 200, y: 150, width: 100, height: 50 });
  assert.deepEqual({ x: previewFrame?.x, y: previewFrame?.y, width: previewFrame?.width, height: previewFrame?.height }, { x: 200, y: 150, width: 100, height: 50 });
});
test("AppliedMaster materializes only the matching master page with converted coordinates", () => {
  const result = analyzeIdmlPackage(appliedMasterPackage(), "master-page.zip");
  const pages = result.intermediate.pages;
  const masterFrames = pages[0]?.frames.filter((frame) => frame.source === "master") ?? [];

  assert.equal(result.summary.errors, 0);
  assert.equal(masterFrames.length, 3);
  assert.equal(pages[1]?.frames.some((frame) => frame.source === "master"), false);
  assert.equal(masterFrames.find((frame) => frame.sourceObjectId === "master-text")?.text, "Master text");
  assert.deepEqual(
    masterFrames.find((frame) => frame.sourceObjectId === "master-text") && ((frame) => ({ x: frame.x, y: frame.y, width: frame.width, height: frame.height }))(masterFrames.find((frame) => frame.sourceObjectId === "master-text")!),
    { x: 110, y: 70, width: 100, height: 50 },
  );
  assert.equal(masterFrames.find((frame) => frame.sourceObjectId === "master-oval")?.type, "SHAPE");
  assert.equal(masterFrames.filter((frame) => frame.sourceObjectId === "master-text").length, 1);
  assert.equal(result.diagnostics.some((item) => item.message.includes("Missing linked asset: Links/master-missing.psd")), true);
});
test("an overridden master object is not duplicated on the document page", () => {
  const result = analyzeIdmlPackage(appliedMasterPackage("master-text"), "master-override.zip");
  const masterFrames = result.intermediate.pages[0]?.frames.filter((frame) => frame.source === "master") ?? [];
  assert.equal(masterFrames.some((frame) => frame.sourceObjectId === "master-text"), false, );
  assert.equal(masterFrames.length, 2);
});

test("an extracted story beyond the bounded story-text limit is rejected safely", () => {
  const input = largeStoryPackage("story-abusive", IDML_LIMITS.maxStoryTextBytes + 1);
  const error = capture(() => analyzeIdmlPackage(input, "abusive-story.zip"));
  assert.ok(error instanceof IdmlImportError);
  assert.equal(error.sizeError?.category, "STORY_TEXT");
  assert.equal(error.sizeError?.allowedBytes, IDML_LIMITS.maxStoryTextBytes);
  assert.equal(error.sizeError?.detectedBytes, IDML_LIMITS.maxStoryTextBytes + 1);
  assert.match(error.sizeError?.problem ?? "", /50 MB extracted-text limit/u);
});
test("a genuinely malformed internal XML entry identifies the nested path, problem, and position without mutation", () => {
  const input = malformedXmlPackage();
  const before = new Uint8Array(input);
  const captured = capture(() => analyzeIdmlPackage(input, "malformed.idml.zip"));
  assert.ok(captured instanceof IdmlImportError);
  assert.match(captured.message, /IDML XML error in document\.idml -> Stories\/Story_bad\.xml/u);
  assert.match(captured.message, /Mismatched XML closing tag/u);
  assert.equal(captured.xmlError?.entryPath, "document.idml -> Stories/Story_bad.xml");
  assert.equal(captured.xmlError?.fileName, "Story_bad.xml");
  assert.equal(captured.xmlError?.problem, "Mismatched XML closing tag.");
  assert.equal(typeof captured.xmlError?.line, "number");
  assert.equal(typeof captured.xmlError?.column, "number");
  assert.match(captured.xmlError?.context ?? "", /CharacterStyleRange|Content/u);
  assert.deepEqual(input, before);
});

test("ZIP-bomb compression-ratio protection remains active without mutation", () => {
  const input = idmlArchive({ "designmap.xml": "<DesignMap/>".repeat(200_000) });
  const before = new Uint8Array(input);
  const error = capture(() => analyzeIdmlPackage(input, "bomb.idml"));
  assert.ok(error instanceof IdmlImportError);
  assert.match(error.message, /compression-ratio safety limit/u);
  assert.deepEqual(input, before);
});

test("strict XML parsing accepts IDML namespaces, self-closing tags, comments, CDATA, declarations, BOMs, and encoded entities", () => {
  const result = analyzeIdmlPackage(xmlFeaturePackage(), "xml-features.idml.zip");
  assert.equal(result.document.pageLayout?.pages.length, 1);
  assert.equal((result.document.pageLayout?.pages[0]?.frames[0]?.payload as { text?: string }).text, "Fish & Chips < 3");
  assert.equal(result.diagnostics.some((item) => item.severity === "ERROR"), false);
});

test("UTF-16 XML declarations and byte-order marks are decoded safely", () => {
  const result = analyzeIdmlPackage(utf16Package(), "utf16.idml.zip");
  assert.equal(result.document.pageLayout?.pages.length, 1);
  assert.equal((result.document.pageLayout?.pages[0]?.frames[0]?.payload as { text?: string }).text, "UTF-16 story");
});

function simplePackage() { return packagedIdml(simpleEntries()); }

function simpleEntries(): Record<string, ZipValue> {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return {
    "designmap.xml": '<idPkg:DesignMap><idPkg:Spread src="Spreads/Spread_1.xml"/><idPkg:Spread src="Spreads/Spread_2.xml"/></idPkg:DesignMap>',
    "Spreads/Spread_1.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" GeometricBounds="20 40 100 340" ItemLayer="TextLayer"/><Rectangle Self="i1" GeometricBounds="120 50 280 250" ItemLayer="Graphics"><Link LinkResourceURI="Links/pixel.png"/></Rectangle><Rectangle Self="shape1" GeometricBounds="300 40 360 160" ItemLayer="Background" FillColor="#ff0000"/><Table Self="table1" GeometricBounds="330 200 390 380"><Row><Cell><Content>A</Content></Cell><Cell><Content>B</Content></Cell></Row></Table></Page></Spread>',
    "Spreads/Spread_2.xml": '<Spread><Page Self="p2" GeometricBounds="0 0 400 600"><Rectangle Self="shape2" GeometricBounds="20 20 60 80" ItemLayer="Design" FillColor="#00ff00"/></Page></Spread>',
    "Stories/Story_1.xml": '<Story Self="s1"><CharacterStyleRange><Content>Hello IDML</Content></CharacterStyleRange></Story>',
    "Links/pixel.png": png,
  };
}

function typographyPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" GeometricBounds="10 20 80 300" ItemLayer="TextLayer" PointSize="18" Justification="LeftAlign"/></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange FontStyle="Bold" PointSize="18"><Content>Styled text</Content></CharacterStyleRange></Story>',
  });
}

function missingAndUnsupportedPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><Rectangle Self="missing" GeometricBounds="10 20 80 200"><Link LinkResourceURI="Links/not-there.tif"/></Rectangle><Polygon Self="vector" GeometricBounds="100 20 200 200"/></Page></Spread>',
  });
}

test("story extraction excludes non-Content CharacterStyleRange metadata", () => {
  const result = analyzeIdmlPackage(packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" GeometricBounds="20 40 100 340"/></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange><Properties><Group><Label>serialized metadata that must not render</Label></Group></Properties><Content>Visible story text</Content></CharacterStyleRange></Story>',
  }));
  assert.equal(result.intermediate.stories.find((story) => story.id === "s1")?.text, "Visible story text");
  assert.equal(result.intermediate.pages[0].frames[0].text, "Visible story text");
});

test("source stacking order and transparent fills preserve text above decoration", () => {
  const result = analyzeIdmlPackage(packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><Rectangle Self="r1" GeometricBounds="10 10 100 200" FillColor="Swatch/None" StrokeColor="Swatch/None"/><TextFrame Self="t1" ParentStory="s1" GeometricBounds="20 20 80 180"/></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange><Content>Text stays visible</Content></CharacterStyleRange></Story>',
  }));
  const frames = result.intermediate.pages[0].frames;
  assert.deepEqual(frames.map((frame) => frame.type), ["SHAPE", "TEXT"]);
  assert.equal(frames[0].fill, "transparent");
  const v2 = result.document.pageLayout!.pages[0].frames;
  assert.equal((v2[0].payload as Record<string, unknown>).fill, "transparent");
  assert.equal((v2[1].payload as Record<string, unknown>).text, "Text stays visible");
  assert.ok(v2[0].zIndex < v2[1].zIndex);
});
test("IDML style resources resolve inherited paragraph, character, object, swatch, and text-frame properties", () => {
  const result = analyzeIdmlPackage(packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" AppliedObjectStyle="ObjectStyle/text-box" GeometricBounds="20 40 160 340"><TextFramePreference InsetSpacing="4 8 12 16"/></TextFrame><Rectangle Self="r1" AppliedObjectStyle="ObjectStyle/box" GeometricBounds="180 40 260 180"/></Page></Spread>',
    "Resources/Styles.xml": '<Styles><ParagraphStyle Self="ParagraphStyle/base" Leading="18"><Properties><AppliedFont>Book Antiqua</AppliedFont></Properties></ParagraphStyle><ParagraphStyle Self="ParagraphStyle/derived" BasedOn="ParagraphStyle/base" PointSize="16" Justification="CenterAlign"/><CharacterStyle Self="CharacterStyle/emphasis" FillColor="Color/rgb" FontStyle="BoldItalic" Tracking="50" BaselineShift="2" HorizontalScale="95" VerticalScale="90"/><ObjectStyle Self="ObjectStyle/text-box" FillColor="Swatch/None" StrokeColor="Swatch/None"/><ObjectStyle Self="ObjectStyle/box" FillColor="Color/cmyk" StrokeColor="Swatch/None" StrokeWeight="3"/></Styles>',
    "Resources/Graphic.xml": '<Graphic><Color Self="Color/rgb" Space="RGB" ColorValue="33 29 30"/><Color Self="Color/cmyk" Space="CMYK" ColorValue="0 100 0 0"/></Graphic>',
    "Stories/Story.xml": '<Story Self="s1"><ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/derived"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/emphasis"><Content>Styled text</Content></CharacterStyleRange></ParagraphStyleRange></Story>',
  }));
  const [textFrame, shape] = result.intermediate.pages[0].frames;
  assert.equal(textFrame.fontSize, 16);
  assert.equal(textFrame.fontFamily, '"Book Antiqua", Georgia, serif');
  assert.equal(textFrame.fontWeight, 700);
  assert.equal(textFrame.fontStyle, "italic");
  assert.equal(textFrame.lineHeight, 18 / 16);
  assert.equal(textFrame.alignment, "center");
  assert.equal(textFrame.textColor, "#211d1e");
  assert.deepEqual(textFrame.textInset, { top: 4, right: 16, bottom: 12, left: 8 });
  assert.deepEqual(textFrame.textSpans?.[0], { text: "Styled text", marks: ["bold", "italic"], fontSize: 16, color: "#211d1e", fontFamily: '"Book Antiqua", Georgia, serif', fontWeight: 700, fontStyle: "italic", letterSpacing: 0.8, baselineShift: 2, horizontalScale: 95, verticalScale: 90, justification: "CenterAlign", leading: 18 });
  assert.equal(shape.fill, "#ff00ff");
  assert.equal(shape.border, "transparent");
  assert.equal(shape.borderWidth, 3);
  const v2Text = result.document.pageLayout!.pages[0].frames[0];
  assert.equal(v2Text.textColor, "#211d1e");
  assert.deepEqual(v2Text.textInset, { top: 4, right: 16, bottom: 12, left: 8 });
});
function threadedPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="100 200 500 800"><TextFrame Self="t1" ParentStory="s1" NextTextFrame="t2" GeometricBounds="120 240 220 440"/><TextFrame Self="t2" ParentStory="s1" PreviousTextFrame="t1" GeometricBounds="240 240 340 440"/></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange><Content>Threaded content</Content></CharacterStyleRange></Story>',
  });
}

function xmlFeaturePackage() {
  return packagedIdml({
    "designmap.xml": utf8Bom('<?xml version="1.0" encoding="UTF-8"?><?idml export?><idPkg:DesignMap xmlns:idPkg="urn:idml"><idPkg:Spread src="Spreads/Spread_1.xml"/></idPkg:DesignMap>'),
    "Spreads/Spread_1.xml": '<?xml version="1.0"?><idPkg:Spread xmlns:idPkg="urn:idml"><idPkg:Page idPkg:Self="p1" idPkg:GeometricBounds="0 0 400 600"><idPkg:TextFrame idPkg:Self="t1" idPkg:ParentStory="s1" idPkg:GeometricBounds="20 40 100 340" Label="x > y &amp; z"/><idPkg:Rectangle idPkg:Self="r1" idPkg:GeometricBounds="120 40 180 140"/></idPkg:Page></idPkg:Spread>',
    "Stories/Story_1.xml": '<Story Self="s1"><!-- safe comment --><CharacterStyleRange><Content><![CDATA[Fish & Chips]]> &lt; 3</Content><Br/></CharacterStyleRange></Story>',
  });
}

function utf16Package() {
  return packagedIdml({
    "designmap.xml": utf16Le('<?xml version="1.0" encoding="UTF-16"?><DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>'),
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" GeometricBounds="20 40 100 340"/></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange><Content>UTF-16 story</Content></CharacterStyleRange></Story>',
  });
}

function groupedPathGeometryPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><Group Self="g1" ItemTransform="1 0 0 1 300 200"><TextFrame Self="tf1" ParentStory="s1" ItemTransform="1 0 0 1 -100 -50"><Properties><PathGeometry><GeometryPathType><PathPointArray><PathPointType Anchor="0 0"/><PathPointType Anchor="0 50"/><PathPointType Anchor="100 50"/><PathPointType Anchor="100 0"/></PathPointArray></GeometryPathType></PathGeometry></Properties></TextFrame></Group></Page></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange><Content>Grouped text</Content></CharacterStyleRange></Story>',
  });
}
function appliedMasterPackage(overrideList = "") {
  const spreadXml = '<Spread><Page Self="p1" GeometricBounds="0 0 400 600" ItemTransform="1 0 0 1 200 80" AppliedMaster="m" OverrideList="__OVERRIDE__"/><Page Self="p2" GeometricBounds="0 0 400 600" ItemTransform="1 0 0 1 200 80"/></Spread>'.replace('__OVERRIDE__', overrideList);
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": spreadXml,
    "MasterSpreads/MasterSpread_m.xml": '<MasterSpread Self="m"><Page Self="mp1" GeometricBounds="0 0 400 600" ItemTransform="1 0 0 1 100 50"/><TextFrame Self="master-text" ParentStory="master-story" ItemTransform="1 0 0 1 210 100"><Properties><PathGeometry><GeometryPathType><PathPointArray><PathPointType Anchor="0 0"/><PathPointType Anchor="0 50"/><PathPointType Anchor="100 50"/><PathPointType Anchor="100 0"/></PathPointArray></GeometryPathType></PathGeometry></Properties></TextFrame><Rectangle Self="master-image" GeometricBounds="100 200 150 260"><Link LinkResourceURI="Links/master-missing.psd"/></Rectangle><Oval Self="master-oval" GeometricBounds="200 300 240 340"/></MasterSpread>',
    "Stories/MasterStory.xml": '<Story Self="master-story"><CharacterStyleRange><Content>Master text</Content></CharacterStyleRange></Story>',
  });
}function pathGeometryPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"/><TextFrame Self="tf1" ParentStory="s1" ItemTransform="1 0 0 1 129 60.6"><Properties><PathGeometry><GeometryPathType><PathPointArray><PathPointType Anchor="-75 -75"/><PathPointType Anchor="-75 -20.5"/><PathPointType Anchor="236.76 -20.5"/><PathPointType Anchor="236.76 -75"/></PathPointArray></GeometryPathType></PathGeometry></Properties></TextFrame></Spread>',
    "Stories/Story.xml": '<Story Self="s1"><CharacterStyleRange><Content>Path geometry text</Content></CharacterStyleRange></Story>',
  });
}function hyperlinkPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" GeometricBounds="10 20 100 340" URL="javascript:alert(1)" Href="https://example.test/lesson"><Content>Publisher link</Content></TextFrame></Page></Spread>',
  });
}
function largeStoryPackage(storyId: string, textBytes: number) {
  const storyText = "A".repeat(textBytes);
  return packagedIdml({
    "designmap.xml": `<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>`,
    "Spreads/Spread.xml": `<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="${storyId}" GeometricBounds="10 20 100 340"/></Page></Spread>`,
    "Stories/Story_large.xml": `<Story Self="${storyId}"><CharacterStyleRange><Content>${storyText}</Content></CharacterStyleRange></Story>`,
  }, "document.idml", { storedPaths: ["Stories/Story_large.xml"] });
}
function malformedXmlPackage() {
  return packagedIdml({
    "designmap.xml": '<DesignMap><Spread src="Spreads/Spread.xml"/></DesignMap>',
    "Spreads/Spread.xml": '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" ParentStory="s1" GeometricBounds="20 40 100 340"/></Page></Spread>',
    "Stories/Story_bad.xml": '<Story Self="s1">\n  <CharacterStyleRange><Content>Broken</CharacterStyleRange></Content>\n</Story>',
  });
}

function idmlArchive(entries: Record<string, ZipValue>, options?: ZipOptions) { return zip(entries, options); }
function packagedIdml(entries: Record<string, ZipValue>, idmlPath = "document.idml", options?: ZipOptions) { return zip({ [idmlPath]: idmlArchive(entries, options) }); }

function zip(entries: Record<string, ZipValue>, options: ZipOptions = {}) {
  const storedPaths = new Set(options.storedPaths ?? []);
  const files = Object.entries(entries).map(([name, value]) => ({ name, data: typeof value === "string" ? new TextEncoder().encode(value) : value }));
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const stored = storedPaths.has(file.name);
    const method = stored ? 0 : 8;
    const compressed = stored ? file.data : deflateRawSync(file.data);
    const declaredUncompressed = options.declaredUncompressedBytes?.[file.name] ?? file.data.length;
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, method, true);
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
    directoryView.setUint16(10, method, true);
    directoryView.setUint32(20, compressed.length, true);
    directoryView.setUint32(24, declaredUncompressed, true);
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

function capture(action: () => unknown) {
  try { action(); } catch (error) { return error; }
  return undefined;
}

function pseudoRandomBytes(length: number, seed: number) {
  const data = new Uint8Array(length);
  let value = seed;
  for (let index = 0; index < data.length; index += 1) {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    data[index] = value >>> 24;
  }
  return data;
}

function largeSpreadXml(targetBytes: number) {
  const prefix = '<Spread><Page Self="p1" GeometricBounds="0 0 400 600"><TextFrame Self="t1" GeometricBounds="10 10 100 390"><Content>';
  const suffix = '</Content></TextFrame></Page></Spread>';
  const fillerBytes = targetBytes - Buffer.byteLength(prefix, "utf8") - Buffer.byteLength(suffix, "utf8");
  if (fillerBytes < 0) throw new Error("The requested XML fixture is too small.");
  return prefix + "A".repeat(fillerBytes) + suffix;
}

function concat(chunks: Uint8Array[]) { const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0); const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; } return output; }
function utf8Bom(value: string) { return new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(value)]); }
function utf16Le(value: string) { const data = Buffer.from(value, "utf16le"); return new Uint8Array([0xff, 0xfe, ...data]); }
