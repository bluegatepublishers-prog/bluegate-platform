import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Content Studio route exposes hierarchy and virtual content entry points", () => {
  const page = read("app/admin/books/[id]/content/page.tsx");
  assert.match(page, /Content Studio/);
  assert.match(page, /Learning Outcomes/);
  assert.match(page, /Activities/);
  assert.match(page, /Exercises/);
  assert.match(page, /Questions/);
});

test("book catalogue exposes one Manage Content entry", () => {
  const table = read("components/admin/books/BookTable.tsx");
  assert.match(table, /Manage Content/);
  assert.match(table, /\/admin\/books\/\$\{book\.id\}\/content/);
});

test("knowledge actions validate content with zod and enforce publisher ownership", () => {
  const source = read("app/admin/books/[id]/knowledge-actions.ts");
  assert.match(source, /from "zod"/);
  assert.match(source, /chapterSchema/);
  assert.match(source, /questionSchema/);
  assert.match(source, /outcomeSchema/);
  assert.match(source, /activitySchema/);
  assert.match(source, /requireOwnedBookForAction/);
  assert.match(source, /publisherId: actor\.publisherId/);
});

test("cross-tenant denials and failures are audited", () => {
  const source = read("app/admin/books/[id]/knowledge-actions.ts");
  assert.match(source, /recordTrustedDeniedAudit/);
  assert.match(source, /reasonCode: "CROSS_TENANT_SCOPE"/);
  assert.match(source, /recordTrustedFailureAudit/);
  assert.match(source, /publisher\.book\.update/);
  assert.match(source, /publisher\.book\.delete/);
});

test("chapter archival retains linked child content and question deletion protects usage history", () => {
  const source = read("app/admin/books/[id]/knowledge-actions.ts");
  assert.match(source, /bookChapter\.update\(/);
  assert.match(source, /archived: true, archivedAt: new Date\(\), published: false/);
  assert.doesNotMatch(source, /bookChapter\.delete/);
  assert.match(source, /practiceResponses/);
  assert.match(source, /assessmentQuestions/);
  assert.match(source, /This question is already used\./);
});

test("content ordering actions exist for chapters and topics", () => {
  const source = read("app/admin/books/[id]/knowledge-actions.ts");
  const outcomesPage = read("app/admin/books/[id]/learning-outcomes/page.tsx");
  assert.match(source, /export async function moveChapter/);
  assert.match(source, /export async function moveOutcome/);
  assert.match(outcomesPage, /moveOutcome/);
  assert.match(outcomesPage, /label="↑"/);
  assert.match(outcomesPage, /label="↓"/);
});

test("publication toggles remain available where supported", () => {
  const forms = read("components/admin/BookKnowledgeForm.tsx");
  const source = read("app/admin/books/[id]/knowledge-actions.ts");
  assert.match(forms, /name="approved"/);
  assert.match(source, /approved: formData\.get\("approved"\) === "on"/);
});

