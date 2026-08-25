import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("home featured books query is publisher-scoped and deterministically ordered", () => {
  const source = read("components/home/FeaturedBooks.tsx");
  assert.match(source, /getPublicCatalogueBookWhere\(\{ featured: true \}\)/);
  assert.match(source, /featuredOrder:\s*"asc"/);
  assert.match(source, /updatedAt:\s*"desc"/);
  assert.match(source, /id:\s*"asc"/);
  assert.match(source, /take:\s*4/);
});

test("featured books still use the same-origin cover resolver", () => {
  const source = read("components/home/FeaturedBooks.tsx");
  assert.match(source, /bookCoverPath/);
  assert.match(source, /resolveCoverSrc/);
  assert.match(source, /\/images\/book-placeholder\.jpg/);
});

test("admin book form and persistence include featured order", () => {
  const formData = read("lib/book-form-data.ts");
  const form = read("components/admin/books/BookForm.tsx");
  const apiCreate = read("app/api/admin/books/route.ts");
  const apiUpdate = read("app/api/admin/books/[id]/route.ts");

  assert.match(formData, /featuredOrder/);
  assert.match(formData, /featuredOrder:\s*featuredOrderNumber\(input\.featuredOrder\)/);
  assert.match(formData, /featuredOrder:\s*data\.featuredOrder === "" \? 0 : data\.featuredOrder/);
  assert.match(form, /Featured display order/);
  assert.match(form, /onChange\(\s*"featuredOrder"/);
  assert.match(apiCreate, /toBookPersistenceData\(form\)/);
  assert.match(apiUpdate, /toBookPersistenceData\(form\)/);
});

