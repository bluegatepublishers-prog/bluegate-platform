import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import type { ContentDocument } from "@/lib/content-document";
import {
  buildSmartBookReleaseManifest,
  createSmartBookStorageReference,
  parseSmartBookReleaseManifest,
  type SmartBookManifestBuildSource,
} from "@/lib/smart-book-release-manifest";
import {
  resolveManifestActivities,
  resolveManifestMedia,
  resolveManifestResourceUrls,
  resolveManifestWorksheets,
} from "@/lib/smart-book-release-projection";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative: string) => readFileSync(root + "/" + relative, "utf8");

function fixture(): SmartBookManifestBuildSource {
  const document = {
    version: 4,
    canvas: { width: 1000, height: 1000 },
    blocks: [{ id: "media", type: "media", mediaKind: "video", targetType: "RESOURCE", targetId: "video-1", label: "Video", posterResourceId: "poster-1", displayMode: "inline", autoplay: false, controls: true, required: false, audience: ["STUDENT", "TEACHER"] }],
    periods: [],
    layoutVersion: 2,
    pageLayout: { pages: [{ id: "page", order: 0, background: { resourceId: "audio-1" }, frames: [] }] },
  } as unknown as ContentDocument;
  const resource = (sourceId: string, type: string, audience = "BOTH") => ({ sourceId, title: sourceId, description: null, type, audience, mimeType: "application/octet-stream", published: true, storage: { kind: "OBJECT_KEY" as const, value: `resources/files/publisher-1/${sourceId}/asset.bin` } });
  return {
    publisherId: "publisher-1",
    bookId: "book-1",
    book: { title: "Released Book", slug: "released-book", subtitle: null, edition: null, updatedAt: new Date("2026-08-26T00:00:00.000Z") },
    document,
    hierarchy: [{ sourceId: "part-1", bookId: "book-1", kind: "PART", parentSourceId: null, partSourceId: "part-1", unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Part", label: null, number: null, displayOrder: 0, startPage: 1, endPage: 10 }],
    pdf: { bookPdfVersionId: "pdf-1", objectKey: "books/full-books/publisher-1/pdf-1/book.pdf", pageCount: 10, activatedAt: null },
    assets: {
      resources: [resource("video-1", "VIDEO"), resource("poster-1", "IMAGE"), resource("audio-1", "AUDIO")],
      media: [{ sourceId: "video-1", targetType: "RESOURCE", title: "Video", label: "Video", caption: null, displayMode: "inline", posterResourceId: "poster-1", provider: null, mediaType: "VIDEO", immutableReference: { kind: "OBJECT_KEY", value: "resources/files/publisher-1/video-1/asset.bin" } }],
      activities: [{ sourceId: "activity-1", title: "Activity", activityType: "GROUP", shortDescription: null, objective: "Observe", materials: null, durationMinutes: null, groupType: null, preparation: null, instructions: "Do", steps: [], observationPrompts: [], reflectionPrompts: [], expectedLearning: null, assessment: null, safetyNotes: null, studentInstructions: "Try", attachmentResourceIds: ["audio-1"], imageResourceId: null, videoResourceId: "video-1", diagramResourceId: null, audience: "BOTH", difficulty: null }],
      worksheets: [{ sourceId: "worksheet-1", title: "Worksheet", type: "PRACTICE", instructions: null, estimatedMinutes: null, difficulty: null, audience: "BOTH", totalMarks: null, allowOnlineAttempt: true, allowPrint: true, runtimeExerciseId: null, questionIds: [], printableResourceId: "audio-1", supportingResourceIds: [] }],
      assessments: [],
      questions: [],
    },
  };
}

test("managed Edora references are explicit and publisher-scoped", () => {
  assert.deepEqual(createSmartBookStorageReference("resources/files/publisher-1/a/file.mp4", "publisher-1", "resource-file").kind, "OBJECT_KEY");
  assert.throws(() => createSmartBookStorageReference("resources/files/other-publisher/a/file.mp4", "publisher-1", "resource-file"));
});

test("external video is an explicit reference and unsafe URLs are rejected", () => {
  const reference = createSmartBookStorageReference("https://video.example/watch/1", "publisher-1", "resource-file");
  assert.equal(reference.kind, "EXTERNAL_REFERENCE");
  const manifest = buildSmartBookReleaseManifest(fixture());
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, assets: { ...manifest.assets, media: [{ ...manifest.assets.media[0]!, immutableReference: { kind: "EXTERNAL_REFERENCE", value: "javascript:alert(1)" } }] } }));
});

test("resource, activity, worksheet, audio, and uploaded-video routes are release-bound", () => {
  const manifest = buildSmartBookReleaseManifest(fixture());
  const release = "release-version-1";
  const urls = resolveManifestResourceUrls(manifest, manifest.contentDocument, "STUDENT", release);
  assert.match(urls["audio-1"]!, /release-version-1\/assets\/audio-1/);
  assert.match(resolveManifestActivities(manifest, "STUDENT", release)["activity-1"]!.attachments[0]!.route.href, /release-version-1\/assets\/audio-1/);
  assert.match(resolveManifestWorksheets(manifest, "STUDENT", release)["worksheet-1"]!.printableResource!.route.href, /release-version-1\/assets\/audio-1/);
  assert.match(resolveManifestMedia(manifest, manifest.contentDocument, "STUDENT", release)["media"]!.route!.href, /release-version-1\/assets\/video-1/);
});

test("poster association is preserved and teacher-only posters stay out of Student projection", () => {
  const manifest = buildSmartBookReleaseManifest(fixture());
  const media = resolveManifestMedia(manifest, manifest.contentDocument, "STUDENT", "release-version-1")["media"]!;
  assert.match(media.posterRoute!.href, /release-version-1\/assets\/poster-1/);
  const teacherOnly = { ...manifest, assets: { ...manifest.assets, resources: manifest.assets.resources.map((resource) => resource.sourceId === "poster-1" ? { ...resource, audience: "TEACHER_ONLY" } : resource) } };
  assert.equal(resolveManifestMedia(teacherOnly, teacherOnly.contentDocument, "STUDENT", "release-version-1")["media"]!.posterRoute, null);
});

test("release asset delivery never rediscoveries bytes from mutable Resource fields", () => {
  const delivery = read("lib/smart-book-release-asset-delivery.ts");
  const route = read("app/api/smart-book/releases/[releaseVersionId]/assets/[resourceId]/route.ts");
  assert.match(delivery, /manifest\.assets\.resources/);
  assert.doesNotMatch(delivery, /resource\.fileUrl|prisma\.resource/);
  assert.match(route, /resolveSmartBookReleaseAsset/);
  assert.doesNotMatch(route, /resource\.fileUrl|Resource\.find/);
});

test("Student and Teacher release delivery retain live entitlement boundaries", () => {
  const delivery = read("lib/smart-book-release-asset-delivery.ts");
  assert.match(delivery, /loadStudentIdentity/);
  assert.match(delivery, /getBookEntitlementForAuthenticatedUser/);
  assert.match(delivery, /identity\.value\.publisher\.id !== publisherId/);
  assert.match(delivery, /user\.role !== input\.mode/);
  assert.match(delivery, /TEACHER_ONLY/);
});

test("protected answer keys are never part of the safe asset route", () => {
  const projection = read("lib/smart-book-release-projection.ts");
  const manifest = read("lib/smart-book-release-manifest.ts");
  assert.match(projection, /answerKeyResource: null/);
  assert.match(manifest, /Protected answer-key asset leaked into the safe manifest/);
  assert.doesNotMatch(projection, /answerKeyStorage/);
});

test("write-once upload binding requires a fresh signed key and rejects an existing key", () => {
  const service = read("lib/storage/upload-service.ts");
  const proxy = read("app/api/storage/upload/proxy/route.ts");
  assert.match(service, /createUploadIntent/);
  assert.match(service, /headObject\(\{ key: candidate \}\)/);
  assert.match(proxy, /isUploadIntentValid/);
  assert.match(proxy, /UPLOAD_KEY_ALREADY_EXISTS/);
});

test("retention uses exact parsed references and a bounded historical scan", () => {
  const retention = read("lib/release-asset-retention.ts");
  assert.match(retention, /MAX_RELEASE_VERSIONS_TO_SCAN/);
  assert.match(retention, /parseStoredSmartBookReleaseManifest/);
  assert.match(retention, /references\.has\(candidate\)/);
  assert.doesNotMatch(retention, /snapshot\.includes/);
  assert.match(retention, /lifecycle: \{ in: \["PUBLISHED", "ARCHIVED"\] \}/);
});

test("publication readiness checks managed objects before the publication transaction", () => {
  const readiness = read("lib/smart-book-release-readiness.ts");
  const release = read("lib/content-release.ts");
  assert.match(readiness, /getStorageProvider/);
  assert.match(readiness, /provider\.headObject/);
  assert.match(readiness, /Promise\.all/);
  assert.match(release, /prepareSmartBookReleaseManifest/);
  assert.doesNotMatch(readiness, /\$transaction/);
});

test("historical PDF behavior remains on BookPdfVersion and V2 has no V1 fallback", () => {
  const pdf = read("app/api/books/[bookId]/full-pdf/route.ts");
  const runtime = read("lib/smart-book-release-runtime.ts");
  assert.match(pdf, /release\.manifest\.pdf\.bookPdfVersionId/);
  assert.match(pdf, /release\.manifest\.pdf\.objectKey/);
  assert.doesNotMatch(runtime, /LEGACY_V1|isLegacyBookReleaseSnapshot/);
});

test("Book and Resource replacement cleanup passes release retention context", () => {
  const books = read("lib/book-files.ts");
  const resources = read("lib/resource-files.ts");
  assert.match(books, /isObjectKeyProtectedByRelease/);
  assert.match(books, /deleteStoredObject/);
  assert.match(resources, /isObjectKeyProtectedByRelease/);
});
