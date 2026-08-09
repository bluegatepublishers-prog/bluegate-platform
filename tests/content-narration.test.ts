import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { filterDocumentForMode } from "../lib/content-audience";
import { createContentDocument, type ContentBlock } from "../lib/content-document";
import { adoptLayoutV2, createV2Frame } from "../lib/content-layout-v2";
import {
  buildV2NarrationManifest,
  getNarrationStatus,
  hashNarrationSource,
} from "../lib/content-narration";
import { createFakeNarrationProvider, getNarrationProvider, narrationRequestForSegment } from "../lib/content-narration-provider";

function narrationDocument() {
  const blocks: ContentBlock[] = [
    { id: "paragraph", type: "paragraph", text: "First sentence. Second sentence?", spans: [{ text: "First sentence. Second sentence?" }] },
    { id: "teacher-note", type: "paragraph", text: "Teacher Note must stay private.", spans: [{ text: "Teacher Note must stay private." }] },
    {
      id: "activity",
      type: "activity",
      title: "Magnet activity",
      fields: [
        { id: "instructions", type: "instructions", label: "Instructions", text: "Bring a magnet.", visibility: { student: true, teacher: true } },
        { id: "teacher", type: "teacherNote", label: "Teacher Note", text: "Reveal the answer.", visibility: { student: false, teacher: true } },
      ],
    },
    {
      id: "table",
      type: "table",
      title: "Materials",
      rows: [
        { id: "row-1", cells: [{ id: "a", text: "Iron" }, { id: "b", text: "Attracted" }] },
        { id: "row-2", cells: [{ id: "c", text: "Wood" }, { id: "d", text: "Not attracted" }] },
      ],
    },
  ];
  const pageId = "page-exact";
  const frames = [
    createV2Frame("TEXT", pageId, { id: "paragraph-frame", payload: { text: "First sentence. Second sentence?" }, readingOrder: 2, readable: true, renderMode: "SEMANTIC_ONLY", x: 300, y: 400 }),
    createV2Frame("TEXT", pageId, { id: "teacher-frame", payload: "Teacher guidance", readingOrder: 1, readable: true, audience: "TEACHER", renderMode: "SEMANTIC_ONLY", x: 10, y: 10 }),
    createV2Frame("ACTIVITY", pageId, { id: "activity-frame", contentRef: { blockId: "activity" }, readingOrder: 3, readable: true, x: 50, y: 500 }),
    createV2Frame("TABLE", pageId, { id: "table-frame", contentRef: { blockId: "table" }, readingOrder: 4, readable: true, x: 50, y: 700 }),
    createV2Frame("IMAGE", pageId, { id: "decorative-image", altText: "image", readingOrder: 5, readable: true, x: 1, y: 1 }),
  ];
  return adoptLayoutV2(createContentDocument(blocks), {
    pageSize: { preset: "CUSTOM", width: 800, height: 1000, unit: "px" },
    pages: [{
      id: pageId,
      order: 0,
      width: 800,
      height: 1000,
      unit: "px",
      visualMode: "EXACT_REPLICA",
      replica: { resourceId: "replica-resource", sourceKind: "PAGE_IMAGE", intrinsicWidth: 800, intrinsicHeight: 1000, fitMode: "CONTAIN", sourceHash: "replica-hash" },
      frames,
    }],
  });
}

test("manifest follows explicit semantic reading order and remains deterministic", () => {
  const document = narrationDocument();
  const first = buildV2NarrationManifest(document, "STUDENT", { scopeId: "module-1" });
  const second = buildV2NarrationManifest(document, "STUDENT", { scopeId: "module-1" });
  assert.deepEqual(first.segments.map((segment) => segment.id), second.segments.map((segment) => segment.id));
  assert.deepEqual(first.segments.map((segment) => segment.text), [
    "First sentence.",
    "Second sentence?",
    "Magnet activity",
    "Instructions: Bring a magnet.",
    "Materials",
    "Iron | Attracted",
    "Wood | Not attracted",
  ]);
  assert.equal(first.segments.some((segment) => segment.text.includes("Teacher")), false);
  assert.equal(first.segments.some((segment) => segment.text === "image"), false);
});

test("Exact Replica SEMANTIC_ONLY frames participate without OCR or duplicate visual text", () => {
  const manifest = buildV2NarrationManifest(narrationDocument(), "STUDENT");
  assert.equal(manifest.pages[0]?.segments.length, 7);
  assert.ok(manifest.pages[0]?.segments.every((segment) => segment.frameId));
  const renderer = readFileSync("components/content/V2ContentDocumentRenderer.tsx", "utf8");
  assert.match(renderer, /SEMANTIC_ONLY/);
  assert.match(renderer, /data-v2-narration-active/);
  assert.doesNotMatch(renderer, /OCR|Tesseract/);
});

test("container children are traversed after container semantics in child reading order", () => {
  const pageId = "container-page";
  const parent = createV2Frame("EDUCATIONAL", pageId, {
    id: "container",
    payload: { title: "Do You Know", body: "Magnets attract iron." },
    readingOrder: 1,
    readable: true,
    children: [
      createV2Frame("TEXT", pageId, { id: "child-late", payload: "Child two.", readingOrder: 2, readable: true }),
      createV2Frame("TEXT", pageId, { id: "child-early", payload: "Child one.", readingOrder: 1, readable: true }),
    ],
  });
  const document = adoptLayoutV2(createContentDocument([]), {
    pages: [{ id: pageId, order: 0, width: 600, height: 800, unit: "px", frames: [parent] }],
    pageSize: { width: 600, height: 800, unit: "px" },
  });
  assert.deepEqual(buildV2NarrationManifest(document, "STUDENT").segments.map((segment) => segment.text), [
    "Do You Know",
    "Magnets attract iron.",
    "Child one.",
    "Child two.",
  ]);
});

test("audience filtering occurs before narration extraction", () => {
  const document = narrationDocument();
  const student = buildV2NarrationManifest(filterDocumentForMode(document, "STUDENT", []), "STUDENT");
  const teacher = buildV2NarrationManifest(filterDocumentForMode(document, "TEACHER", []), "TEACHER");
  assert.equal(student.segments.some((segment) => /Teacher|Reveal the answer/u.test(segment.text)), false);
  assert.equal(teacher.segments.some((segment) => segment.text.includes("Reveal the answer")), true);
});

test("language metadata reaches segments and source hashes exclude playback speed", () => {
  const pageId = "hindi-page";
  const frame = createV2Frame("TEXT", pageId, { id: "hindi", payload: "नमस्ते दुनिया। अगला वाक्य।", language: "hi", readable: true, readingOrder: 1 });
  const document = adoptLayoutV2(createContentDocument([]), { pages: [{ id: pageId, order: 0, width: 500, height: 500, unit: "px", frames: [frame] }], pageSize: { width: 500, height: 500, unit: "px" } });
  const manifest = buildV2NarrationManifest(document, "STUDENT");
  assert.equal(manifest.segments[0]?.language, "hi");
  assert.notEqual(hashNarrationSource({ text: "hello", language: "en" }), hashNarrationSource({ text: "hello", language: "hi" }));
  assert.equal(hashNarrationSource({ text: "hello", language: "en" }), hashNarrationSource({ text: "hello", language: "en", voice: undefined }));
});

test("narration becomes stale when semantic text changes", () => {
  const document = narrationDocument();
  const manifest = buildV2NarrationManifest(document, "STUDENT");
  const page = document.pageLayout!.pages[0];
  const ready = { ...page, narration: { sourceHash: manifest.pages[0]!.sourceHash, resourceId: "human-audio", status: "READY" as const } };
  assert.equal(getNarrationStatus(ready, manifest.pages[0]!), "READY");
  assert.equal(getNarrationStatus({ ...ready, narration: { ...ready.narration!, sourceHash: "old-hash" } }, manifest.pages[0]!), "NEEDS_REGENERATION");
  assert.equal(getNarrationStatus({ ...page, narration: undefined }, manifest.pages[0]!), "BROWSER_TTS_FALLBACK");
});

test("provider interface is unconfigured by default and supports a fake provider", async () => {
  assert.equal(getNarrationProvider().provider, null);
  const provider = createFakeNarrationProvider();
  const manifest = buildV2NarrationManifest(narrationDocument(), "STUDENT");
  const result = await provider.generate(narrationRequestForSegment(manifest.segments[0]!));
  assert.equal(result.sourceHash, manifest.segments[0]!.sourceHash);
});

test("delivery resolves narration through protected Resource routes", () => {
  const source = readFileSync("lib/content-delivery.ts", "utf8");
  assert.match(source, /collectV2ResourceIds/);
  assert.match(source, /page\.narration/);
  assert.match(source, /ResourceAudience\.STUDENT/);
  assert.match(source, /api\/student\/resources/);
});