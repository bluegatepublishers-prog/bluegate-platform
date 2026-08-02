import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("teacher grading queue and attempt pages expose result publication controls", () => {
  const queue = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/grading/page.tsx");
  assert.match(queue, /Publish Result/);
  assert.match(queue, /Publish All Ready Results/);
  assert.match(queue, /readyToPublish/);

  const attempt = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/grading/[attemptId]/page.tsx");
  assert.match(attempt, /Publish Result/);
  assert.match(attempt, /canPublishResult/);
});

test("teacher assessment service enforces graded plus release policy before publishing", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /evaluatePublicationReadiness/);
  assert.match(source, /RELEASE_PENDING/);
  assert.match(source, /RELEASE_DISABLED/);
  assert.match(source, /publishTeacherAssessmentResult/);
  assert.match(source, /publishTeacherAssessmentResultsBulk/);
  assert.match(source, /classroom\.assessment\.results\.publish/);
});

test("student result visibility now requires teacher publication", () => {
  const source = read("lib/student-assessments.ts");
  assert.match(source, /Your result is pending teacher publication\./);
  assert.doesNotMatch(source, /assessmentResult\.update\(\{ where: \{ id: attempt\.result\.id \}, data: \{ publishedAt: new Date\(\) \} \}\)/);
});

test("parent portal assessment release derives from published result plus release policy", () => {
  const source = read("lib/parent-dashboard.ts");
  assert.match(source, /attempt\.result\?\.publishedAt/);
  assert.match(source, /canReleaseAssessmentResult\(/);
  assert.doesNotMatch(source, /resultRelease === "IMMEDIATE"/);
});
