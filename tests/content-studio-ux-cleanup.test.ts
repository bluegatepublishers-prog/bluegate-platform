import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const range = read("components/admin/books/BookPageRangeInspector.tsx");
const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
const replacementCharacter = String.fromCodePoint(0xfffd);
const mojibakeLeadCharacters = [0x00c2, 0x00c3, 0x00e2].map((codePoint) => String.fromCodePoint(codePoint));
const bullet = String.fromCodePoint(0x00b7);
const scopedUiFiles = [
  "components/admin/books/BookPageRangeInspector.tsx",
  "components/admin/books/editor/V2DocumentWorkspace.tsx",
  "components/admin/books/ContentManuscriptEditor.tsx",
  "components/admin/books/ContentStudioShell.tsx",
  "components/admin/books/ContentStudioTree.tsx",
  "components/content/V2ReadAloudPlayer.tsx",
  "app/admin/books/[id]/content/page.tsx",
];

test("Page Range is compact, responsive, and retains mapping controls", () => {
  assert.match(range, /data-page-range-inspector/);
  assert.match(range, /flex flex-wrap items-center gap-x-3 gap-y-2/);
  assert.match(range, /w-24 max-w-full/);
  assert.match(range, /aria-label="Start page"/);
  assert.match(range, /aria-label="End page"/);
  assert.match(range, />Set Start</);
  assert.match(range, />Set End</);
  assert.match(range, />Save Range</);
  assert.match(range, />Clear Range</);
  assert.match(range, />Map in Book</);
  assert.match(range, /Current Book Page: \{currentPage \?\? "Not available"\}/);
  assert.match(range, /saveBookPageMapping\(bookId, type, nodeId, chapterId \?\? null, nextStart, nextEnd\)/);
  assert.doesNotMatch(range, /space-y-2 rounded-xl border border-slate-200 bg-white p-3/);
});

test("scoped Content Studio UI has stable separators and no replacement or mojibake characters", () => {
  for (const path of scopedUiFiles) {
    const source = read(path);
    assert.equal(source.includes(replacementCharacter), false, `${path} contains U+FFFD`);
    for (const character of mojibakeLeadCharacters) assert.equal(source.includes(character), false, `${path} contains a mojibake lead character`);
  }
  assert.equal(workspace.includes(bullet), true);
  assert.match(workspace, /Preview \{"\\u25be"\}/);
});

test("Preview menu has a bounded click-outside and Escape lifecycle", () => {
  assert.match(workspace, /const \[previewMenuOpen, setPreviewMenuOpen\] = useState\(false\)/);
  assert.match(workspace, /ref=\{previewMenuRef\} data-v2-preview-menu/);
  assert.match(workspace, /onClick=\{\(\) => setPreviewMenuOpen\(\(current\) => !current\)\}/);
  assert.match(workspace, /globalThis\.document\.addEventListener\("pointerdown", closeWhenOutside\)/);
  assert.match(workspace, /globalThis\.document\.addEventListener\("keydown", closeOnEscape\)/);
  assert.match(workspace, /previewMenuRef\.current\?\.contains\(event\.target as Node\)/);
  assert.match(workspace, /if \(event\.key !== "Escape"\) return/);
  assert.match(workspace, /setPreviewMenuOpen\(false\); onPreview\("STUDENT"\)/);
  assert.match(workspace, /setPreviewMenuOpen\(false\); onPreview\("TEACHER"\)/);
  assert.match(workspace, /setPreviewMenuOpen\(false\); onPreview\("WHITEBOARD"\)/);
  assert.match(workspace, /z-\[90\]/);
});

test("other stateful toolbar popovers use the same cleanup lifecycle without changing native selects", () => {
  assert.match(workspace, /if \(!previewMenuOpen && !shapePickerOpen && !insertSurface\) return/);
  assert.match(workspace, /setShapePickerOpen\(false\)/);
  assert.match(workspace, /setInsertSurface\(null\)/);
  assert.match(workspace, /<select aria-label="Current page"/);
  assert.match(workspace, /<select aria-label="Page view"/);
});
