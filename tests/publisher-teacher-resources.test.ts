import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (...parts: string[]) => readFileSync(path.join(process.cwd(), ...parts), "utf8").replace(/\r/g, "");
const schema = read("prisma/schema.prisma");
const overview = read("app/admin/books/[id]/content/page.tsx");
const tree = read("lib/content-studio-tree.ts");
const storagePolicy = read("lib/storage/upload-policy.ts");
const storageService = read("lib/storage/upload-service.ts");
const service = read("lib/publisher-teacher-resources.ts");
const manager = read("components/admin/books/TeacherResourcesManager.tsx");
const preview = read("app/api/admin/teacher-resources/[resourceId]/preview/route.ts");
const download = read("app/api/admin/teacher-resources/[resourceId]/download/route.ts");

test("Teacher Resources are standalone book-owned folders and PDFs, not hierarchy nodes", () => {
  assert.match(schema, /model PublisherTeacherResourceFolder/u);
  assert.match(schema, /model PublisherTeacherResource \{/u);
  assert.match(schema, /publisherId\s+String/u);
  assert.match(schema, /bookId\s+String/u);
  assert.match(schema, /parentFolderId\s+String\?/u);
  assert.match(overview, /Manage Teacher Resources/u);
  assert.doesNotMatch(tree, /TEACHER_RESOURCE/u);
});

test("Teacher Resource uploads use the existing book-owned PDF-only storage scope", () => {
  assert.match(storagePolicy, /"teacher-resource-pdf"/u);
  assert.match(storagePolicy, /teacher-resources\/pdfs/u);
  assert.match(storageService, /scope === "teacher-resource-pdf"/u);
  assert.match(storageService, /verifyTargetOwnership/u);
  assert.match(manager, /transport: "SAME_ORIGIN_PROXY"/u);
  assert.match(manager, /multiple/u);
  assert.match(manager, /onDrop/u);
});

test("folder and resource service guards ownership, validates PDFs, and preserves teacher-only eligibility", () => {
  assert.match(service, /requireOwnedFolder/u);
  assert.match(service, /publisherId: input\.publisherId/u);
  assert.match(service, /bookId: input\.bookId/u);
  assert.match(service, /"%PDF-"/u);
  assert.match(service, /Teacher Resources accept PDF files only/u);
  assert.match(service, /published: true, archivedAt: null/u);
  assert.match(service, /defaultTeacherResourceTitle/u);
});

test("publisher preview and download remain protected and do not expose object keys", () => {
  for (const route of [preview, download]) {
    assert.match(route, /authorizePublisherAdminApi/u);
    assert.match(route, /publisherId: actor\.publisherId/u);
    assert.match(route, /book: \{ publisherId: actor\.publisherId \}/u);
    assert.match(route, /normalizeAndValidateObjectKey/u);
    assert.doesNotMatch(route, /NextResponse\.redirect/u);
  }
  assert.match(preview, /disposition: "inline"/u);
  assert.match(download, /disposition: "attachment"/u);
});
