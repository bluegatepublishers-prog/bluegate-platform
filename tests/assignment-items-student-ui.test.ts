import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(file, "utf8");

test("V2-13E extends the canonical Student Assignment detail without replacing submission UI", () => {
  const page = read("app/student-dashboard/assignments/[assignmentId]/page.tsx");
  assert.match(page, /getStudentAssignmentDetail/);
  assert.match(page, /StudentAssignmentWork/);
  assert.match(page, /SubmissionEditor/);
  assert.match(page, /Assignment attachments/);
  assert.match(page, /assignment\.instructions/);
  assert.doesNotMatch(page, /v2-assignments/);
});

test("Student delivery resolves ordered items and batched assignment-context work on the server", () => {
  const service = read("lib/assignments/assignment-items.ts");
  assert.match(service, /getStudentAssignmentDelivery/);
  assert.match(service, /orderBy: \[\{ sequence: "asc" \}/);
  assert.match(service, /studentWorkItem\.findMany/);
  assert.match(service, /assignmentItem: \{ assignmentId: access\.assignment\.id \}/);
  assert.match(service, /filterDocumentForMode\(published, "STUDENT"/);
  assert.match(service, /safeStudentQuestion/);
  assert.match(service, /MISSING_TARGET/);
  assert.match(service, /targetLabelSnapshot/);
  assert.doesNotMatch(service, /items\.map\(async/);
});

test("Student Assignment Work uses friendly ordered cards and stable page deep links", () => {
  const ui = read("components/assignments/StudentAssignmentWork.tsx");
  for (const label of ["Read", "Book Question", "Instruction", "Teacher Question", "Open Page", "Assignment Work"]) {
    assert.equal(ui.includes(label), true, `missing label: ${label}`);
  }
  assert.match(ui, /item\.sequence/);
  assert.match(ui, /item\.page\.moduleId/);
  assert.match(ui, /item\.page\.pageId/);
  assert.match(ui, /item\.page\.chapterId/);
  assert.match(ui, /SOURCE_CHANGED/);
  assert.match(ui, /MISSING_TARGET/);
  assert.match(ui, /Book content has been updated since this work was assigned/);
  assert.match(ui, /This book content is no longer available/);
  assert.doesNotMatch(ui, /correctOption|teacherAnswer|answerKey|explanation/);
});

test("Assignment response UI persists through assignmentItemId and preserves local failure drafts", () => {
  const ui = read("components/assignments/StudentAssignmentWork.tsx");
  const api = read("app/api/student/books/[bookId]/work/route.ts");
  for (const fragment of ["assignmentItemId", "expectedRevision", "Saving", "Saved", "Retry save", "Reload saved version", "This answer changed elsewhere"]) {
    assert.equal(ui.includes(fragment), true, `missing response contract: ${fragment}`);
  }
  assert.match(ui, /target: \{\}/);
  assert.match(ui, /method: "POST"/);
  assert.match(api, /getStudentAssignmentWork\(assignmentId, bookId\)/);
  assert.match(api, /AssignmentItemServiceError/);
  assert.doesNotMatch(ui, /targetKey\s*=/);
  assert.doesNotMatch(ui, /buildAssignmentAwareTargetKey/);
});

test("self-study and private Student Work remain outside the Assignment Work surface", () => {
  const page = read("app/student-dashboard/assignments/[assignmentId]/page.tsx");
  const ui = read("components/assignments/StudentAssignmentWork.tsx");
  assert.doesNotMatch(page + ui, /StudentWorkProvider|StudentWorkPanel|NOTE|HIGHLIGHT|BOOKMARK/);
  assert.match(read("lib/assignments/assignment-items.ts"), /type: "ANSWER"/);
  assert.match(read("lib/assignments/assignment-items.ts"), /assignmentItem: \{ assignmentId/);
});

test("missing publisher targets remain in order without answer controls", () => {
  const ui = read("components/assignments/StudentAssignmentWork.tsx");
  assert.match(ui, /const missing = item\.state === "MISSING_TARGET"/);
  assert.match(ui, /item\.question && !missing/);
  assert.match(ui, /Open Page unavailable/);
  assert.match(ui, /item\.label \?\? type/);
});

test("Bookless Instruction remains renderable without Student Work or a book route", () => {
  const ui = read("components/assignments/StudentAssignmentWork.tsx");
  assert.match(ui, /item\.type === "INSTRUCTION"/);
  assert.match(ui, /item\.payload\?\.text/);
  assert.match(read("lib/assignments/assignment-items.ts"), /normalizeInstructionPayload/);
  assert.match(read("lib/assignments/assignment-item-policy.ts"), /return type !== "INSTRUCTION"/);
});

test("the existing Student chapter viewer accepts stable assignment module/page focus", () => {
  const page = read("app/student-dashboard/subjects/[sectionSubjectId]/chapters/[chapterId]/page.tsx");
  const delivery = read("lib/content-delivery.ts");
  const book = read("components/content/StudentWorkBook.tsx");
  assert.match(page, /searchParams/);
  assert.match(page, /query\.moduleId/);
  assert.match(page, /focusPageId/);
  assert.match(delivery, /moduleId\?: string/);
  assert.match(delivery, /moduleId\.trim\(\)/);
  assert.match(book, /data-v2-delivery-page-id/);
  assert.match(book, /scrollIntoView/);
});

test("V2-13F adds derived Homework completion without a second submission or assessment system", () => {
  const ui = read("components/assignments/StudentAssignmentWork.tsx");
  const editor = read("components/assignments/SubmissionEditor.tsx");
  assert.match(ui, /CompletionSummary/);
  assert.match(ui, /router\.refresh/);
  assert.match(editor, /homeworkBlocked/);
  assert.match(editor, /assignmentType === "HOMEWORK"/);
  assert.doesNotMatch(ui + editor, /correctOption|teacherAnswer|answerKey|rubric/);
});