import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSmartBookReleaseManifest,
  parseSmartBookReleaseManifest,
  type SmartBookManifestBuildSource,
} from "@/lib/smart-book-release-manifest";
import type { ContentDocument } from "@/lib/content-document";

const root = new URL("..", import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, root), "utf8");

function fixture(): SmartBookManifestBuildSource {
  const document = {
    version: 4,
    canvas: { width: 1000, height: 1000 },
    blocks: [{ id: "text-1", type: "paragraph", text: "V2 fixture", spans: [{ text: "V2 fixture" }] }],
    periods: [],
  } as unknown as ContentDocument;
  return {
    publisherId: "publisher-1",
    bookId: "book-1",
    book: { title: "Fixture Book", slug: "fixture-book", subtitle: null, edition: "2026", updatedAt: new Date("2026-08-26T00:00:00.000Z") },
    document,
    hierarchy: [{ sourceId: "chapter-1", bookId: "book-1", kind: "CHAPTER", parentSourceId: null, partSourceId: null, unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Chapter A", label: "Chapter 1", number: 1, displayOrder: 0, startPage: 1, endPage: 1 }],
    pdf: { bookPdfVersionId: "pdf-1", objectKey: "books/full-books/publisher-1/pdf-1/book.pdf", pageCount: 1, activatedAt: "2026-08-26T00:00:00.000Z" },
    assets: { resources: [], media: [], activities: [], worksheets: [], assessments: [], questions: [] },
  };
}

test("Publisher Content Studio mounts the V2 workspace without the removed V1 editor", () => {
  const editor = read("components/admin/books/ContentManuscriptEditor.tsx");
  assert.match(editor, /V2DocumentWorkspace/);
  assert.doesNotMatch(editor, /import DocumentWorkspace from|import WordRibbon from|import ContentDocumentRenderer from/);
});

test("removed V1 editor files are not reachable authoring components", () => {
  for (const path of [
    "components/admin/books/editor/DocumentWorkspace.tsx",
    "components/admin/books/editor/LayoutObjectFrame.tsx",
    "components/admin/books/editor/ContinuousTextEditor.tsx",
    "components/admin/books/editor/PeriodTabs.tsx",
    "components/admin/books/editor/WordRibbon.tsx",
    "components/admin/books/editor/blocks/TextBlockEditor.tsx",
    "components/admin/books/editor/blocks/ImageBlockEditor.tsx",
    "components/admin/books/editor/blocks/TableBlockEditor.tsx",
    "components/admin/books/editor/blocks/ActivityBlockEditor.tsx",
    "components/admin/books/editor/blocks/WorksheetBlockEditor.tsx",
    "components/admin/books/editor/blocks/ExerciseBlockEditor.tsx",
    "components/admin/books/editor/blocks/MediaBlockEditor.tsx",
    "components/admin/books/editor/blocks/LinkedAssetEditor.tsx",
    "components/admin/books/editor/blocks/ListBlockEditor.tsx",
  ]) assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, path);
  assert.equal(existsSync(new URL("../components/admin/books/editor/V2DocumentWorkspace.tsx", import.meta.url)), true);
});

test("Smart Book publication prepares and persists only the current manifest format", () => {
  const release = read("lib/content-release.ts");
  assert.match(release, /prepareSmartBookReleaseManifest/);
  assert.match(release, /snapshot: snapshot as unknown as Prisma\.InputJsonValue/);
  assert.match(release, /SMART_BOOK_V1_UNSUPPORTED/);
  assert.match(release, /Republish this Smart Book to use the current release format/);
  assert.match(release, /input\.targetType === "BOOK" && preparedV2\?\.status !== "READY"/);
});

test("the manifest parser accepts V2 and rejects V1, future, and malformed snapshots", () => {
  const manifest = buildSmartBookReleaseManifest(fixture());
  assert.equal(parseSmartBookReleaseManifest(manifest).schemaVersion, 2);
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, schemaVersion: 1 }));
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, schemaVersion: 3 }));
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, contentDocument: null }));
});

test("the canonical release resolver has one scoped V2 path and no legacy mode", () => {
  const runtime = read("lib/smart-book-release-runtime.ts");
  assert.match(runtime, /currentVersionId/);
  assert.match(runtime, /parseStoredSmartBookReleaseManifest/);
  assert.match(runtime, /lifecycle: "PUBLISHED"/);
  assert.doesNotMatch(runtime, /LEGACY_V1|isLegacyBookReleaseSnapshot|mode:/);
});

test("V1 current releases use safe unavailable states for Publisher, Teacher, and Student", () => {
  assert.match(read("lib/content-release.ts"), /Republish this Smart Book to use the current release format/);
  assert.match(read("app/student-dashboard/books/[bookId]/page.tsx"), /This Smart Book is currently unavailable/);
  assert.match(read("app/teacher-dashboard/books/[bookId]/page.tsx"), /This Smart Book is currently unavailable/);
});

test("Teacher and Student delivery never falls back to mutable hierarchy or draft Book content", () => {
  const delivery = read("lib/content-delivery.ts");
  const reader = read("lib/smart-book-reader.ts");
  const teacher = read("lib/teacher-smart-book-runtime.ts");
  assert.match(delivery, /resolvePublishedSmartBookContent/);
  assert.doesNotMatch(delivery, /bookModule\.findMany|bookChapter\.findMany|normalizeContentDocument\(book\.content/);
  assert.doesNotMatch(reader, /prisma\.|BookQuestion|fullBookPdf|LEGACY_V1/);
  assert.doesNotMatch(teacher, /LEGACY_V1|normalizeContentDocument/);
});

test("Planner page discovery is manifest-only and rejects missing V2 releases", () => {
  const planner = read("lib/teaching-plan.ts");
  const loader = planner.slice(planner.indexOf("async function loadModuleDocuments"), planner.indexOf("function normalizePageTargets"));
  assert.match(loader, /resolvePublishedSmartBookContent/);
  assert.match(loader, /manifest/);
  assert.match(loader, /restrictPublishedBookDocumentToModuleRange/);
  assert.doesNotMatch(loader, /bookModule\.findMany|bookChapter\.findMany|loadPublishedContentDocument/);
});

test("the shared V2 renderer fails closed instead of interpreting a V1 document", () => {
  const renderer = read("components/content/V2ContentDocumentRenderer.tsx");
  assert.match(renderer, /getContentLayoutVersion\(document\) !== 2/);
  assert.match(renderer, /return null/);
  const entrypoint = renderer.slice(renderer.indexOf("if (getContentLayoutVersion"), renderer.indexOf("function V2DeliveryDocument"));
  assert.doesNotMatch(entrypoint, /StructuredContentRenderer/);
});

test("V2 Teach Mode and immutable practice retain their release boundary", () => {
  assert.match(read("components/teacher/TeachingPlanWorkspace.tsx"), /V2ContentDocumentRenderer/);
  assert.match(read("lib/student-practice.ts"), /release\.releaseVersionId !== input\.releaseVersionId/);
  assert.match(read("lib/content-delivery.ts"), /immutableRelease: true/);
  assert.match(read("components/content/v2/V2AssessmentLauncherVisual.tsx"), /immutableRelease/);
  assert.match(read("components/content/v2/V2WorksheetLauncherVisual.tsx"), /immutableRelease/);
});

test("runtime PDF delivery requires the immutable manifest PDF for non-admin users", () => {
  const route = read("app/api/books/[bookId]/full-pdf/route.ts");
  assert.match(route, /release\.manifest\.pdf\.bookPdfVersionId/);
  assert.match(route, /objectKey: release\.manifest\.pdf\.objectKey/);
  assert.match(route, /user\.role !== "ADMIN" \|\| requestedReleaseVersionId/);
});

test("entitlement, catalogue, and cross-publisher boundaries remain explicit", () => {
  assert.match(read("lib/content-delivery.ts"), /requireBookEntitlement/);
  assert.match(read("app/api/books/[bookId]/full-pdf/route.ts"), /getBookEntitlementForAuthenticatedUser/);
  assert.doesNotMatch(read("lib/content-release.ts"), /publicCatalogueVisible/);
  assert.match(read("tests/smart-book-runtime-delivery-phase-t8d.test.ts"), /publisherId_targetType_targetId/);
});
