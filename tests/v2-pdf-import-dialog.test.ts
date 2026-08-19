import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { hasMeaningfulV2Content } from "../components/admin/books/editor/V2DocumentWorkspace";
import { uploadFileToR2 } from "../lib/storage/client-upload";
import type { ContentDocument } from "../lib/content-document";

const read = (path: string) => readFileSync(path, "utf8");

function documentWith(pages: Array<{ frames?: unknown[]; background?: { resourceId?: string }; replica?: object }>, blocks: unknown[] = []) {
  return {
    blocks,
    pageLayout: { pages: pages.map((page, index) => ({ id: `page-${index}`, frames: [], ...page })) },
  } as ContentDocument;
}

test("the V2 import ribbon exposes one permanent Import PDF action and one dialog", () => {
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
  const dialog = read("components/admin/books/editor/PdfImportDialog.tsx");

  assert.equal([...workspace.matchAll(/>Import PDF<\/button>/g)].length, 1);
  assert.match(workspace, /\{pdfImportOpen \? <PdfImportDialog open/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-label="Import PDF"/);
  assert.match(dialog, /useState<"EXISTING" \| "UPLOAD">\("EXISTING"\)/);
});

test("a book without a full PDF opens directly into the upload state", () => {
  const dialog = read("components/admin/books/editor/PdfImportDialog.tsx");

  assert.match(dialog, /useState<ImportStage>\(hasFullBookPdf \? "source" : "upload"\)/);
  assert.match(dialog, /\) : \(\s*<>\s*<p[^>]*>No full book PDF has been uploaded for this book yet\.<\/p>/);
  assert.match(dialog, /scope: "book-full"/);
  assert.match(dialog, /targetId: bookId/);
  assert.doesNotMatch(dialog, /data-pdf-import-upload-pending/);
  assert.match(dialog, /await onAttachUploadedPdf\(uploaded\.objectKey\)[\s\S]*await importExisting\(\)/);
  assert.equal([...dialog.matchAll(/await onImportExistingPdf\(\)/g)].length, 1);
});

test("an existing PDF retains source selection with Use existing selected by default", () => {
  const dialog = read("components/admin/books/editor/PdfImportDialog.tsx");

  assert.match(dialog, /\) : hasCurrentBookPdf \? \([\s\S]*A PDF is already available for this book\./);
  assert.match(dialog, />Use existing PDF</);
  assert.match(dialog, />Upload another PDF</);
  assert.match(dialog, /checked=\{choice === "EXISTING"\}/);
});

test("dialog errors and generated pages reset on close and before each import", () => {
  const dialog = read("components/admin/books/editor/PdfImportDialog.tsx");

  assert.match(dialog, /const reset = \(\) => \{[\s\S]*setSelectedFile\(null\);[\s\S]*setGeneratedPages\(null\);[\s\S]*setError\(""\);/);
  assert.match(dialog, /const importExisting = async \(\) => \{[\s\S]*setError\(""\);[\s\S]*setGeneratedPages\(null\);/);
  assert.match(dialog, /setError\(safePdfImportMessage\(cause, "The PDF could not be read safely\. Export the book PDF again and retry\."\)\)/);
  assert.match(dialog, /recordPdfImportFailure\("EXISTING_PDF", cause\)/);
  assert.match(dialog, /recordPdfImportFailure\(uploadFailureStage\(cause\), cause\)/);
  assert.match(dialog, /"UPLOAD_INIT" \| "SIGNED_PUT" \| "UPLOAD_COMPLETE" \| "BOOK_ASSOCIATION" \| "PDF_VALIDATION" \| "V2_GENERATION"/);
  assert.doesNotMatch(dialog, /transport: "SAME_ORIGIN_PROXY"/);
  assert.match(dialog, /scope: "book-full"[\s\S]*targetId: bookId[\s\S]*failurePrefix: "BOOK_PDF"/);
  assert.match(dialog, /function safePdfImportMessage/);
  assert.match(dialog, /The PDF exceeds the 100 MB book upload limit\./);
  assert.match(dialog, /setError\(safePdfImportMessage\(cause,/);
});

test("upload association is owned, validated, and refreshes the boolean before normal V2 import", () => {
  const action = read("app/admin/books/[id]/content/actions.ts");
  const page = read("app/admin/books/[id]/content/page.tsx");
  const editor = read("components/admin/books/ContentManuscriptEditor.tsx");
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");

  assert.match(action, /attachOwnedBookFullPdfAction\(bookId: string, objectKey: string\)[\s\S]*requireLivePublisherAdmin\(\)[\s\S]*inspectPublisherBookPdf\(key, actor\.publisherId\)[\s\S]*assertBookPdfReplacementMappingsFit\(bookId, actor\.publisherId, inspection\.pageCount\)[\s\S]*where:\s*\{\s*id: bookId,\s*publisherId: actor\.publisherId\s*\}[\s\S]*fullBookPdf: key/);
  assert.match(read("lib/book-pdf.ts"), /Cannot replace the full-book PDF/);
  assert.match(page, /const hasFullBookPdf = Boolean\([\s\S]*select: \{ fullBookPdf: true \}/);
  assert.match(page, /hasFullBookPdf=\{hasFullBookPdf\}/);
  assert.match(editor, /hasFullBookPdf=\{hasFullBookPdf\}[\s\S]*onAttachPdf=\{attachPdfAction\}/);
  assert.match(workspace, /hasFullBookPdf=\{hasFullBookPdf \|\| uploadedPdfIsAvailable\}/);
  assert.match(workspace, /setUploadedPdfIsAvailable\(true\); router\.refresh\(\);/);
});

test("PDF import replaces rather than merges V2 pages and resets the active page", () => {
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
  const dialog = read("components/admin/books/editor/PdfImportDialog.tsx");

  assert.match(dialog, /Importing this PDF will replace the current V2 page layout/);
  assert.match(dialog, />Replace with PDF</);
  assert.match(workspace, /const pageLayout = createV2PageLayout/);
  assert.match(workspace, /setActivePageId\(pageLayout\.pages\[0\]\?\.id \?\? null\)/);
  assert.match(workspace, /layoutVersion: 2, pageLayout/);
  assert.doesNotMatch(workspace, /mergePdf/);
});

test("Replace with PDF applies already generated pages without re-importing", () => {
  const dialog = read("components/admin/books/editor/PdfImportDialog.tsx");

  assert.match(dialog, /setGeneratedPages\(result\.pages\);\s*setStage\("confirm-replace"\);/);
  assert.match(dialog, /const replaceWithPdf = \(\) => \{\s*if \(!generatedPages\) return;\s*finish\(generatedPages\);/);
  assert.equal([...dialog.matchAll(/await onImportExistingPdf\(\)/g)].length, 1);
});

test("replacement confirmation distinguishes empty layouts from authored V2 content", () => {
  assert.equal(hasMeaningfulV2Content(documentWith([{}])), false);
  assert.equal(hasMeaningfulV2Content(documentWith([{ frames: [{}] }])), true);
  assert.equal(hasMeaningfulV2Content(documentWith([{ background: { resourceId: "background" } }])), true);
  assert.equal(hasMeaningfulV2Content(documentWith([{}], [{}])), true);
});
test("full-book PDF uses the direct presigned PUT transport", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const file = { name: "book.pdf", type: "application/pdf", size: 42 } as File;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "/api/storage/upload/init") {
      return new Response(JSON.stringify({
        ok: true,
        uploadUrl: "https://r2.example/upload",
        objectKey: "books/full-books/publisher-a/book.pdf",
        requiredHeaders: {
          "Content-Type": "application/pdf",
          "x-amz-meta-original-filename": "book.pdf",
          "x-amz-meta-upload-scope": "book-full",
          "x-amz-meta-target-id": "book-1",
        },
      }), { status: 200 });
    }
    if (url === "https://r2.example/upload") {
      assert.equal(init?.method, "PUT");
      assert.equal((init?.headers as Record<string, string>)["Content-Type"], "application/pdf");
      assert.equal((init?.headers as Record<string, string>)["x-amz-meta-upload-scope"], "book-full");
      assert.equal(init?.body, file);
      return new Response(null, { status: 200 });
    }
    if (url === "/api/storage/upload/complete") {
      return new Response(JSON.stringify({
        ok: true,
        objectKey: "books/full-books/publisher-a/book.pdf",
        contentType: "application/pdf",
        sizeBytes: 42,
      }), { status: 200 });
    }
    throw new Error(`Unexpected upload request: ${url}`);
  }) as typeof fetch;

  try {
    const result = await uploadFileToR2({
      file,
      scope: "book-full",
      targetId: "book-1",
      failurePrefix: "BOOK_PDF",
    });
    assert.equal(result.objectKey, "books/full-books/publisher-a/book.pdf");
    assert.deepEqual(requests.map((request) => request.url), [
      "/api/storage/upload/init",
      "https://r2.example/upload",
      "/api/storage/upload/complete",
    ]);
    assert.equal(requests.some((request) => request.url === "/api/storage/upload/proxy"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failed direct full-book PDF PUT does not call complete", async () => {
  const originalFetch = globalThis.fetch;
  let completeCalled = false;
  const file = { name: "book.pdf", type: "application/pdf", size: 42 } as File;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/storage/upload/init") {
      return new Response(JSON.stringify({
        ok: true,
        uploadUrl: "https://r2.example/upload",
        objectKey: "books/full-books/publisher-a/book.pdf",
        requiredHeaders: { "Content-Type": "application/pdf" },
      }), { status: 200 });
    }
    if (url === "https://r2.example/upload") {
      return new Response("storage rejected", { status: 503 });
    }
    if (url === "/api/storage/upload/complete") {
      completeCalled = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    throw new Error(`Unexpected upload request: ${url}`);
  }) as typeof fetch;

  try {
    await assert.rejects(
      uploadFileToR2({ file, scope: "book-full", failurePrefix: "BOOK_PDF" }),
      /BOOK_PDF_STORAGE_TRANSFER_FAILED/,
    );
    assert.equal(completeCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});