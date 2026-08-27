import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { classifySmartBookReadinessError } from "@/lib/smart-book-release-readiness";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative: string) => readFileSync(root + "/" + relative, "utf8");

test("readiness maps stale dependency failures to safe Publisher-facing issues", () => {
  const issue = classifySmartBookReadinessError(
    new Error("Referenced question dependency is unavailable: secret-question-id"),
  );

  assert.equal(issue.code, "STALE_QUESTION_REFERENCE");
  assert.doesNotMatch(issue.message, /secret-question-id/);
  assert.match(issue.message, /no longer available/i);
});

test("readiness blocks missing or mismatched immutable PDF state", () => {
  assert.equal(
    classifySmartBookReadinessError(
      new Error("An immutable PDF version matching the current Book PDF is required"),
    ).code,
    "IMMUTABLE_PDF_VERSION_MISSING",
  );
  assert.equal(
    classifySmartBookReadinessError(
      new Error("The current Book PDF page count does not match its immutable PDF version."),
    ).code,
    "PDF_PAGE_COUNT_MISMATCH",
  );
});

test("readiness distinguishes hierarchy and cross-tenant dependency failures", () => {
  assert.equal(
    classifySmartBookReadinessError(new Error("Hierarchy node belongs to another Book.")).code,
    "CROSS_BOOK_DEPENDENCY",
  );
  assert.equal(
    classifySmartBookReadinessError(new Error("Referenced content is outside this Publisher.")).code,
    "CROSS_PUBLISHER_DEPENDENCY",
  );
  assert.equal(
    classifySmartBookReadinessError(new Error("Invalid parent type for hierarchy node.")).code,
    "INVALID_HIERARCHY",
  );
});

test("readiness is read-only, uses the T8B builder, and does not publish or mutate delivery", () => {
  const source = read("lib/smart-book-release-readiness.ts");

  assert.match(source, /buildSmartBookReleaseManifestFromDatabase/);
  assert.match(source, /normalizeContentDocument/);
  assert.match(source, /status: "READY"/);
  assert.match(source, /status: "BLOCKED"/);
  assert.doesNotMatch(source, /\.(create|update|updateMany|delete)\(/);
  assert.doesNotMatch(source, /contentReleaseVersion|student|teacher/i);
});