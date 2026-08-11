import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  StorageUploadError,
  resolveUploadContentType,
  uploadFileToR2,
} from "../lib/storage/client-upload";
import {
  createV2CompatibilityLayout,
  createV2Frame,
  createV2PageLayout,
  deleteV2Frame,
  getV2VideoDisplayMode,
  normalizePageLayoutV2,
  withV2VideoDisplayMode,
} from "../lib/content-layout-v2";
import { isV2VideoResource } from "../components/admin/books/editor/V2DocumentWorkspace";

const clientUpload = readFileSync("lib/storage/client-upload.ts", "utf8");
const videoFrame = readFileSync("components/content/v2/V2FrameContent.tsx", "utf8");
const videoVisual = readFileSync("components/content/v2/V2VideoVisual.tsx", "utf8");
const deliveryRenderer = readFileSync("components/content/V2ContentDocumentRenderer.tsx", "utf8");
const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");
const studio = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");
const resourceRoute = readFileSync("app/api/admin/resources/[id]/route.ts", "utf8");
const resourceMenu = readFileSync("components/admin/resources/ResourceMoreMenu.tsx", "utf8");
const proxyRoute = readFileSync("app/api/storage/upload/proxy/route.ts", "utf8");

test("video chooser excludes images and includes typed or legacy MIME-only videos", () => {
  assert.equal(isV2VideoResource({ id: "image", title: "IMG_0029", type: "IMAGE", mimeType: "image/png" }), false);
  assert.equal(isV2VideoResource({ id: "video", title: "Lesson", type: "VIDEO", mimeType: "video/mp4" }), true);
  assert.equal(isV2VideoResource({ id: "legacy", title: "Legacy", type: null, mimeType: "video/webm" }), true);
  assert.equal(isV2VideoResource({ id: "mismatch", title: "Incorrect", type: "IMAGE", mimeType: "video/mp4" }), false);
});

test("video MIME inference allows supported blank-MIME files and rejects unsupported extensions", () => {
  assert.equal(resolveUploadContentType("lesson.mp4", "", "resource-file"), "video/mp4");
  assert.equal(resolveUploadContentType("lesson.webm", "video/webm", "resource-file"), "video/webm");
  assert.equal(resolveUploadContentType("lesson.mov", "", "resource-file"), "video/quicktime");
  assert.equal(resolveUploadContentType("lesson.exe", "", "resource-file"), null);
});

test("video upload uses the single same-origin proxy and carries the same canonical MIME through completion", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "/api/storage/upload/init") {
      return new Response(JSON.stringify({ ok: true, uploadUrl: "https://r2.example/upload", objectKey: "resources/files/publisher/lesson.mp4", requiredHeaders: { "Content-Type": "video/mp4" } }), { status: 200 });
    }
    if (url === "/api/storage/upload/complete") {
      return new Response(JSON.stringify({ ok: true, objectKey: "resources/files/publisher/lesson.mp4", contentType: "video/mp4", sizeBytes: 5 }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, objectKey: "resources/files/publisher/lesson.mp4" }), { status: 200 });
  }) as typeof fetch;
  try {
    const result = await uploadFileToR2({
      file: { name: "lesson.mp4", type: "", size: 5 } as File,
      scope: "resource-file",
      transport: "SAME_ORIGIN_PROXY",
      failurePrefix: "VIDEO",
    });
    assert.equal(result.contentType, "video/mp4");
    assert.deepEqual(requests.map((request) => request.url), ["/api/storage/upload/init", "/api/storage/upload/proxy", "/api/storage/upload/complete"]);
    assert.equal(JSON.parse(String(requests[0]!.init?.body)).contentType, "video/mp4");
    assert.equal(requests[1]!.init?.headers && (requests[1]!.init!.headers as Record<string, string>)["Content-Type"], "video/mp4");
    assert.equal(JSON.parse(String(requests[2]!.init?.body)).expectedContentType, "video/mp4");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("video upload reports the actual failed transport stage", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    if (String(input) === "/api/storage/upload/init") {
      return new Response(JSON.stringify({ ok: true, uploadUrl: "https://r2.example/upload", objectKey: "resources/files/publisher/lesson.mp4", requiredHeaders: {} }), { status: 200 });
    }
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  try {
    await assert.rejects(
      uploadFileToR2({ file: { name: "lesson.mp4", type: "video/mp4", size: 5 } as File, scope: "resource-file", transport: "SAME_ORIGIN_PROXY", failurePrefix: "VIDEO" }),
      (error: unknown) => error instanceof StorageUploadError && error.code === "VIDEO_STORAGE_TRANSFER_FAILED",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("new and legacy video Resource IDs survive V2 normalization and protected renderer resolution", () => {
  const newVideo = createV2Frame("VIDEO", "page-a", { resourceId: "resource-new" });
  const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(createV2PageLayout({ pages: [{ id: "page-a", frames: [newVideo] }] }))));
  assert.equal(reloaded?.pages[0]?.frames[0]?.resourceId, "resource-new");
  const legacy = createV2CompatibilityLayout({
    canvas: { width: 800, height: 600 },
    periods: [{ id: "period-a", title: "Period" }],
    blocks: [{ id: "media-a", type: "media", periodId: "period-a", targetType: "RESOURCE", targetId: "resource-legacy" }],
  } as never);
  assert.equal(legacy.pages[0]?.frames[0]?.resourceId, "resource-legacy");
  assert.match(videoFrame, /resourceUrlResolver\(resourceId\)/);
  assert.match(videoFrame, /V2VideoVisual/);
  assert.match(clientUpload, /transport === "SAME_ORIGIN_PROXY"/);
});

test("V2 video display mode supports Player and Button without changing its resource", () => {
  const player = createV2Frame("VIDEO", "page-a", { resourceId: "resource-video" });
  assert.equal(getV2VideoDisplayMode(player), "PLAYER");
  const button = { ...player, payload: withV2VideoDisplayMode(player, "BUTTON") };
  assert.equal(getV2VideoDisplayMode(button), "BUTTON");
  assert.equal(button.resourceId, "resource-video");
  const reloaded = normalizePageLayoutV2(JSON.parse(JSON.stringify(createV2PageLayout({ pages: [{ id: "page-a", frames: [button] }] }))));
  assert.equal(getV2VideoDisplayMode(reloaded!.pages[0]!.frames[0]!), "BUTTON");
  assert.equal(reloaded!.pages[0]!.frames[0]!.resourceId, "resource-video");
});

test("legacy V2 video defaults safely to Player and removing a frame preserves the resource", () => {
  const video = createV2Frame("VIDEO", "page-a", { id: "frame-video", resourceId: "resource-video" });
  const layout = createV2PageLayout({ pages: [{ id: "page-a", frames: [video] }] });
  assert.equal(getV2VideoDisplayMode(video), "PLAYER");
  assert.equal(deleteV2Frame(layout, "page-a", "frame-video").pages[0]!.frames.length, 0);
  assert.equal(video.resourceId, "resource-video");
});

test("shared V2 renderer supplies Player/Button parity, portal modal, and delivery control restrictions", () => {
  assert.match(videoVisual, /data-v2-video-card/);
  assert.match(videoVisual, /data-v2-video-modal/);
  assert.match(videoVisual, /createPortal/);
  assert.match(videoVisual, /event\.key === "Escape"/);
  assert.match(videoVisual, /controlsList=\{restricted \? "nodownload noremoteplayback"/);
  assert.match(videoVisual, /disablePictureInPicture=\{restricted\}/);
  assert.match(videoVisual, /disableRemotePlayback=\{restricted\}/);
  assert.match(videoVisual, /onContextMenu=\{restricted/);
  assert.match(deliveryRenderer, /videoPresentation="DELIVERY"/);
  assert.match(studio, /resourceUrls=\{Object\.fromEntries\(resourceChoices\.map/);
});

test("V2 video reuse checks duplicates before upload and offers the existing Video resource", () => {
  assert.match(workspace, /\/api\/admin\/resources\/duplicates/);
  assert.match(workspace, /This video may already exist\./);
  assert.match(workspace, /Use Existing Video/);
  assert.match(workspace, /Upload Anyway/);
  assert.match(workspace, /Delete removes this video frame only/);
  assert.match(workspace, /isV2VideoResource/);
});

test("video library deletion is separate from frame removal and blocks V2 content references", () => {
  assert.match(resourceMenu, /Delete Video from Library/);
  assert.match(resourceMenu, /\?library=video/);
  assert.match(resourceRoute, /findPublisherVideoContentReferences/);
  assert.match(resourceRoute, /Video cannot be deleted because it is currently used/);
  assert.match(resourceRoute, /Unused Video archived from the library/);
});

test("proxy reauthorizes, validates tenant keys, and writes through the existing provider", () => {
  assert.match(proxyRoute, /authorizeUpload\(scope, body\.byteLength, fileName, contentType, targetId\)/);
  assert.match(proxyRoute, /keyBelongsToTenant\(key, authorization\.tenantId, scope\)/);
  assert.match(proxyRoute, /getStorageProvider\(\)\.putObject/);
  assert.match(proxyRoute, /uploadRules\[scope\]\.maxSize/);
});
