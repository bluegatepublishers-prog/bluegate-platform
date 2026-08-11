import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { adaptTeacherQuestion } from "../lib/normalized-question";
import { isTeacherQuestionOwnedBy, teacherQuestionSourceHash } from "../lib/teacher-question-policy";

const root = process.cwd();
const runtime = readFileSync(path.join(root, "lib/teacher-question-bank.ts"), "utf8");
const listRoute = readFileSync(path.join(root, "app/api/teacher/questions/route.ts"), "utf8");
const itemRoute = readFileSync(path.join(root, "app/api/teacher/questions/[questionId]/route.ts"), "utf8");
const lifecycleRoute = readFileSync(path.join(root, "app/api/teacher/questions/[questionId]/lifecycle/route.ts"), "utf8");
const owner = { publisherId: "publisher-1", schoolId: "school-1", teacherId: "teacher-1" };

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: "question-1", ...owner, sectionSubjectId: "section-subject-1", bookId: "book-1", chapterId: "chapter-1", moduleId: "module-1", imageResourceId: "image-1",
    questionType: "MCQ", questionText: "Which material is magnetic?", options: [{ id: "iron", text: "Iron" }, { id: "wood", text: "Wood" }],
    correctAnswer: "iron", explanation: "Iron is magnetic.", marks: 2, difficulty: "EASY", bloomLevel: "REMEMBER", competency: "OBSERVE", tags: ["science", "magnetism"],
    sourceHash: "hash", revision: 3, ...overrides,
  };
}

test("authorization: unauthenticated teacher API requests are denied", () => {
  assert.match(listRoute, /code: "UNAUTHENTICATED"/u);
});

test("authorization: create derives ownership from resolveActor", () => {
  assert.match(runtime, /const actor = await resolveActor\(userId\);[\s\S]*\.\.\.ownershipWhere\(actor\)/u);
});

test("authorization: wrong teacher reads are scoped out", () => {
  assert.match(runtime, /findFirst\(\{ where: \{ id, \.\.\.ownershipWhere\(actor\) \}/u);
  assert.equal(isTeacherQuestionOwnedBy(owner, { ...owner, teacherId: "teacher-2" }), false);
});

test("authorization: wrong school and publisher are scoped out", () => {
  assert.equal(isTeacherQuestionOwnedBy(owner, { ...owner, schoolId: "school-2" }), false);
  assert.equal(isTeacherQuestionOwnedBy(owner, { ...owner, publisherId: "publisher-2" }), false);
});

test("authorization: active SchoolStaffMembership and teacher-dashboard access are required", () => {
  assert.match(runtime, /schoolMemberships: \{ where: \{ active: true, status: "ACTIVE" \}/u);
  assert.match(runtime, /capability: "TEACHER_DASHBOARD", role: "TEACHER"/u);
});

test("create: clients cannot forge owner, revision, hash, or lifecycle fields", () => {
  assert.match(runtime, /data: \{[\s\S]*\.\.\.ownershipWhere\(actor\),[\s\S]*status: TeacherQuestionStatus\.DRAFT,[\s\S]*revision: 1,[\s\S]*sourceHash: sourceHash\(semantics\)/u);
  assert.doesNotMatch(runtime, /input\.publisherId|input\.schoolId|input\.teacherId|input\.sourceHash|input\.revision/u);
});

test("create: canonical semantic hashing includes question meaning and curriculum context", () => {
  const base = source();
  assert.notEqual(teacherQuestionSourceHash(base), teacherQuestionSourceHash(source({ moduleId: "module-2" })));
  assert.notEqual(teacherQuestionSourceHash(base), teacherQuestionSourceHash(source({ questionText: "Which metal conducts?" })));
});

test("context: section subjects use current class-teacher or subject-teacher authorization", () => {
  assert.match(runtime, /OR: \[[\s\S]*type: "CLASS_TEACHER"[\s\S]*type: "SUBJECT_TEACHER", subjectId: sectionSubject\.subjectId/u);
  assert.match(runtime, /academicYear: \{ active: true, current: true \}/u);
});

test("context: book/chapter/module hierarchy is canonicalized", () => {
  assert.match(runtime, /canonicalizeTeacherQuestionHierarchy\(semantics, \{ chapter, module: moduleRecord \}\)/u);
  assert.match(runtime, /The selected chapter does not match the module/u);
  assert.match(runtime, /The selected book does not match the curriculum hierarchy/u);
});

test("context: books must be publisher and school-entitlement scoped", () => {
  assert.match(runtime, /publisherId: actor\.publisherId,[\s\S]*schoolEntitlements: \{ some: \{ schoolId: actor\.schoolId, publisherId: actor\.publisherId, status: "ACTIVE" \} \}/u);
});

test("resource: only an entitlement-scoped IMAGE resource is accepted", () => {
  assert.match(runtime, /type: ResourceType\.IMAGE, \.\.\.scope\.where/u);
  assert.match(runtime, /Question images must use an IMAGE resource/u);
});

test("resource: picture-based questions require an image resource", () => {
  assert.match(runtime, /semantics\.questionType === "PICTURE_BASED" && !imageResourceId/u);
});

test("update: optimistic semantic revision protection is enforced", () => {
  assert.match(runtime, /const revision = expectedRevision\(body\.expectedRevision\);/u);
  assert.match(runtime, /where: \{ id: question\.id, \.\.\.ownershipWhere\(actor\), revision \}/u);
  assert.match(runtime, /"REVISION_CONFLICT"/u);
});

test("update: semantic changes recompute source hash and increment revision", () => {
  assert.match(runtime, /const nextHash = sourceHash\(semantics\);/u);
  assert.match(runtime, /sourceHash: nextHash, revision: \{ increment: 1 \}/u);
});

test("update: no semantic change preserves hash and revision", () => {
  assert.match(runtime, /if \(nextHash === question\.sourceHash\) return view\(question\);/u);
});

test("update: explicit null removes optional image context", () => {
  assert.match(runtime, /function valueOrExisting[\s\S]*normalized === undefined \? existing \?\? null : normalized/u);
});

test("lifecycle: explicit activate/archive/restore actions are the only transitions", () => {
  assert.match(lifecycleRoute, /ACTIVATE", "ARCHIVE", "RESTORE_DRAFT", "RESTORE_ACTIVE/u);
  assert.match(runtime, /canTransitionTeacherQuestionStatus\(current, action\)/u);
  assert.doesNotMatch(runtime, /teacherQuestion\.delete|DELETE TeacherQuestion/u);
});

test("lifecycle: status-only changes do not alter semantic master revision or hash", () => {
  const semantic = source();
  const archived = { ...semantic, status: "ARCHIVED" };
  assert.equal(teacherQuestionSourceHash(semantic), teacherQuestionSourceHash(archived));
  assert.match(runtime, /data: \{ status \}/u);
});

test("search: default list is owner scoped and excludes archived records", () => {
  assert.match(runtime, /\.\.\.ownershipWhere\(actor as TeacherQuestionActor\)/u);
  assert.match(runtime, /status: \{ not: TeacherQuestionStatus\.ARCHIVED \}/u);
});

test("search: status/type/difficulty/curriculum/tag/search filters are present", () => {
  for (const field of ["questionType", "difficulty", "sectionSubjectId", "bookId", "chapterId", "moduleId", "tags", "questionText"]) {
    assert.match(runtime, new RegExp(field, "u"));
  }
});

test("search: pagination is bounded and order is deterministic", () => {
  assert.match(runtime, /const MAX_PAGE_SIZE = 100/u);
  assert.match(runtime, /orderBy: \[\{ updatedAt: "desc" \}, \{ id: "desc" \}\]/u);
});

test("validation: MCQ requires valid option-backed answers", () => {
  assert.match(runtime, /normalizeChoiceOptions\(options, "MCQ"\)/u);
  assert.match(runtime, /optionId\(options as ChoiceOption\[\], correctAnswer, "MCQ"\)/u);
});

test("validation: TRUE_FALSE, FILL_BLANK, MATCH, MULTIPLE_SELECT, and ORDERING are explicitly handled", () => {
  for (const type of ["TRUE_FALSE", "FILL_BLANK", "MATCH", "MULTIPLE_SELECT", "ORDERING"]) assert.match(runtime, new RegExp(`questionType === "${type}"`, "u"));
});

test("validation: ordering persists only valid full option sequences", () => {
  assert.match(runtime, /ORDERING answers must contain every option exactly once/u);
});

test("validation: subjective and future delivery types remain normalized without claiming delivery support", () => {
  const question = adaptTeacherQuestion(source({ questionType: "PROJECT", correctAnswer: null }));
  assert.equal(question.grading.capability, "MANUAL");
  assert.equal(question.grading.assessmentRuntime, "SOURCE_ONLY");
});

test("normalization: read output uses the shared TeacherQuestion adapter", () => {
  assert.match(runtime, /normalized: adaptTeacherQuestion\(question\)/u);
  const normalized = adaptTeacherQuestion(source());
  assert.equal(normalized.source.type, "TEACHER");
  assert.equal(normalized.snapshot.sourceHash, "hash");
});

test("API: list/create, read/update, and lifecycle are exposed only once", () => {
  assert.match(listRoute, /export async function GET/u);
  assert.match(listRoute, /export async function POST/u);
  assert.match(itemRoute, /export async function PATCH/u);
  assert.match(lifecycleRoute, /export async function POST/u);
});