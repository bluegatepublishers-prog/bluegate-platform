import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("grading queue route includes required cards, filters, search, and pagination controls", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/grading/page.tsx");
  for (const label of [
    "Total Students",
    "Not Started",
    "In Progress",
    "Submitted",
    "Needs Grading",
    "Graded",
    "Results Published",
  ]) {
    assert.match(page, new RegExp(label));
  }
  for (const filter of ["ALL", "NEEDS_GRADING", "SUBMITTED", "GRADED", "RESULT_PUBLISHED", "NOT_SUBMITTED"]) {
    assert.match(page, new RegExp(filter));
  }
  assert.match(page, /student name or roll number/i);
  assert.match(page, /Open Grading/);
  assert.match(page, /Page \{data\.pagination\.page\} of \{data\.pagination\.totalPages\}/);
});

test("grading attempt route includes question navigator, summary, draft, complete, and reopen controls", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/grading/[attemptId]/page.tsx");
  assert.match(page, /Question Navigator/);
  assert.match(page, /Objective question is auto-graded\. Manual override is disabled in this phase\./);
  assert.match(page, /Marks Awarded/);
  assert.match(page, /Feedback/);
  assert.match(page, /Save Draft/);
  assert.match(page, /Save & Next/);
  assert.match(page, /Complete Grading/);
  assert.match(page, /Reopen Reason/);
});

test("teacher assessment editor exposes grading workspace entry", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");
  assert.match(page, /\/grading\?subject=/);
  assert.match(page, /Grading/);
});

test("grading service enforces teacher-owned assessment scope and grading state protections", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /loadOwnedAssessment\(input\.sectionId, input\.assessmentId\)/);
  assert.match(source, /assessment\.status === AssessmentStatus\.DRAFT/);
  assert.match(source, /assessment\.status === AssessmentStatus\.ARCHIVED/);
  assert.match(source, /attempt\.status === AssessmentAttemptStatus\.IN_PROGRESS/);
  assert.match(source, /attempt\.status === AssessmentAttemptStatus\.ABANDONED/);
});

test("objective grading remains server-derived and override is blocked", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /if \(response\.autoGraded\)/);
  assert.match(source, /Objective responses are auto-graded and cannot be overridden in this phase\./);
  assert.match(source, /computeAttemptMarks/);
});

test("subjective manual grading validates numeric bounds and persists review fields", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /Marks must be numeric\./);
  assert.match(source, /Marks cannot be negative\./);
  assert.match(source, /Marks cannot exceed question maximum\./);
  assert.match(source, /reviewStatus: AssessmentReviewStatus\.REVIEWED/);
  assert.match(source, /reviewedById: scope\.teacher\.userId/);
  assert.match(source, /feedback: String\(input\.feedback/);
});

test("draft grading keeps attempt in review flow and recomputes centralized result summary", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /AssessmentAttemptStatus\.PENDING_REVIEW/);
  assert.match(source, /recomputeAssessmentAttemptResult/);
  assert.match(source, /calculateAssessmentSummary/);
});

test("complete grading requires reviewed subjective responses and sets graded status", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /Complete all subjective reviews before finishing grading\./);
  assert.match(source, /Every reviewed subjective response needs awarded marks\./);
  assert.match(source, /A subjective score is outside valid mark limits\./);
  assert.match(source, /assessmentAttempt\.update\(\{ where: \{ id: attempt\.id \}, data: \{ status: AssessmentAttemptStatus\.GRADED \} \}\)/);
});

test("reopen grading requires reason, blocks published result edits, and resets manual review", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /A reopen reason is required\./);
  assert.match(source, /Published results cannot be reopened in this phase\./);
  assert.match(source, /reviewStatus: AssessmentReviewStatus\.PENDING/);
  assert.match(source, /marksAwarded: null/);
});

test("grading actions are wired through server actions and route revalidation", () => {
  const actions = read("app/teacher-dashboard/classes/[sectionId]/assessments/actions.ts");
  assert.match(actions, /saveAssessmentGradingDraftAction/);
  assert.match(actions, /completeAssessmentGradingAction/);
  assert.match(actions, /reopenAssessmentGradingAction/);
  assert.match(actions, /assessments\/\$\{assessmentId\}\/grading/);
});

test("grading audit action types and target types are allow-listed", () => {
  const policy = read("lib/security-audit-policy.ts");
  for (const action of [
    "classroom.assessment.grading.view",
    "classroom.assessment.grading.save",
    "classroom.assessment.grading.complete",
    "classroom.assessment.grading.reopen",
  ]) {
    assert.match(policy, new RegExp(action.replace(/\./g, "\\.")));
  }
  assert.match(policy, /\| "AssessmentAttempt"/);
  assert.match(policy, /\| "AssessmentResponse"/);
});

test("grading queue derives assessment-level completion statuses from attempts", () => {
  const source = read("lib/teacher-assessments.ts");
  for (const status of [
    "NO_SUBMISSIONS",
    "GRADING_NOT_STARTED",
    "GRADING_IN_PROGRESS",
    "NEEDS_GRADING",
    "FULLY_GRADED",
    "RESULTS_PARTIALLY_PUBLISHED",
    "RESULTS_PUBLISHED",
  ]) {
    assert.match(source, new RegExp(status));
  }
});
