import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("student assessments list now supports status tabs and detail navigation", () => {
  const page = read("app/student-dashboard/assessments/page.tsx");
  assert.match(page, /Available/);
  assert.match(page, /In Progress/);
  assert.match(page, /Upcoming/);
  assert.match(page, /Completed/);
  assert.match(page, /View Instructions/);
  assert.match(page, /attemptsUsed/);
});

test("assessment detail route shows instructions, start state, and attempt history", () => {
  const detail = read("app/student-dashboard/assessments/[assessmentId]/page.tsx");
  assert.match(detail, /getStudentAssessmentDetails/);
  assert.match(detail, /Instructions/);
  assert.match(detail, /Start Options/);
  assert.match(detail, /Attempt History/);
  assert.match(detail, /Resume Attempt|Start Assessment/);
});

test("assessment player includes review before submit workflow", () => {
  const player = read("components/student/StudentAssessmentPlayer.tsx");
  assert.match(player, /Review your answers/);
  assert.match(player, /Review Answers/);
  assert.match(player, /Submit Assessment/);
  assert.match(player, /setTimeout\(\(\) => void saveAnswer\(dirtyId\), 700\)/);
});

test("student assessment service logs denied access and mutation audit events", () => {
  const source = read("lib/student-assessments.ts");
  assert.match(source, /recordTrustedDeniedAudit/);
  assert.match(source, /writeSecurityAuditEvent/);
  assert.match(source, /purpose: "attempt_start"/);
  assert.match(source, /purpose: "response_save"/);
  assert.match(source, /purpose: timedOut \? "attempt_auto_submit" : "attempt_submit"/);
});
