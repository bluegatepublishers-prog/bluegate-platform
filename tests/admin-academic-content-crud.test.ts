import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("academic content manager route exists with chapter/question/topic/exercise entry points", () => {
  const page = read("app/admin/books/[id]/content/page.tsx");
  assert.match(page, /Academic Content/);
  assert.match(page, /\/chapters/);
  assert.match(page, /\/questions/);
  assert.match(page, /\/learning-outcomes/);
  assert.match(page, /\/activities/);
});

test("book admin navigation exposes academic content area", () => {
  const layout = read("app/admin/books/[id]/layout.tsx");
  assert.match(layout, /Academic Content/);
  assert.match(layout, /\/admin\/books\/\$\{id\}\/content/);
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

test("chapter and question deletes protect linked child content", () => {
  const source = read("app/admin/books/[id]/knowledge-actions.ts");
  assert.match(source, /Remove linked questions, outcomes, and activities before deleting this chapter/);
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

