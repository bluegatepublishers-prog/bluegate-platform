import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const shell = readFileSync(path.join(root, "components/dashboard/TeacherQuestionBank.tsx"), "utf8");
const editor = readFileSync(path.join(root, "components/dashboard/TeacherQuestionEditor.tsx"), "utf8");
const nav = readFileSync(path.join(root, "components/dashboard/Sidebar.tsx"), "utf8");
const page = readFileSync(path.join(root, "app/teacher-dashboard/question-bank/page.tsx"), "utf8");
const options = readFileSync(path.join(root, "lib/teacher-question-bank-ui.ts"), "utf8");
const routes = readFileSync(path.join(root, "app/api/teacher/questions/route.ts"), "utf8");
const itemRoute = readFileSync(path.join(root, "app/api/teacher/questions/[questionId]/route.ts"), "utf8");
const lifecycle = readFileSync(path.join(root, "app/api/teacher/questions/[questionId]/lifecycle/route.ts"), "utf8");

const checks: Array<[string, string, RegExp]> = [
  ["navigation exposes Question Bank", nav, /name: "Question Bank"/u],
  ["navigation points to Question Bank route", nav, /href: "\/teacher-dashboard\/question-bank"/u],
  ["page uses secure options loader", page, /getTeacherQuestionBankOptions/u],
  ["page is force dynamic", page, /dynamic = "force-dynamic"/u],
  ["list API is called", shell, /\/api\/teacher\/questions\?/u],
  ["search maps to API", shell, /params\.set\("search", query\.trim\(\)\)/u],
  ["status maps to API", shell, /params\.set\("status", status\)/u],
  ["type filter maps to API", shell, /params\.set\("questionType", filters\.questionType\)/u],
  ["difficulty filter maps to API", shell, /params\.set\("difficulty", filters\.difficulty\)/u],
  ["subject filter maps to API", shell, /params\.set\("sectionSubjectId", filters\.sectionSubjectId\)/u],
  ["book filter maps to API", shell, /params\.set\("bookId", filters\.bookId\)/u],
  ["chapter filter maps to API", shell, /params\.set\("chapterId", filters\.chapterId\)/u],
  ["module filter maps to API", shell, /params\.set\("moduleId", filters\.moduleId\)/u],
  ["tag filter maps to API", shell, /params\.set\("tags", filters\.tags\.trim\(\)\)/u],
  ["search is debounced", shell, /query\.trim\(\) \? 300 : 0/u],
  ["backend pagination is used", shell, /pageSize: "12"/u],
  ["create button opens editor", shell, /Create Question/u],
  ["editor supports question type", editor, /Question type/u],
  ["MCQ editor supports options and one answer", editor, /draft\.questionType === "MCQ"[\s\S]*correctOption/u],
  ["True False editor exists", editor, /TRUE_FALSE[\s\S]*trueFalse/u],
  ["Fill Blank editor exists", editor, /FILL_BLANK[\s\S]*Expected answer/u],
  ["Match editor supports pairs", editor, /MATCH[\s\S]*Matching pairs[\s\S]*Add pair/u],
  ["Multiple Select editor supports checkboxes", editor, /MULTIPLE_SELECT[\s\S]*type="checkbox"/u],
  ["Ordering editor supports movement", editor, /ORDERING[\s\S]*Move up[\s\S]*Move down/u],
  ["subjective editor is manual review", editor, /Manual review: this question is stored safely/u],
  ["picture editor uses image selector", editor, /PICTURE_BASED[\s\S]*Select image resource/u],
  ["image selector uses protected playback", editor, /\/api\/resources\/\$\{image\.id\}\/play/u],
  ["image options are teacher-scoped server-side", options, /getTeacherResourceScope/u],
  ["create and update send authorable payload only", editor, /sectionSubjectId: draft\.sectionSubjectId \|\| null/u],
  ["update submits expectedRevision", editor, /toPayload\(draft, question\?\.revision\)/u],
  ["revision conflict is explicit", editor, /REVISION_CONFLICT[\s\S]*Reload Latest/u],
  ["archive has required confirmation", shell, /Archive this question\?\\n\\nIt will no longer appear/u],
  ["student preview hides answer key", shell, /onPreview\(false\)/u],
  ["answer-key rendering is distinct", shell, /answerKey \? "Answer key preview" : "Student view preview"/u],
  ["answer-key preview has an explicit toggle", shell, /Show Answer Key/u],
  ["publisher questions remain read-only", shell, /Publisher questions remain read-only/u],
  ["B2 create endpoint is used", routes, /createTeacherQuestion/u],
  ["B2 update endpoint is used", itemRoute, /updateTeacherQuestion/u],
  ["B2 lifecycle endpoint is used", lifecycle, /transitionTeacherQuestion/u],
];

for (const [name, source, pattern] of checks) {
  test(`B3 UI: ${name}`, () => assert.match(source, pattern));
}

test("B3 UI: no hard delete action exists", () => {
  assert.doesNotMatch(shell + editor, /delete|Delete/u);
});
test("B3 UI: no owner identifiers are present in the authoring payload", () => {
  assert.doesNotMatch(editor, /publisherId:\s*draft|schoolId:\s*draft|teacherId:\s*draft/u);
});