import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("detector is analytics-only, versioned, idempotent, and recurrence-safe", async () => {
  const source = await read("lib/gaps/detect.ts");
  for (const aggregate of ["studentAnalytics", "studentSubjectAnalytics", "studentChapterAnalytics", "studentSkillAnalytics"]) assert.match(source, new RegExp(aggregate));
  for (const raw of ["studentPracticeAttempt", "assessmentResponse", "studentAiMessage"]) assert.doesNotMatch(source, new RegExp(`prisma\\.${raw}`));
  assert.match(source, /runKey/); assert.match(source, /activeKey/); assert.match(source, /baselineSampleSize/); assert.match(source, /GapDimension\.BOOK/); assert.match(source, /GapDimension\.CHAPTER/);
});

test("role services apply tenant, year, ownership, and teacher assignment scope", async () => {
  const [student, teacher, school, publisher] = await Promise.all([read("lib/gaps/student.ts"), read("lib/gaps/teacher.ts"), read("lib/gaps/school.ts"), read("lib/gaps/publisher.ts")]);
  assert.match(student, /studentId: access\.identity\.student\.id/); assert.match(student, /academicYearId: access\.identity\.academicYear\.id/);
  assert.match(teacher, /TeacherAssignmentType\.CLASS_TEACHER/); assert.match(teacher, /TeacherAssignmentType\.SUBJECT_TEACHER/); assert.match(teacher, /schoolId: scope\.teacher\.schoolId/); assert.match(teacher, /academicYearId: row\.academicYearId/); assert.match(teacher, /status: "ACTIVE"/);
  assert.match(school, /schoolId: school\.id/); assert.match(publisher, /publisherId: publisher\.id/); assert.doesNotMatch(publisher, /student: \{ select: \{ name/);
});

test("review actions append audit events and do not mutate source evidence or marks", async () => {
  const source = await read("lib/gaps/review.ts");
  assert.match(source, /studentLearningGapReview\.create/); assert.match(source, /activeKey/); assert.doesNotMatch(source, /assessmentResponse\.(update|delete)/); assert.doesNotMatch(source, /studentLearningGapEvidence\.(update|delete)/);
});

test("successful learning flows trigger best-effort learning support only after eligible evidence becomes final", async () => {
  for (const file of ["lib/student-books.ts", "lib/student-revision.ts", "lib/student-practice.ts"]) {
    const source = await read(file);
    const transactionEnd = source.indexOf("prisma.$transaction");
    const trigger = source.lastIndexOf("refreshLearningSupportBestEffort");
    assert.ok(transactionEnd >= 0 && trigger > transactionEnd, `${file} must trigger after its transaction call`);
  }

  const studentAssessments = await read("lib/student-assessments.ts");
  assert.match(studentAssessments, /provisional:\s*true/);
  assert.match(studentAssessments, /scorePercent:\s*null/);
  assert.doesNotMatch(studentAssessments, /refreshLearningSupportBestEffort/);

  const teacherAssessments = await read("lib/teacher-assessments.ts");
  assert.match(teacherAssessments, /processPublishedAssessmentAnalytics/);
  assert.match(teacherAssessments, /refreshLearningSupportBestEffort/);

  const analytics = teacherAssessments.lastIndexOf("processPublishedAssessmentAnalytics");
  const trigger = teacherAssessments.lastIndexOf("refreshLearningSupportBestEffort");
  assert.ok(
    analytics >= 0 && trigger > analytics,
    "assessment learning support must refresh only after published assessment analytics are processed",
  );

  const orchestration = await read("lib/learning-support.ts");
  assert.match(orchestration, /recomputeStudentGapsBestEffort/);
  assert.match(orchestration, /generateRemedialsBestEffort/);
});

test("pending subjective evidence is excluded and AI text is never read", async () => {
  const [analytics, detector] = await Promise.all([read("lib/analytics.ts"), read("lib/gaps/detect.ts")]);
  assert.match(analytics, /reviewStatus: \{ not: "PENDING" \}/); assert.match(analytics, /!row\.provisional/);
  assert.doesNotMatch(detector, /studentAiMessage/); assert.doesNotMatch(detector, /questionText|answerText|conversation|prompt/i);
});

test("migration is additive and does not enable the feature for a publisher", async () => {
  const sql = await read("prisma/migrations/20260714040000_learning_gap_analysis_engine/migration.sql");
  assert.doesNotMatch(sql, /\bDROP\b/i); assert.doesNotMatch(sql, /INSERT INTO "PublisherFeature"/i); assert.match(sql, /'GAP_ANALYSIS'/); assert.match(sql, /"implemented" = true/);
});
