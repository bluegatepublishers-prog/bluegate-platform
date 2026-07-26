import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { assignmentDisplayStatus, assignmentWindow, isAssignmentVisible } from "../lib/assignments/timing";
import { assignmentInputSchema } from "../lib/assignments/validation";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260726135438_classroom_assignments/migration.sql");
const teacherAccess = read("lib/assignments/access.ts");
const assignmentService = read("lib/assignments/assignment-service.ts");
const submissionService = read("lib/assignments/submission-service.ts");
const queries = read("lib/assignments/queries.ts");
const upload = read("lib/storage/upload-service.ts");
const audit = read("lib/security-audit-policy.ts");

const timing = (overrides: Partial<Parameters<typeof assignmentWindow>[0]> = {}) => ({
  status: "PUBLISHED" as const,
  publishAt: null,
  dueAt: null,
  closeAt: null,
  allowLateSubmission: false,
  archivedAt: null,
  ...overrides,
});

test("one canonical classroom assignment domain is distinct from authority and formal assessments", () => {
  assert.match(schema, /model ClassroomAssignment \{/);
  assert.equal((schema.match(/model ClassroomAssignment \{/g) ?? []).length, 1);
  assert.match(schema, /model TeacherAssignment \{/);
  assert.match(schema, /model Assessment \{/);
  assert.doesNotMatch(schema, /model Assignment \{/);
});

test("assignment ownership and submission tenant fields are mandatory", () => {
  const assignment = schema.slice(schema.indexOf("model ClassroomAssignment {"), schema.indexOf("model AssignmentAttachment {"));
  for (const field of ["publisherId", "schoolId", "academicYearId", "schoolClassId", "sectionId", "teacherId"]) {
    assert.match(assignment, new RegExp(`\\b${field}\\s+String\\b`));
  }
  const submission = schema.slice(schema.indexOf("model AssignmentSubmission {"), schema.indexOf("model SubmissionAttachment {"));
  for (const field of ["assignmentId", "studentId", "publisherId", "schoolId", "academicYearId", "sectionId"]) {
    assert.match(submission, new RegExp(`\\b${field}\\s+String\\b`));
  }
});

test("migration is additive, restrictive, indexed, and does not enable publishers", () => {
  assert.match(migration, /CREATE TABLE "ClassroomAssignment"/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /ClassroomAssignment_sectionId_status_idx/);
  assert.match(migration, /AssignmentSubmission_assignmentId_studentId_attemptNumber_key/);
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
  assert.match(migration, /UPDATE "FeatureDefinition"[\s\S]*"key" = 'ASSIGNMENTS'/);
  assert.doesNotMatch(migration, /UPDATE "PublisherFeature"|INSERT INTO "PublisherFeature"/);
});

test("teacher access starts from live classroom authority and the assignments feature", () => {
  assert.match(teacherAccess, /requireTeacherClass\(sectionId\)/);
  assert.match(teacherAccess, /PlatformFeatureKey\.ASSIGNMENTS/);
  assert.match(teacherAccess, /teacherId: scope\.teacher\.id/);
  assert.match(teacherAccess, /publisherId: scope\.publisherId/);
  assert.match(teacherAccess, /academicYearId: scope\.academicYear\.id/);
});

test("student access derives live identity, current enrollment, and exact assignment scope", () => {
  assert.match(teacherAccess, /loadStudentIdentity/);
  assert.match(teacherAccess, /schoolClassId: identity\.enrollment\.schoolClassId/);
  assert.match(teacherAccess, /sectionId: identity\.enrollment\.sectionId/);
  assert.match(teacherAccess, /archivedAt: null/);
  assert.doesNotMatch(teacherAccess, /studentId:\s*assignmentId/);
});

test("draft, future scheduled, published, closed, and archived visibility is deterministic", () => {
  const now = new Date("2026-07-26T12:00:00.000Z");
  assert.equal(isAssignmentVisible(timing({ status: "DRAFT" }), now), false);
  assert.equal(isAssignmentVisible(timing({ status: "SCHEDULED", publishAt: new Date("2026-07-26T13:00:00.000Z") }), now), false);
  assert.equal(isAssignmentVisible(timing({ status: "SCHEDULED", publishAt: new Date("2026-07-26T11:00:00.000Z") }), now), true);
  assert.equal(isAssignmentVisible(timing({ status: "PUBLISHED" }), now), true);
  assert.equal(isAssignmentVisible(timing({ status: "CLOSED" }), now), true);
  assert.equal(isAssignmentVisible(timing({ status: "ARCHIVED", archivedAt: now }), now), false);
});

test("server time enforces due, late, and close rules", () => {
  const now = new Date("2026-07-26T12:00:00.000Z");
  assert.deepEqual(assignmentWindow(timing({ dueAt: new Date("2026-07-26T11:00:00.000Z") }), now), {
    visible: true, closed: false, late: true, acceptsSubmission: false,
  });
  assert.equal(assignmentWindow(timing({ dueAt: new Date("2026-07-26T11:00:00.000Z"), allowLateSubmission: true }), now).acceptsSubmission, true);
  assert.equal(assignmentWindow(timing({ closeAt: new Date("2026-07-26T12:00:00.000Z") }), now).acceptsSubmission, false);
  assert.equal(assignmentDisplayStatus(timing({ dueAt: new Date("2026-07-27T12:00:00.000Z") }), now), "DUE");
});

test("assignment validation requires one response method and coherent dates", () => {
  const base = {
    title: "Homework",
    instructions: "",
    assignmentType: "HOMEWORK",
    intent: "DRAFT",
    sectionSubjectId: "section-subject-science",
    bookId: "",
    chapterId: "",
    totalMarks: "",
    allowTextSubmission: false,
    allowFileSubmission: false,
    allowMultipleFiles: false,
    maximumFiles: 1,
    maximumFileSizeMb: 10,
    acceptedFileTypes: [],
    allowLateSubmission: false,
    allowResubmission: false,
    maximumAttempts: 1,
    publishAt: "",
    dueAt: "",
    closeAt: "",
  };
  assert.equal(assignmentInputSchema.safeParse(base).success, false);
  assert.equal(assignmentInputSchema.safeParse({ ...base, allowTextSubmission: true }).success, true);
  assert.equal(assignmentInputSchema.safeParse({ ...base, allowTextSubmission: true, sectionSubjectId: "" }).success, false);
  assert.equal(assignmentInputSchema.safeParse({ ...base, allowTextSubmission: true, intent: "SCHEDULED" }).success, false);
});

test("ordinary assignment deletion is unavailable and archive is audited", () => {
  assert.doesNotMatch(assignmentService, /classroomAssignment\.delete/);
  assert.match(assignmentService, /ClassroomAssignmentStatus\.ARCHIVED/);
  assert.match(assignmentService, /classroom\.assignment\.archive/);
});

test("submissions derive ownership, attempts, lateness, and final status on the server", () => {
  assert.match(submissionService, /studentId: scope\.identity\.student\.id/);
  assert.match(submissionService, /attemptNumber \+= 1/);
  assert.match(submissionService, /isLate: window\.late/);
  assert.match(submissionService, /status = latest\.attemptNumber > 1 \? "RESUBMITTED"/);
  assert.doesNotMatch(submissionService, /form.*studentId|input.*marksAwarded.*student/i);
});

test("final submissions cannot be overwritten and returned work preserves attempt history", () => {
  assert.match(submissionService, /\["SUBMITTED", "RESUBMITTED", "GRADED"\]\.includes/);
  assert.match(submissionService, /latest\?\.status === "RETURNED"/);
  assert.match(schema, /@@unique\(\[assignmentId, studentId, attemptNumber\]\)/);
  assert.doesNotMatch(submissionService, /assignmentSubmission\.delete/);
});

test("grading is teacher-derived, bounded, transactional, and separate from analytics", () => {
  assert.match(submissionService, /marksAwarded > assignment\.totalMarks/);
  assert.match(submissionService, /gradedByTeacherId: scope\.teacher\.id/);
  assert.match(submissionService, /prisma\.\$transaction/);
  assert.match(submissionService, /classroom\.submission\.grade/);
  assert.doesNotMatch(submissionService, /learningGap|assessmentResult|studentAnalytics/i);
});

test("teacher analytics counts eligible enrollment and latest student attempts only", () => {
  assert.match(queries, /status: "ACTIVE"/);
  assert.match(queries, /latestByStudent/);
  assert.match(queries, /completionPercentage/);
  assert.match(queries, /averageMarks/);
});

test("student queries never include another student's submissions", () => {
  assert.match(queries, /where: \{ studentId: identity\.student\.id \}/);
  assert.doesNotMatch(queries, /include:\s*\{\s*submissions:\s*true/);
});

test("assignment uploads bind uploader, assignment target, tenant, feature, and live role", () => {
  assert.match(upload, /scope === "assignment-attachment" \|\| scope === "submission-attachment"/);
  assert.match(upload, /feature: \{ key: "ASSIGNMENTS", active: true, implemented: true \}/);
  assert.match(upload, /"uploader-user-id"/);
  assert.match(upload, /"target-id"/);
  assert.match(upload, /tenantId: assignment\.publisherId/);
});

test("unsafe assignment upload types and oversized files are excluded centrally", () => {
  const policy = read("lib/storage/upload-policy.ts");
  assert.match(policy, /"assignment-attachment"/);
  assert.match(policy, /"submission-attachment"/);
  assert.doesNotMatch(policy, /assignment-attachment"[\s\S]{0,500}\.exe/);
  assert.match(policy, /maxSize: 25 \* MB/);
});

test("protected attachment routes authorize before signing and never return storage keys", () => {
  const assignmentRoute = read("app/api/assignments/attachments/[attachmentId]/open/route.ts");
  const submissionRoute = read("app/api/assignments/submissions/attachments/[attachmentId]/open/route.ts");
  for (const route of [assignmentRoute, submissionRoute]) {
    assert.match(route, /canOpen/);
    assert.match(route, /createSignedDownloadUrl/);
    assert.match(route, /expiresInSeconds: 60/);
    assert.doesNotMatch(route, /NextResponse\.json\(\{[^}]*objectKey/);
  }
});

test("audit actions cover lifecycle, attachments, submissions, grading, and return", () => {
  for (const action of [
    "classroom.assignment.create",
    "classroom.assignment.publish",
    "classroom.assignment.close",
    "classroom.assignment.archive",
    "classroom.submission.submit",
    "classroom.submission.resubmit",
    "classroom.submission.grade",
    "classroom.submission.return",
  ]) assert.match(audit, new RegExp(action.replaceAll(".", "\\.")));
  assert.doesNotMatch(assignmentService + submissionService, /metadata:\s*\{[^}]*teacherFeedback|metadata:\s*\{[^}]*textResponse/);
});

test("teacher and student assignment routes are canonical and responsive", () => {
  const teacherPage = read("app/teacher-dashboard/classes/[sectionId]/assignments/page.tsx");
  const teacherList = read("components/assignments/AssignmentList.tsx");
  const studentPage = read("app/student-dashboard/assignments/page.tsx");
  const studentList = read("components/assignments/StudentAssignmentList.tsx");
  assert.match(teacherPage, /getTeacherAssignments/);
  assert.match(studentPage, /getStudentAssignments/);
  assert.match(teacherList, /teacher-assignment-view/);
  assert.match(studentList, /md:grid-cols-2/);
  assert.doesNotMatch(teacherList + studentList, /min-w-\[[^\]]+\]|overflow-x-auto|<table/);
});

test("assignment feature is marked implemented but not automatically enabled", () => {
  const seed = read("prisma/seed.ts");
  assert.match(seed, /implemented[\s\S]*PlatformFeatureKey\.ASSIGNMENTS/);
  const enabledBlock = seed.slice(seed.indexOf("const enabledForBluegate"), seed.indexOf("for (const key"));
  assert.doesNotMatch(enabledBlock, /PlatformFeatureKey\.ASSIGNMENTS/);
});
