import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Phase 2H reuses one eligible question-bank discovery policy", () => {
  const policy = read("lib/question-bank-discovery.ts");
  for (const source of ["ALL", "BOOK", "PUBLISHER", "MY"]) assert.ok(policy.includes('"' + source + '"'));
  for (const field of ["approved: true", "archived: false", "published: true", "publisherId: input.context.publisherId", "schoolId: input.context.schoolId", "teacherId: input.context.teacherId", "sectionSubjectId: input.context.sectionSubjectId", "moduleId", "exerciseId", "questionType", "difficulty"]) {
    assert.ok(policy.includes(field), "missing shared field " + field);
  }
  assert.match(policy, /prisma\.bookQuestion\.findMany/);
  assert.match(policy, /prisma\.teacherQuestion\.findMany/);
  assert.match(policy, /BOOK_QUESTIONS_EXERCISE_CODE/);
  assert.match(policy, /My Questions have no exerciseId metadata/);
});

test("Phase 2H Assignment composition persists canonical item snapshots and source identity", () => {
  const service = read("lib/assignments/assignment-items.ts");
  const policy = read("lib/assignments/assignment-item-policy.ts");
  const actions = read("app/teacher-dashboard/classes/[sectionId]/assignments/actions.ts");
  assert.match(service, /discoverQuestionBank/);
  assert.match(service, /listAssignmentQuestionBank/);
  assert.match(service, /type: "TEACHER_QUESTION"/);
  assert.match(service, /sourceQuestionId/);
  assert.match(service, /alreadyAdded/);
  assert.match(service, /This source question is already added to the assignment/);
  assert.match(actions, /listAssignmentQuestionBankAction/);
  assert.match(policy, /sourceKind/);
  assert.match(policy, /targetSourceHash/);
  assert.match(service, /serializableTransaction/);
});

test("Phase 2H picker supports sources, filters, preview, multi-select, and useful empty state", () => {
  const editor = read("components/assignments/AssignmentItemsEditor.tsx");
  for (const text of ["Book Questions", "Publisher Questions", "My Questions", "moduleId", "exerciseId", "questionType", "difficulty", "questionSearch", "Add Selected Questions", "Selected:", "Marks:", "No questions match the current filters.", "Only published and approved questions available to this class are shown.", "correctAnswer", "explanation"]) {
    assert.ok(editor.includes(text), "missing picker text " + text);
  }
  assert.match(editor, /listAssignmentQuestionBankAction/);
  assert.match(editor, /alreadyAdded/);
});

test("Phase 2H keeps chapter and period identity on the canonical Assignment route", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assignments/[assignmentId]/page.tsx");
  const editPage = read("app/teacher-dashboard/classes/[sectionId]/assignments/[assignmentId]/edit/page.tsx");
  const service = read("lib/assignments/assignment-service.ts");
  assert.match(page, /chapterId: assignment\.chapterId/);
  assert.match(editPage, /chapterId: assignment\.chapterId/);
  assert.match(service, /teachingPeriodId/);
});

test("Phase 2H student Assignment delivery omits teacher answers and explanations", () => {
  const service = read("lib/assignments/assignment-items.ts");
  const blockStart = service.indexOf('if (item.type === "TEACHER_QUESTION")');
  const blockEnd = service.indexOf('if (item.type === "PUBLISHER_PAGE"', blockStart);
  assert.ok(blockStart >= 0 && blockEnd > blockStart);
  const deliveryBlock = service.slice(blockStart, blockEnd);
  assert.doesNotMatch(deliveryBlock, /correctAnswer/);
  assert.doesNotMatch(deliveryBlock, /explanation/);
  assert.match(deliveryBlock, /payload\.options/);
});

test("Phase 2H no-question assignment types and existing submission flow remain available", () => {
  const builder = read("components/assignments/AssignmentBuilder.tsx");
  const submission = read("lib/assignments/submission-service.ts");
  for (const type of ["PROJECT", "READING", "PRACTICAL", "OTHER"]) assert.ok(builder.includes(type));
  assert.match(submission, /AssignmentSubmission/);
  assert.match(submission, /assignmentId/);
});