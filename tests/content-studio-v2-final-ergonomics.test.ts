import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getV2ShapePayload } from "../components/content/v2/V2ShapeVisual";
import { getV2BrowserVoiceOptions } from "../components/content/V2ReadAloudPlayer";
import { createV2Frame, createV2PageLayout, getV2Frame, normalizePageLayoutV2, updateV2Frame } from "../lib/content-layout-v2";
import { getEducationalObjectDefinition } from "../lib/educational-object-registry";

const read = (path: string) => readFileSync(path, "utf8");
const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
const studio = read("components/admin/books/ContentManuscriptEditor.tsx");
const shapeVisual = read("components/content/v2/V2ShapeVisual.tsx");
const educationalFrame = read("components/admin/books/editor/V2EducationalFrame.tsx");

test("Home uses compact named command families without a generic More control", () => {
  for (const family of ["Clipboard ▾", "Font ▾", "Paragraph ▾", "Styles ▾"]) assert.match(workspace, new RegExp(family));
  assert.match(workspace, /data-v2-clipboard-menu/);
  assert.match(workspace, /Cut[\s\S]*Copy[\s\S]*Paste/);
  assert.match(workspace, /Strikethrough[\s\S]*Text Colour[\s\S]*Highlight Colour[\s\S]*Superscript[\s\S]*Subscript/);
  assert.match(workspace, /Align Left[\s\S]*Bullets[\s\S]*Numbering[\s\S]*Increase Indent[\s\S]*Line Spacing/);
  assert.match(workspace, /Normal[\s\S]*Title[\s\S]*Heading 1[\s\S]*Heading 2[\s\S]*Heading 3[\s\S]*Subtitle[\s\S]*Caption/);
  assert.doesNotMatch(workspace, /data-v2-home-more/);
});

test("Import InDesign is a main tab and not an Insert command", () => {
  assert.match(workspace, /\["HOME", "INSERT", "REVIEW", "VIEW", "IMPORT"\]/);
  assert.match(workspace, /tab === "IMPORT" \? "Import InDesign"/);
  const insert = workspace.slice(workspace.indexOf('activeRibbonTab === "INSERT"'), workspace.indexOf('activeRibbonTab === "IMPORT"'));
  assert.doesNotMatch(insert, />Import InDesign</);
  assert.match(workspace, /data-v2-import-controls/);
  assert.match(workspace, /Choose Package/);
});

test("text-capable shapes preserve text, padding, and vertical alignment through V2 normalization", () => {
  for (const shapeType of ["RECTANGLE", "ROUNDED_RECTANGLE", "ELLIPSE"]) {
    const frame = createV2Frame("SHAPE", "page-a", { id: shapeType, payload: { shapeType, text: "A custom box", textPadding: 20, verticalAlign: "CENTER" } });
    const layout = createV2PageLayout({ pages: [{ id: "page-a", frames: [frame] }] });
    const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(updateV2Frame(layout, "page-a", shapeType, { payload: frame.payload }))))!;
    const payload = getV2ShapePayload(getV2Frame(reloaded, "page-a", shapeType)!.payload);
    assert.equal(payload.text, "A custom box");
    assert.equal(payload.textPadding, 20);
    assert.equal(payload.verticalAlign, "CENTER");
  }
  assert.match(shapeVisual, /data-v2-shape-text-editor/);
  assert.match(shapeVisual, /onDoubleClick/);
  assert.match(workspace, /Shape text padding/);
});

test("Educational heading is editable while semantic type and theme remain fixed", () => {
  const definition = getEducationalObjectDefinition("didYouKnow");
  const frame = createV2Frame("EDUCATIONAL", "page-a", { id: "edu-a", payload: { educationalObjectType: "didYouKnow", title: "Think About It", body: "Matter" } });
  const layout = createV2PageLayout({ pages: [{ id: "page-a", frames: [frame] }] });
  const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(updateV2Frame(layout, "page-a", "edu-a", { payload: frame.payload }))))!;
  const payload = getV2Frame(reloaded, "page-a", "edu-a")!.payload as Record<string, unknown>;
  assert.equal(payload.educationalObjectType, "didYouKnow");
  assert.equal(payload.title, "Think About It");
  assert.ok(definition.icon && definition.theme.border);
  assert.match(educationalFrame, /Educational Block heading/);
  assert.match(educationalFrame, /educationalObjectType: objectType/);
});

test("View exposes an explicit target-page delete confirmation", () => {
  assert.match(workspace, /data-v2-delete-page-dialog/);
  assert.match(workspace, /aria-label="Page to delete"/);
  assert.match(workspace, /This page contains \{deletePageObjectCount\} objects/);
  assert.match(workspace, /deletePage\(deletePageTarget\.id\)/);
  assert.match(workspace, /remaining page IDs preserved/);
  assert.match(workspace, /disabled=\{layout\.pages\.length <= 1\}/);
});

test("every current V2 preview page receives a page-scoped Read Aloud bar", () => {
  assert.match(studio, /data-v2-preview-read-aloud-bar/);
  assert.match(studio, /data-v2-preview-page-id=\{activePreviewPage\.id\}/);
  assert.match(studio, /buildV2NarrationManifest\(selectedPageDocument/);
  assert.match(studio, /<V2ReadAloudPlayer manifest=\{previewNarration\}/);
});

test("browser voice choices are truthful and preserve human-audio routing", () => {
  const options = getV2BrowserVoiceOptions([
    { voiceURI: "in", name: "India", lang: "en-IN" },
    { voiceURI: "gb", name: "Britain", lang: "en-GB" },
    { voiceURI: "us", name: "United States", lang: "en-US" },
    { voiceURI: "fr", name: "France", lang: "fr-FR" },
  ] as SpeechSynthesisVoice[]);
  assert.deepEqual(options.map((voice) => voice.category), ["Indian English", "British English", "American English"]);
  assert.match(read("components/content/V2ReadAloudPlayer.tsx"), /Indian English voice not available on this device/);
  assert.match(read("components/content/V2ReadAloudPlayer.tsx"), /resolveAudioUrl/);
});
