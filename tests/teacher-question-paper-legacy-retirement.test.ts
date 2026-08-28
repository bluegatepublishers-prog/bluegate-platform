import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

test("legacy mutable Question Paper orchestrator and component are retired", () => {
  assert.equal(
    fs.existsSync(
      path.join(root, "lib/ai/orchestrator.ts"),
    ),
    false,
  );

  assert.equal(
    fs.existsSync(
      path.join(
        root,
        "components/dashboard/QuestionPaperBuilder.tsx",
      ),
    ),
    false,
  );
});

test("knowledge collector retains Student Revision support but not legacy AI knowledge paths", () => {
  const source = read(
    "lib/ai/knowledge-collector.ts",
  );

  assert.match(
    source,
    /collectApprovedStructuredChapter/,
  );

  assert.doesNotMatch(
    source,
    /collectBookKnowledge/,
  );

  assert.doesNotMatch(
    source,
    /collectStudentChapterKnowledge/,
  );
});

test("AI barrel no longer exposes legacy orchestrator", () => {
  const source = read("lib/ai/index.ts");

  assert.doesNotMatch(
    source,
    /orchestrator/,
  );

  assert.match(
    source,
    /knowledge-collector/,
  );

  assert.match(
    source,
    /runtime\/execute/,
  );
});

test("Teacher actions expose Worksheet draft builder but not legacy Question Paper draft builder", () => {
  const source = read(
    "app/teacher-dashboard/ai/actions.ts",
  );

  assert.doesNotMatch(
    source,
    /prepareQuestionPaperDraft/,
  );

  assert.doesNotMatch(
    source,
    /getBookEntitlementForAuthenticatedUser/,
  );

  assert.doesNotMatch(
    source,
    /input\.tool\s*===\s*"Question Paper Builder"/,
  );

  assert.match(
    source,
    /tool:\s*"Worksheet Builder"/,
  );

  assert.match(
    source,
    /input\.tool\s*!==\s*"Worksheet Builder"/,
  );

  assert.match(
    source,
    /tool:\s*"Question Paper Generator"/,
  );

  assert.match(
    source,
    /executeAiGeneration\(/,
  );
});

test("legacy mutable Question Paper prompt builder is removed", () => {
  const source = read(
    "lib/ai/prompt-builder.ts",
  );

  assert.doesNotMatch(
    source,
    /buildQuestionPaperPrompt/,
  );

  assert.doesNotMatch(
    source,
    /KnowledgePackage/,
  );

  assert.match(
    source,
    /buildImmutableTeacherQuestionPaperPrompt/,
  );

  assert.match(
    source,
    /IMMUTABLE_RELEASED_SMART_BOOK_GROUNDING_JSON/,
  );
});

test("active Teacher Question Paper runtime uses immutable grounding", () => {
  const source = read(
    "lib/ai/runtime/execute.ts",
  );

  assert.match(
    source,
    /retrieveTeacherQuestionPaperGrounding/,
  );

  assert.match(
    source,
    /buildImmutableTeacherQuestionPaperPrompt/,
  );

  assert.doesNotMatch(
    source,
    /collectBookKnowledge/,
  );
});

test("live Question Paper route uses the canonical wizard", () => {
  const route = read(
    "app/teacher-dashboard/ai/question-paper/page.tsx",
  );

  const wizard = read(
    "components/dashboard/question-paper-wizard/QuestionPaperWizard.tsx",
  );

  assert.match(
    route,
    /QuestionPaperWizard/,
  );

  assert.match(
    route,
    /getQuestionPaperWizardOptions/,
  );

  assert.match(
    wizard,
    /generateQuestionPaper/,
  );

  assert.doesNotMatch(
    route,
    /QuestionPaperBuilder/,
  );
});
