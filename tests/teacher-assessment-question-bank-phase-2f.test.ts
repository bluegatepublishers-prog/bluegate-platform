import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Phase 2F question bank uses the existing canonical sources and filters", () => {
  const service = read("lib/teacher-assessments.ts");
  const policy = read("lib/question-bank-discovery.ts");
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");
  const actions = read("app/teacher-dashboard/classes/[sectionId]/assessments/actions.ts");

  for (const source of ["Book Questions", "Publisher Questions", "My Questions"]) assert.match(page, new RegExp(source));
  for (const filter of ["moduleId", "exerciseId", "questionType", "difficulty", "search"]) assert.match(policy, new RegExp(filter));
  assert.match(policy, /prisma\.bookQuestion\.findMany/);
  assert.match(policy, /prisma\.teacherQuestion\.findMany/);
  assert.match(actions, /addSelectedQuestionsAction/);
  assert.match(page, /Add Selected Questions/);
  assert.match(service, /discoverQuestionBank/);
});

test("Phase 2F source eligibility retains book publication and teacher privacy boundaries", () => {
  const policy = read("lib/question-bank-discovery.ts");
  assert.match(policy, /approved: true/);
  assert.match(policy, /archived: false/);
  assert.match(policy, /publisherId: input\.context\.publisherId/);
  assert.match(policy, /teacherId: input\.context\.teacherId/);
  assert.match(policy, /schoolId: input\.context\.schoolId/);
  assert.match(policy, /sectionSubjectId: input\.context\.sectionSubjectId/);
});

test("Phase 2F hierarchy limitations are explicit and do not invent TeacherQuestion exercise metadata", () => {
  const policy = read("lib/question-bank-discovery.ts");
  const service = read("lib/teacher-assessments.ts");
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");
  assert.match(policy, /Publisher Questions are the approved BookQuestion master bank/);
  assert.match(policy, /My Questions have no exerciseId metadata/);
  assert.match(policy, /bookModule\.findMany/);
  assert.match(policy, /bookExercise\.findMany/);
  assert.doesNotMatch(policy, /TeacherQuestion[^\n]*exerciseId/);
  assert.match(service, /no separate Prisma model/);
  assert.match(page, /My Questions/);
});

test("Phase 2F selected identity and duplicate prevention reuse AssessmentQuestion", () => {
  const service = read("lib/teacher-assessments.ts");
  assert.match(service, /selectedQuestionIds\.has/);
  assert.match(service, /questionBankKey/);
  assert.match(service, /usedSnapshotKeys\.has/);
  assert.match(service, /assessmentQuestion\.create/);
  assert.match(service, /assessmentId: assessment\.id/);
  assert.match(service, /id: \{ notIn: \[\.\.\.usedAnchorIds\] \}/);
});

test("Phase 2F period context is read-only and class/subject locked by owned assessment scope", () => {
  const service = read("lib/teacher-assessments.ts");
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");
  assert.match(service, /teachingPeriod: \{ select:/);
  assert.match(page, /Period context:/);
  assert.match(service, /createdById: scope\.teacher\.userId/);
  assert.match(service, /sectionId/);
  assert.match(service, /sectionSubjectId: \{ in: scope\.sectionSubjects\.map/);
});