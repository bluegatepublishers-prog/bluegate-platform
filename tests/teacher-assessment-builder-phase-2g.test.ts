import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Phase 2G keeps one compact builder with source chips and locked context", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");

  assert.match(page, /aria-label="Question sources"/);
  assert.match(page, /Book Questions/);
  assert.match(page, /Publisher Questions/);
  assert.match(page, /My Questions/);
  assert.doesNotMatch(page, /<select name="source"/);
  assert.match(page, /aria-label="Chapter \(locked\)"/);
  assert.match(page, /Class, subject, book, and period are locked/);
  assert.match(page, /<span className="font-semibold">Selected:<\/span>/);
  assert.match(page, /<span className="font-semibold">Marks:<\/span>/);
});

test("Phase 2G hierarchy controls are conditional and the chapter scope is explicit", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");

  assert.match(page, /\{editor\.modules\.length \? \(/);
  assert.match(page, /\{editor\.exercises\.length \? \(/);
  assert.match(page, /Multi-chapter assessment scope will be added later\./);
  assert.match(page, /No questions match the current filters\./);
  assert.match(page, /<details className="mt-1 text-xs">/);
});

test("Phase 2G keeps My Questions private and explains unavailable hierarchy metadata", () => {
  const service = read("lib/teacher-assessments.ts");
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");

  assert.match(service, /teacherId: scope\.teacher\.id/);
  assert.match(service, /schoolId: scope\.schoolId/);
  assert.match(service, /Module\/Exercise filtering is not available for some My Questions\./);
  assert.match(page, /Module\/Exercise metadata may be unavailable/);
});

test("Phase 2G preserves selection reload and duplicate prevention", () => {
  const service = read("lib/teacher-assessments.ts");
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");

  assert.match(page, /question\.alreadyAdded \|\| !editor\.canEditQuestions/);
  assert.match(page, /Add Selected Questions/);
  assert.match(service, /selectedQuestionIds\.has/);
  assert.match(service, /questionBankKey/);
  assert.match(service, /usedSnapshotKeys\.has/);
  assert.match(service, /assessmentQuestion\.create/);
});

test("Phase 2G student delivery remains on the existing assessment flow", () => {
  const studentPage = read("app/student-dashboard/assessments/[assessmentId]/page.tsx");
  const service = read("lib/teacher-assessments.ts");

  assert.match(studentPage, /Submit Assessment|Submit/);
  assert.match(service, /isSubjectiveQuestionType/);
  assert.match(service, /autoGraded/);
  assert.match(service, /reviewStatus/);
});