import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const sidebar = read("components/admin/AdminSidebar.tsx");
const route = read("app/admin/qr/page.tsx");
const ribbon = read("components/admin/books/editor/WordRibbon.tsx");
const manuscriptEditor = read("components/admin/books/ContentManuscriptEditor.tsx");
const contentPage = read("app/admin/books/[id]/content/page.tsx");
const tree = read("lib/content-studio-tree.ts");
const linkedAssetTypes = read("lib/content-linked-asset-types.ts");
const linkedAssets = read("lib/content-linked-assets.ts");
const schema = read("prisma/schema.prisma");
const architecture = read("docs/qr-manager-architecture.md");

test("Publisher Admin exposes QR Manager as a top-level navigation item", () => {
  const qrIndex = sidebar.indexOf('name: "QR Manager"');
  const contentIndex = sidebar.indexOf('name: "Content Studio"');
  const requestsIndex = sidebar.indexOf('name: "Requests"');

  assert.ok(qrIndex > contentIndex);
  assert.ok(qrIndex < requestsIndex);
  assert.match(sidebar, /href: "\/admin\/qr"/);
});

test("QR Manager route is an explicit phase-0 print-first workspace", () => {
  assert.match(route, /title: "QR Manager \| Bluegate Admin"/);
  assert.match(route, /QR Manager/);
  assert.match(route, /Create permanent dynamic QR codes for printed books/);
  assert.match(route, /Books/);
  assert.match(route, /QR Codes/);
  assert.match(route, /Print-first workflow/);
  assert.match(route, /Coming in next QR phase/);
});

test("Content Studio does not expose printed QR authoring", () => {
  assert.doesNotMatch(ribbon, /QR Code|onInsert\("qr"\)/);
  assert.doesNotMatch(manuscriptEditor, /kind === "qr"/);
  assert.doesNotMatch(contentPage, /kind === "qr"|Chapter QR Codes|Create QR For This Scope/);
  assert.doesNotMatch(tree, /\| "qr"/);
  assert.doesNotMatch(linkedAssetTypes, /DYNAMIC_QR_CODE|"qr"/);
  assert.doesNotMatch(linkedAssets, /dynamicQrCode|assetKind: "qr"|qrAudienceOptions/);
});

test("QR is not introduced as a ResourceType", () => {
  const start = schema.indexOf("enum ResourceType");
  const end = schema.indexOf("}", start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(schema.slice(start, end), /QR/i);
});

test("QR architecture records the permanent, empty, edition-aware boundary", () => {
  for (const phrase of [
    "https://edoralearning.in/q/{code}",
    "attachedResourceCount = 0",
    "0..many QrAttachment",
    "must never be hard-deleted or reused",
    "Edora Dynamic QR",
    "No Prisma model or migration",
  ]) {
    assert.match(architecture, new RegExp(phrase.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  }
});