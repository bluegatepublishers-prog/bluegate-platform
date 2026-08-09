import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260809020000_classroom_assignment_items/migration.sql", "utf8");

function block(kind: "model" | "enum", name: string) {
  const start = schema.indexOf(`${kind} ${name} {`);
  assert.notEqual(start, -1, `missing ${name}`);
  const end = schema.indexOf("\n}", start);
  assert.notEqual(end, -1, `unterminated ${name}`);
  return schema.slice(start, end);
}

const model = (name: string) => block("model", name);
const enumBlock = (name: string) => block("enum", name);

test("V2-13B reuses ClassroomAssignment without a second assignment parent", () => {
  assert.notEqual(schema.indexOf("model ClassroomAssignment {"), -1);
  assert.equal(schema.includes("model AcademicAssignment {"), false);
  assert.equal(schema.includes("model TeacherAssignmentTask {"), false);
  assert.equal(schema.includes("model TeacherOverlay {"), false);
});

test("ClassroomAssignmentItem has the approved four-type contract and deterministic order", () => {
  const types = enumBlock("ClassroomAssignmentItemType").split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
  assert.deepEqual(types, ["PUBLISHER_PAGE", "PUBLISHER_QUESTION", "INSTRUCTION", "TEACHER_QUESTION"]);
  const item = model("ClassroomAssignmentItem");
  for (const field of ["assignmentId        String", "type                ClassroomAssignmentItemType", "sequence            Int", "@@unique([assignmentId, sequence])"]) {
    assert.equal(item.includes(field), true, `missing ${field}`);
  }
});

test("assignment items carry stable V2 identifiers and bounded fallback metadata only", () => {
  const item = model("ClassroomAssignmentItem");
  for (const field of ["moduleId", "pageId", "frameId", "childFrameId", "questionId"]) {
    assert.equal(item.includes(`${field}`) && item.includes("@db.VarChar(128)"), true);
  }
  for (const field of ["targetSourceHash    String?                     @db.VarChar(128)", "targetLabelSnapshot String?                     @db.VarChar(512)", "payload             Json?"]) {
    assert.equal(item.includes(field), true, `missing ${field}`);
  }
  for (const forbidden of ["pageNumber", "pageIndex", "questionIndex", "frameIndex", " x ", " y ", "width", "height", "rotation", "zIndex", "BookQuestion", "AssessmentQuestion", "BookModule?"]) {
    assert.equal(item.includes(forbidden), false, `unexpected ${forbidden}`);
  }
});

test("Teaching Period linkage preserves assignment history", () => {
  const assignment = model("ClassroomAssignment");
  const period = model("TeachingPeriod");
  for (const field of ["teachingPeriodId     String?", "teachingPeriod       TeachingPeriod?", "onDelete: SetNull", "items                ClassroomAssignmentItem[]", "@@index([teachingPeriodId])"]) {
    assert.equal(assignment.includes(field), true, `missing ${field}`);
  }
  assert.equal(period.includes("assignments ClassroomAssignment[]"), true);
  assert.equal(migration.includes('FOREIGN KEY ("teachingPeriodId") REFERENCES "TeachingPeriod"("id") ON DELETE SET NULL'), true);
});

test("Student Work remains optional, contextual, and protected from item deletion", () => {
  const work = model("StudentWorkItem");
  const attempts = model("StudentWorkAttempt");
  for (const field of ["assignmentItemId String?", "assignmentItem   ClassroomAssignmentItem?", "onDelete: Restrict", "@@index([studentId, assignmentItemId])", "@@index([assignmentItemId])", "@@unique([studentId, schoolId, publisherId, bookId, academicYearId, type, targetKey])"]) {
    assert.equal(work.includes(field), true, `missing ${field}`);
  }
  assert.equal(attempts.includes("assignmentItemId"), false);
  assert.equal(migration.includes('StudentWorkItem_assignmentItemId_fkey" FOREIGN KEY ("assignmentItemId") REFERENCES "ClassroomAssignmentItem"("id") ON DELETE RESTRICT'), true);
});

test("existing assignment submission, attachments, planner, and lifecycle schemas remain unchanged", () => {
  const submission = model("AssignmentSubmission");
  const attachment = model("AssignmentAttachment");
  const item = model("ClassroomAssignmentItem");
  assert.equal(submission.includes("@@unique([assignmentId, studentId, attemptNumber])"), true);
  assert.equal(submission.includes("assignmentItemId"), false);
  assert.equal(attachment.includes("assignmentId     String"), true);
  assert.equal(item.includes("AcademicPlannerItem") || item.includes("plannerItem") || item.includes("Notification"), false);
  for (const untouched of ["AcademicPlannerItem", "Notification", "StudentWorkAttempt", "AssignmentSubmission", "AssignmentAttachment"]) {
    assert.equal(migration.includes(untouched), false, `unexpected ${untouched} migration change`);
  }
  assert.equal(enumBlock("ClassroomAssignmentType").includes("HOMEWORK") && enumBlock("ClassroomAssignmentType").includes("CLASSWORK"), true);
  assert.equal(enumBlock("ClassroomAssignmentStatus").includes("DRAFT") && enumBlock("ClassroomAssignmentStatus").includes("ARCHIVED"), true);
  assert.equal(enumBlock("AssignmentSubmissionStatus").includes("DRAFT") && enumBlock("AssignmentSubmissionStatus").includes("GRADED"), true);
});
