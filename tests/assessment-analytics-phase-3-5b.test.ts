import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("teacher assessment analytics workspace exposes summary, filters, score bands, and retry control", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/analytics/page.tsx");
  for (const label of [
    "Back to Assessment",
    "Retry Analytics",
    "Published result date",
    "Score Distribution",
    "Question-wise Analytics",
    "Student Performance",
    "Support-needed List",
    "Highest-improving Students",
  ]) {
    assert.match(page, new RegExp(label));
  }
});

test("assessment analytics helper is retry-safe and audit logged", () => {
  const source = read("lib/assessment-analytics.ts");
  for (const token of [
    "processPublishedAssessmentAnalytics",
    "retryTeacherAssessmentAnalytics",
    "getTeacherAssessmentAnalyticsWorkspace",
    "classroom.assessment.analytics.view",
    "classroom.assessment.analytics.process",
    "classroom.assessment.analytics.retry",
    "classroom.assessment.analytics.failed",
    "assessmentAnalyticsError",
  ]) {
    assert.match(source, new RegExp(token.replace(/\./g, "\\."), "i"));
  }
  assert.match(source, /Published result date/);
  assert.match(source, /performanceDistribution/);
  assert.match(source, /supportNeeded/);
});

test("teacher assessment builder links to the analytics workspace and refreshes it", () => {
  const builder = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");
  assert.match(builder, /\/analytics/);

  const actions = read("app/teacher-dashboard/classes/[sectionId]/assessments/actions.ts");
  assert.match(actions, /assessments\/\$\{assessmentId\}\/analytics/);
});

test("school analytics report includes read-only assessment summary and view audit", () => {
  const reports = read("app/school-dashboard/reports/page.tsx");
  assert.match(reports, /Assessment summary/);
  assert.match(reports, /Delivery completion/);
  assert.match(reports, /Grading completion/);
  assert.match(reports, /Performance distribution/);

  const helper = read("lib/analytics-reports.ts");
  assert.match(helper, /school\.assessment\.analytics\.view/);
  assert.match(helper, /assessmentSummary/);
});

