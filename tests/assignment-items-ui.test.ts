import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("existing assignment create/edit/detail routes remain canonical and reuse AssignmentBuilder", () => {
  const create = read("app/teacher-dashboard/classes/[sectionId]/assignments/new/page.tsx");
  const edit = read("app/teacher-dashboard/classes/[sectionId]/assignments/[assignmentId]/edit/page.tsx");
  const detail = read("app/teacher-dashboard/classes/[sectionId]/assignments/[assignmentId]/page.tsx");
  for (const source of [create, edit]) assert.equal(source.includes("AssignmentBuilder"), true);
  assert.equal(edit.includes("AssignmentItemsEditor"), true);
  assert.equal(detail.includes("AssignmentItemsEditor"), true);
  assert.equal(create.includes("/v2-assignments"), false);
});

test("AssignmentBuilder preserves the existing assignment form and locks Book changes when bound items exist", () => {
  const builder = read("components/assignments/AssignmentBuilder.tsx");
  for (const field of ["title", "instructions", "publishAt", "dueAt", "closeAt", "assignmentType", "attachment", "allowTextSubmission"]) {
    assert.equal(builder.includes(field), true, `missing existing assignment field: ${field}`);
  }
  assert.equal(builder.includes("hasAssignmentItems"), true);
  assert.equal(builder.includes("Remove book-bound Assignment Items before changing the Assignment Book."), true);
  assert.equal(builder.includes("disabled={!subjectId || hasAssignmentItems}"), true);
});

test("Assignment Items editor exposes the compact chooser, item labels, lifecycle states, and safe actions", () => {
  const editor = read("components/assignments/AssignmentItemsEditor.tsx");
  for (const fragment of [
    'type PickerMode = ItemType | "CHOOSER"',
    'onClick={() => open("CHOOSER")}',
    "Book Page",
    "Book Question",
    "Instruction",
    "Teacher Question",
    "SOURCE_CHANGED",
    "MISSING_TARGET",
    "Publisher content updated",
    "V2ContentDocumentRenderer",
    "createAssignmentItemAction",
    "updateAssignmentItemAction",
    "deleteAssignmentItemAction",
    "reorderAssignmentItemsAction",
    "aria-label",
    "Loading pages",
    "Loading questions",
    "Loading preview",
  ]) assert.equal(editor.includes(fragment), true, `missing UI contract: ${fragment}`);
  assert.equal(editor.includes("Correct Answer"), false);
  assert.equal(editor.includes("Teacher Key"), false);
  assert.equal(editor.includes("x:"), false);
  assert.equal(editor.includes("y:"), false);
});

test("bookless Assignment UI enables only Instruction and explains the remaining restrictions", () => {
  const editor = read("components/assignments/AssignmentItemsEditor.tsx");
  assert.equal(editor.includes('type !== "INSTRUCTION" && !bookReady'), true);
  assert.equal(editor.includes("Instructions can still be added."), true);
  assert.equal(editor.includes("Select a book to add book content or answerable teacher questions."), true);
});

test("TeachingPeriod context is displayed and mapped pages are prioritized without hard restriction", () => {
  const editor = read("components/assignments/AssignmentItemsEditor.tsx");
  const detail = read("app/teacher-dashboard/classes/[sectionId]/assignments/[assignmentId]/page.tsx");
  assert.equal(editor.includes("period?.pageKeys"), true);
  assert.equal(editor.includes("periodPageKeys.has"), true);
  assert.equal(detail.includes("pageKeys:"), true);
  assert.equal(editor.includes("Page {page.displayPageNumber}"), true);
  assert.equal(editor.includes("getTeachingPlanPageAvailabilityAction"), true);
});

test("Teacher UI stays out of Student delivery, review, school, planner, and Publisher Master mutation paths", () => {
  const editor = read("components/assignments/AssignmentItemsEditor.tsx");
  const studentAssignment = read("lib/assignments/access.ts") + read("lib/assignments/queries.ts");
  const service = read("lib/assignments/assignment-items.ts");
  assert.equal(studentAssignment.includes("AssignmentItemsEditor"), false);
  assert.equal(editor.includes("StudentWork"), false);
  assert.equal(editor.includes("SubmissionReviewList"), false);
  assert.equal(service.includes("contentDocument.update"), false);
  assert.equal(service.includes("teachingPeriodPageRef.update"), false);
  assert.equal(service.includes("academicPlannerItem.create"), false);
});
