import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const studio = readFileSync(
  path.join(process.cwd(), "components/admin/books/PublisherAssessmentStudio.tsx"),
  "utf8",
).replace(/\r/g, "");

test("assessment studio guides setup before question selection", () => {
  assert.match(studio, /1\. Assessment Setup/u);
  assert.match(studio, /2\. Questions/u);
  assert.match(studio, /Save the assessment setup to start adding questions\./u);
  assert.match(studio, /Save & Continue/u);
  assert.match(studio, /Question Builder/u);
  assert.match(studio, /Available Questions/u);
});

test("assessment studio gives authors concise publishing and instruction feedback", () => {
  assert.match(studio, /Publish Assessment/u);
  assert.match(studio, /It is now available in Content Studio/u);
  assert.match(studio, /General Instructions/u);
  assert.match(studio, /min-h-36/u);
  assert.match(studio, /Instruction for this section \(optional\)/u);
  assert.match(studio, /selectedQuestionGroups/u);
});
