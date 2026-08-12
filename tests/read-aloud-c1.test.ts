import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("publisher Read Aloud uses only the active page metadata and supported browser speech APIs", () => {
  const player = read("components/content/V2ReadAloudPlayer.tsx");
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");

  assert.match(player, /globalThis\.speechSynthesis/);
  assert.match(player, /new SpeechSynthesisUtterance\(text\)/);
  assert.match(player, /speech\.speak\(utterance\)/);
  assert.match(player, /pageText !== undefined/);
  assert.match(workspace, /pageText=\{activeOriginalPage\?\.readAloud\?\.text \?\? ""\}/);
  assert.doesNotMatch(workspace, /extractPdfPageText|pdfjs/i);
});

test("publisher controls expose missing-text preparation and do not auto-prepare filtered pages", () => {
  const player = read("components/content/V2ReadAloudPlayer.tsx");
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");

  assert.match(player, /Reading text has not been prepared for this book\/page\./);
  assert.match(player, /Prepare Read Aloud/);
  assert.match(workspace, /const canPrepareReadAloud = Boolean\(hasFullBookPdf && onPrepareReadAloud\)/);
  assert.match(workspace, /pageContext=\{pageCountLabel\}/);
});

test("manual reading text updates only the original active page and marks it reviewed", () => {
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
  const inspector = read("components/admin/books/editor/ReadAloudPageInspector.tsx");

  assert.match(workspace, /ReadAloudPageInspector/);
  assert.match(workspace, /updateV2PageLayout\(layout, \(pages\) => pages\.map/);
  assert.match(workspace, /readAloud: \{ text, source: "MANUAL", reviewed: true \}/);
  assert.match(inspector, /Save Reading Text/);
  assert.match(inspector, /page\.readAloud\?\.source === "MANUAL"/);
});

test("Prepare Read Aloud uses the existing owned Book action and reloads the current absolute-page view", () => {
  const action = read("app/admin/books/[id]/content/actions.ts");
  const page = read("app/admin/books/[id]/content/page.tsx");
  const editor = read("components/admin/books/ContentManuscriptEditor.tsx");
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");

  assert.match(action, /prepareBookReadAloudAction\(bookId: string\)[\s\S]*prepareOwnedBookReadAloud\(bookId\)[\s\S]*return result/);
  assert.match(page, /prepareReadAloudAction=\{bookEditor \? prepareBookReadAloudAction\.bind\(null, bookId\) : undefined\}/);
  assert.match(editor, /onPrepareReadAloud=\{prepareReadAloudAction\}/);
  assert.match(workspace, /globalThis\.location\.reload\(\)/);
  assert.doesNotMatch(page, /prepareReadAloudAction=.*selected\.id/);
});

test("Read Aloud remains publisher-only and does not add student controls or cover text", () => {
  const controlsPath = "components/admin/books/editor/ReadAloudControls.tsx";
  const controls = read(controlsPath);
  const studentFiles = [
    "components/student/StudentPdfReader.tsx",
    "app/student-dashboard/books/[bookId]/page.tsx",
  ].map(read).join("\n");

  assert.match(controls, /"use client"/);
  assert.doesNotMatch(controls, /SpeechSynthesisUtterance.*student|analytics|audio file/i);
  assert.doesNotMatch(studentFiles, /ReadAloudControls|Prepare Read Aloud|Page Read Aloud/);
  assert.doesNotMatch(controls, /cover|Cover/);
});
