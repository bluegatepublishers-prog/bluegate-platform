import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createV2Frame,
  createV2PageLayout,
  deleteV2Frame,
  getV2Frame,
  normalizePageLayoutV2,
  updateV2Frame,
} from "../lib/content-layout-v2";
import { resolveUploadContentType, uploadFileToR2 } from "../lib/storage/client-upload";
import { isV2ImageResource, isV2VideoResource } from "../components/admin/books/editor/V2DocumentWorkspace";

const studio = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");
const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
const imageVisual = readFileSync("components/content/v2/V2ImageVisual.tsx", "utf8");
const deliveryRenderer = readFileSync("components/content/V2ContentDocumentRenderer.tsx", "utf8");
const resourceRoute = readFileSync("app/api/admin/resources/[id]/route.ts", "utf8");
const resourceMenu = readFileSync("components/admin/resources/ResourceMoreMenu.tsx", "utf8");
const imageReferences = readFileSync("lib/content-image-references.ts", "utf8");

test("image chooser accepts image resources and excludes explicitly typed video resources", () => {
  assert.equal(isV2ImageResource({ id: "image", title: "Photo", type: "IMAGE", mimeType: "image/png" }), true);
  assert.equal(isV2ImageResource({ id: "legacy", title: "Legacy", type: null, mimeType: "image/webp" }), true);
  assert.equal(isV2ImageResource({ id: "video", title: "Video", type: "VIDEO", mimeType: "image/png" }), false);
  assert.equal(isV2VideoResource({ id: "image", title: "Photo", type: "IMAGE", mimeType: "image/png" }), false);
});

test("image MIME inference supports JPG, PNG, and WEBP with blank MIME and rejects unsupported files", () => {
  assert.equal(resolveUploadContentType("photo.JPG", "", "resource-file"), "image/jpeg");
  assert.equal(resolveUploadContentType("diagram.png", "", "resource-file"), "image/png");
  assert.equal(resolveUploadContentType("cover.webp", "", "resource-file"), "image/webp");
  assert.equal(resolveUploadContentType("payload.exe", "", "resource-file"), null);
});

test("image upload uses the authenticated same-origin proxy and one canonical MIME", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "/api/storage/upload/init") {
      return new Response(JSON.stringify({ ok: true, uploadUrl: "https://r2.example/upload", objectKey: "resources/files/publisher/photo.jpg", requiredHeaders: { "Content-Type": "image/jpeg" } }), { status: 200 });
    }
    if (url === "/api/storage/upload/complete") {
      return new Response(JSON.stringify({ ok: true, objectKey: "resources/files/publisher/photo.jpg", contentType: "image/jpeg", sizeBytes: 5 }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, objectKey: "resources/files/publisher/photo.jpg" }), { status: 200 });
  }) as typeof fetch;
  try {
    const result = await uploadFileToR2({
      file: { name: "photo.jpg", type: "", size: 5 } as File,
      scope: "resource-file",
      transport: "SAME_ORIGIN_PROXY",
      failurePrefix: "IMAGE",
    });
    assert.equal(result.contentType, "image/jpeg");
    assert.deepEqual(requests.map((request) => request.url), ["/api/storage/upload/init", "/api/storage/upload/proxy", "/api/storage/upload/complete"]);
    assert.equal(JSON.parse(String(requests[0]!.init?.body)).contentType, "image/jpeg");
    assert.equal((requests[1]!.init?.headers as Record<string, string>)["Content-Type"], "image/jpeg");
    assert.equal(JSON.parse(String(requests[2]!.init?.body)).expectedContentType, "image/jpeg");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("image Resource creation remains one POST after storage completion with canonical metadata", () => {
  assert.match(studio, /ResourceType\.IMAGE \? \{ transport: "SAME_ORIGIN_PROXY" as const, failurePrefix: "IMAGE" \}/);
  assert.equal(studio.match(/fetch\("\/api\/admin\/resources", \{/g)?.length, 1);
  assert.match(studio, /originalFileName: input\.file\.name/);
  assert.match(studio, /mimeType: uploaded\.contentType/);
  assert.match(studio, /fileSizeBytes: String\(uploaded\.sizeBytes\)/);
});

test("image frame metadata and resource identity survive normalized save and reload", () => {
  const image = createV2Frame("IMAGE", "page-a", {
    resourceId: "resource-image",
    altText: "A labelled ecosystem diagram",
    caption: "Figure 1. Ecosystem",
    alignment: "center",
    aspectLocked: false,
    fitMode: "CROP",
  });
  const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(createV2PageLayout({ pages: [{ id: "page-a", frames: [image] }] }))));
  const frame = reloaded!.pages[0]!.frames[0]!;
  assert.equal(frame.resourceId, "resource-image");
  assert.equal(frame.altText, "A labelled ecosystem diagram");
  assert.equal(frame.caption, "Figure 1. Ecosystem");
  assert.equal(frame.alignment, "center");
  assert.equal(frame.aspectLocked, false);
  assert.equal(frame.fitMode, "CROP");
});

test("nested image geometry remains child-local, follows its parent, and clamps to the parent", () => {
  const child = createV2Frame("IMAGE", "page-a", { id: "child-image", parentId: "parent-text", x: 20, y: 30, width: 160, height: 100, resourceId: "resource-image" });
  const parent = createV2Frame("TEXT", "page-a", { id: "parent-text", x: 100, y: 120, width: 300, height: 220, children: [child] });
  const layout = createV2PageLayout({ pageSize: { width: 800, height: 600 }, pages: [{ id: "page-a", frames: [parent] }] });
  const moved = updateV2Frame(layout, "page-a", "parent-text", { x: 260, y: 210 });
  const movedChild = getV2Frame(moved, "page-a", "child-image")!;
  assert.deepEqual({ x: movedChild.x, y: movedChild.y }, { x: 20, y: 30 });
  const clamped = updateV2Frame(moved, "page-a", "child-image", { x: 999, y: 999, width: 999, height: 999 });
  const clampedChild = getV2Frame(clamped, "page-a", "child-image")!;
  assert.ok(clampedChild.x + clampedChild.width <= parent.width);
  assert.ok(clampedChild.y + clampedChild.height <= parent.height);
  assert.equal(clampedChild.parentId, "parent-text");
});

test("image properties expose sizing, default aspect preservation, semantics, flow, alignment, and crop", () => {
  assert.match(workspace, /aria-label="Image width"/);
  assert.match(workspace, /checked=\{selectedImageFrame\.aspectLocked !== false\}/);
  assert.match(workspace, /aria-label="Image alt text"/);
  assert.match(workspace, /aria-label="Image caption"/);
  assert.match(workspace, /<option value="INLINE">Inline<\/option><option value="WRAP_LEFT">Wrap Left<\/option><option value="WRAP_RIGHT">Wrap Right<\/option>/);
  assert.match(workspace, /alignImage\(selectedImageFrame, alignment\)/);
  assert.match(workspace, /\["FIT", "FILL", "CROP"\]/);
  assert.match(imageVisual, /data-v2-image-caption/);
});

test("image chooser previews protected resources and duplicate workflow offers reuse or upload", () => {
  assert.match(workspace, /api\/admin\/resources\/\$\{encodeURIComponent\(resource\.id\)\}\/preview/);
  assert.match(workspace, />Preview<\/a>/);
  assert.match(workspace, />Use Image<\/button>/);
  assert.match(workspace, /This image may already exist\./);
  assert.match(workspace, /Use Existing Image/);
  assert.match(workspace, /uploadImageAnyway/);
  assert.match(workspace, /imageResources = resources\.filter\(isV2ImageResource\)/);
});

test("frame removal preserves the shared image resource and preview uses the shared protected V2 renderer", () => {
  const image = createV2Frame("IMAGE", "page-a", { id: "frame-image", resourceId: "resource-image" });
  const layout = createV2PageLayout({ pages: [{ id: "page-a", frames: [image] }] });
  assert.equal(deleteV2Frame(layout, "page-a", "frame-image").pages[0]!.frames.length, 0);
  assert.equal(image.resourceId, "resource-image");
  assert.match(workspace, /Delete removes this image frame only/);
  assert.match(deliveryRenderer, /V2FrameContent/);
  assert.match(studio, /resourceUrls=\{Object\.fromEntries\(resourceChoices\.map/);
});

test("image library deletion protects relational and JSON references and only archives unused images", () => {
  assert.match(resourceMenu, /Delete Image from Library/);
  assert.match(resourceMenu, /\?library=image/);
  assert.match(resourceRoute, /findPublisherImageContentReferences/);
  assert.match(resourceRoute, /Image is currently used in/);
  assert.match(resourceRoute, /Unused Image archived from the library/);
  assert.match(imageReferences, /record\.resourceId === resourceId/);
  assert.match(imageReferences, /record\.targetType === "RESOURCE"/);
});

test("parked Video and working Table branches remain present while image behavior is isolated", () => {
  assert.match(studio, /ResourceType\.VIDEO \? \{ transport: "SAME_ORIGIN_PROXY" as const, failurePrefix: "VIDEO" \}/);
  assert.match(workspace, /This video may already exist\./);
  assert.match(workspace, /data-v2-table-chooser/);
  assert.match(workspace, /addChildFrame\("TABLE"/);
});
