import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isPublicCatalogueEligible } from "../lib/public-catalogue-policy";

const read = (path: string) => readFileSync(path, "utf8");
const bluegate = "publisher_bluegate";
const base = {
  publisherId: bluegate,
  publicCatalogueVisible: true,
  published: true,
  archived: false,
  publisherActive: true,
};

test("public catalogue eligibility requires every publication boundary", () => {
  assert.equal(isPublicCatalogueEligible(base, bluegate), true);
  for (const [key, value] of Object.entries({
    publisherId: "publisher_other",
    publicCatalogueVisible: false,
    published: false,
    archived: true,
    publisherActive: false,
  })) {
    assert.equal(
      isPublicCatalogueEligible({ ...base, [key]: value }, bluegate),
      false,
      `expected ${key} to block public catalogue visibility`,
    );
  }
});

test("public surfaces use the centralized Bluegate catalogue predicate", () => {
  const policy = read("lib/public-catalogue.ts");
  const list = read("app/books/page.tsx");
  const detail = read("app/books/[slug]/page.tsx");
  const featured = read("components/home/FeaturedBooks.tsx");

  assert.match(policy, /publicCatalogueVisible:\s*true/);
  assert.match(policy, /published:\s*true/);
  assert.match(policy, /archived:\s*false/);
  assert.match(policy, /publisherTenant:\s*\{\s*active:\s*true\s*\}/);
  assert.match(list, /getPublicCatalogueBookWhere\(\)/);
  assert.match(detail, /getPublicCatalogueBookWhere\(\{ slug \}\)/);
  assert.match(detail, /getPublicCatalogueBookWhere\(\{[\s\S]*NOT:\s*\{ id: dbBook\.id \}/);
  assert.match(featured, /getPublicCatalogueBookWhere\(\{ featured: true \}\)/);
});

test("cover and preview assets separate public eligibility from platform authorization", () => {
  const assetRoute = read("app/api/books/[bookId]/asset/[kind]/route.ts");
  const fullPdfRoute = read("app/api/books/[bookId]/full-pdf/route.ts");

  assert.match(assetRoute, /getPublicCatalogueBookWhere\(\{ id: bookId \}\)/);
  assert.match(assetRoute, /getLivePublisherAdminAccess/);
  assert.match(assetRoute, /getBookEntitlementForAuthenticatedUser/);
  assert.match(fullPdfRoute, /getBookEntitlementForAuthenticatedUser/);
  assert.doesNotMatch(fullPdfRoute, /publicCatalogueVisible/);
});

test("publisher admin catalogue control is owned and explicitly explained", () => {
  const form = read("components/admin/books/BookForm.tsx");
  const inspector = read("components/admin/books/BookInspectorEditor.tsx");
  const update = read("app/api/admin/books/[id]/route.ts");
  const create = read("app/api/admin/books/route.ts");

  assert.match(form, /Public Website Catalogue/);
  assert.match(form, /does not affect school, teacher, or student access/);
  assert.match(inspector, /publicCatalogueVisible/);
  assert.match(update, /authorizePublisherAdminApi/);
  assert.match(update, /where: \{ id, publisherId: access\.actor\.publisherId \}/);
  assert.match(update, /"publicCatalogueVisible"/);
  assert.match(create, /toBookPersistenceData\(form\)/);
});

test("catalogue publication is additive and Smart Book Publish remains independent", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260825000000_add_book_public_catalogue_visibility/migration.sql");
  const release = read("lib/content-release.ts");

  assert.match(schema, /publicCatalogueVisible\s+Boolean\s+@default\(false\)/);
  assert.match(migration, /^ALTER TABLE "Book" ADD COLUMN "publicCatalogueVisible" BOOLEAN NOT NULL DEFAULT false;\s*$/);
  assert.match(release, /updateLegacyPublishedFlag/);
  assert.doesNotMatch(release, /publicCatalogueVisible/);
});
