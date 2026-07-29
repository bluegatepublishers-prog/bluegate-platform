import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { ResourceAudience } from "@prisma/client";

import {
  buildResourceLibraryWhere,
  isSafeExternalResourceUrl,
  normalizeResourceLibraryQuery,
} from "../lib/admin-resource-library";
import { resolveResourcePlacementAudience } from "../lib/resource-audience-ui";
import { uploadRules } from "../lib/storage/upload-policy";

test("resource library query normalization is bounded and rejects unknown filters", () => {
  const query = normalizeResourceLibraryQuery({
    query: `  ${"x".repeat(200)}  `,
    page: "-2",
    pageSize: "999",
    type: "NOT_A_TYPE",
    view: "unknown",
  });
  assert.equal(query.query?.length, 160);
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, 50);
  assert.equal(query.type, undefined);
  assert.equal(query.view, "list");
});

test("every resource library query remains publisher scoped", () => {
  const where = buildResourceLibraryWhere(
    "publisher-a",
    normalizeResourceLibraryQuery({
      query: "algebra",
      preset: "unattached",
      audience: ResourceAudience.STUDENT,
    }),
  );
  assert.equal(where.publisherId, "publisher-a");
  const serialized = JSON.stringify(where);
  assert.match(serialized, /bookResourceLinks/);
  for (const field of [
    "bookId",
    "editionId",
    "unitId",
    "chapterId",
    "moduleId",
    "topicId",
    "exerciseId",
  ]) {
    assert.match(serialized, new RegExp(field));
  }
});

test("external resources allow only HTTPS URLs", () => {
  assert.equal(isSafeExternalResourceUrl("https://example.org/file"), true);
  for (const value of [
    "http://example.org",
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///tmp/file",
    "/relative",
  ]) {
    assert.equal(isSafeExternalResourceUrl(value), false);
  }
});

test("placement audience override wins while null preserves the resource default", () => {
  assert.equal(
    resolveResourcePlacementAudience(
      ResourceAudience.TEACHER_ONLY,
      ResourceAudience.BOTH,
    ),
    ResourceAudience.BOTH,
  );
  assert.equal(
    resolveResourcePlacementAudience(ResourceAudience.STUDENT, null),
    ResourceAudience.STUDENT,
  );
});

test("resource upload policy supports audio without broadening primary image storage", () => {
  assert.ok(uploadRules["resource-file"].extensions.includes(".mp3"));
  assert.ok(uploadRules["resource-file"].contentTypes.includes("audio/mpeg"));
  assert.equal(uploadRules["resource-file"].extensions.includes(".png"), false);
});

test("resource lifecycle and responsive UI retain explicit safety controls", () => {
  const root = process.cwd();
  const detailRoute = fs.readFileSync(
    path.join(root, "app/api/admin/resources/[id]/route.ts"),
    "utf8",
  );
  const libraryView = fs.readFileSync(
    path.join(root, "components/admin/resources/ResourceLibraryView.tsx"),
    "utf8",
  );
  assert.match(detailRoute, /Permanent deletion is blocked/);
  assert.match(detailRoute, /durable object-storage cleanup/);
  assert.match(detailRoute, /bookResourceLinks: true/);
  assert.match(libraryView, /md:hidden/);
  assert.doesNotMatch(libraryView, /min-w-\[/);
});
