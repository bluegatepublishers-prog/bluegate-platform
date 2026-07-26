import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(path), "utf8");

test("admin resource create validates optional normalized relations in publisher scope", () => {
  const route = source("app/api/admin/resources/route.ts");
  assert.match(route, /resolveResourceLinks\(/);
  assert.match(
    route,
    /seriesId \? prisma\.bookSeries\.findFirst\(\{ where: \{ id: seriesId, publisherId: actor\.publisherId, active: true \}/,
  );
  assert.match(
    route,
    /bookId \? prisma\.book\.findFirst\(\{ where: \{ id: bookId, publisherId: actor\.publisherId \}/,
  );
});

test("admin resource update preserves metadata-only edits without requiring file replacement", () => {
  const route = source("app/api/admin/resources/[id]/route.ts");
  assert.match(route, /const fileUrl = trimToNull\(body\.fileUrl\) \?\? existing\.fileUrl/);
  assert.match(route, /const thumbnail = hasOwn\(body, "thumbnail"\)/);
  assert.match(route, /originalFileName: originalFileNameInput \?\? existing\.originalFileName/);
  assert.match(route, /mimeType: mimeTypeInput \?\? existing\.mimeType/);
  assert.match(route, /fileSizeBytes: fileSizeInput \?\? existing\.fileSizeBytes/);
});

test("book-linked resource updates derive class and subject from the selected book", () => {
  const helper = source("lib/resource-relations.ts");
  assert.match(helper, /if \(bookRecord\) \{/);
  assert.match(helper, /classId: bookRecord\.classId/);
  assert.match(helper, /subjectId: bookRecord\.subjectId/);
  assert.match(helper, /seriesId: bookRecord\.seriesId/);
  assert.match(helper, /classLevel: bookRecord\.class\.name/);
  assert.match(helper, /subject: bookRecord\.subject\.name/);
});

test("resource create and update clean up newly uploaded replacements when writes fail", () => {
  const createRoute = source("app/api/admin/resources/route.ts");
  const updateRoute = source("app/api/admin/resources/[id]/route.ts");

  assert.match(createRoute, /fileUrl \? removeManagedResourceFile\(fileUrl\) : Promise\.resolve\(\)/);
  assert.match(createRoute, /thumbnail \? removeManagedResourceFile\(thumbnail\) : Promise\.resolve\(\)/);

  assert.match(updateRoute, /if \(newFileUploaded\) \{\s*await removeManagedResourceFile\(fileUrl\);/);
  assert.match(updateRoute, /if \(newThumbnailUploaded\) \{\s*await removeManagedResourceFile\(thumbnail\);/);
});

test("resource lifecycle avoids deleting shared old files and keeps db success independent from cleanup", () => {
  const route = source("app/api/admin/resources/[id]/route.ts");
  assert.match(route, /removeIfUnreferencedFileUrl\(resource\.id, existing\.fileUrl\)/);
  assert.match(route, /removeIfUnreferencedThumbnail\(resource\.id, existing\.thumbnail\)/);
  assert.match(route, /const count = await prisma\.resource\.count\(/);
  assert.match(route, /return NextResponse\.json\(toResourceJson\(resource\)\);/);
});

test("resource delete archives metadata and retains blob files and reference history", () => {
  const route = source("app/api/admin/resources/[id]/route.ts");
  assert.match(route, /updateMany\(\{[\s\S]*where: \{ id, publisherId: actor\.publisherId \}[\s\S]*archived: true[\s\S]*published: false/);
  const deleteHandler = route.slice(route.indexOf("export async function DELETE"));
  assert.doesNotMatch(deleteHandler, /deleteMany\(/);
  assert.doesNotMatch(deleteHandler, /removeManagedResourceFile\(/);
});

test("teacher resources support class/subject/series/book filters", () => {
  const dashboard = source("lib/teacher-dashboard.ts");
  assert.match(dashboard, /classId\?: string;/);
  assert.match(dashboard, /subjectId\?: string;/);
  assert.match(dashboard, /seriesId\?: string;/);
  assert.match(dashboard, /bookId\?: string;/);
  assert.match(dashboard, /classId: filters\.classId \|\| undefined/);
  assert.match(dashboard, /subjectId: filters\.subjectId \|\| undefined/);
  assert.match(dashboard, /seriesId: filters\.seriesId \|\| undefined/);
  assert.match(dashboard, /bookId: filters\.bookId \|\| undefined/);
});

test("bookmark writes use an idempotent composite upsert", () => {
  const mutations = source("lib/resource-mutations.ts");
  assert.match(mutations, /prisma\.bookmark\.upsert\(/);
  assert.match(mutations, /where: \{ teacherId_resourceId: \{ teacherId, resourceId \} \}/);
  assert.match(mutations, /create: \{ teacherId, resourceId \}/);
});

test("teacher-visible resources remain published-only and student-visible excludes teacher-only", () => {
  const policy = source("lib/resource-access-policy.ts");
  assert.match(policy, /return \{ publisherId, published: true, archived: false \};/);
  assert.match(policy, /audience: \{ in: \[Audience\.STUDENT, Audience\.BOTH\] \}/);
});
