import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Book Questions carries explicit Exercise IDs through service, API, and authoring UI", () => {
  const service = read("lib/book-questions.ts");
  const route = read("app/api/admin/book-questions/route.ts");
  const authoring = read("components/admin/books/editor/V2BookQuestionsAuthoring.tsx");
  assert.match(service, /exerciseId\?: string \| null/);
  assert.match(service, /input\.exerciseId/);
  assert.match(route, /exerciseId/);
  assert.match(authoring, /exerciseId\?: string \| null/);
  assert.match(authoring, /exerciseId \?/);
  assert.doesNotMatch(service, /title.*Exercise/);
});

test("Content Studio renders real Exercise selection without title-based hierarchy logic", () => {
  const page = read("app/admin/books/[id]/content/page.tsx");
  const tree = read("lib/content-studio-tree.ts");
  assert.match(page, /selected\.type === "EXERCISE"/);
  assert.match(page, /bookExercise\.findFirst/);
  assert.match(tree, /type: "EXERCISE"/);
  assert.doesNotMatch(tree, /title.*===.*Exercise/);
});
