import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { adaptTeacherQuestion } from "../lib/normalized-question";
import {
  canReuseTeacherQuestion,
  isTeacherQuestionOwnedBy,
  teacherQuestionSourceHash,
  validateTeacherQuestionMaster,
} from "../lib/teacher-question-policy";

const root = process.cwd();
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(path.join(root, "prisma/migrations/20260811000000_teacher_question_bank_foundation/migration.sql"), "utf8");

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: "teacher-question-1", publisherId: "publisher-1", schoolId: "school-1", teacherId: "teacher-1",
    sectionSubjectId: "section-subject-1", bookId: "book-1", chapterId: "chapter-1", moduleId: "module-1", imageResourceId: "resource-1",
    questionType: "MCQ", questionText: "Which material is magnetic?", options: [{ id: "iron", label: "Iron" }, { id: "wood", label: "Wood" }],
    correctAnswer: "Iron", explanation: "Iron is magnetic.", marks: 2, difficulty: "EASY", bloomLevel: "REMEMBER", competency: "OBSERVE", tags: ["magnetism"],
    sourceHash: "semantic-hash", revision: 3, ...overrides,
  };
}

test("TeacherQuestion schema has required ownership, optional curriculum context, lifecycle, and practical indexes", () => {
  assert.match(schema, /model TeacherQuestion \{[\s\S]*publisherId\s+String[\s\S]*schoolId\s+String[\s\S]*teacherId\s+String/u);
  assert.match(schema, /sectionSubjectId\s+String\?[\s\S]*bookId\s+String\?[\s\S]*chapterId\s+String\?[\s\S]*moduleId\s+String\?/u);
  assert.match(schema, /status\s+TeacherQuestionStatus\s+@default\(DRAFT\)/u);
  assert.match(schema, /@@index\(\[publisherId, schoolId, teacherId, status\]\)/u);
  assert.match(schema, /@@index\(\[bookId, chapterId, moduleId\]\)/u);
  assert.match(schema, /@@index\(\[questionType, difficulty, status\]\)/u);
});

test("TeacherQuestion migration is additive and avoids dangerous delete behavior", () => {
  for (const keyword of ["DROP", "DELETE FROM", "UPDATE", "INSERT", "TRUNCATE"]) assert.doesNotMatch(migration, new RegExp(`^\\s*${keyword}\\b`, "mu"));
  assert.doesNotMatch(migration, /ON DELETE CASCADE/u);
  assert.match(migration, /ON DELETE RESTRICT/u);
  assert.match(migration, /ON DELETE SET NULL/u);
});

test("TeacherQuestion adapts as a non-mutating teacher master with resource, hash, revision, and ownership attribution", () => {
  const record = source();
  const before = structuredClone(record);
  const question = adaptTeacherQuestion(record);
  assert.deepEqual(record, before);
  assert.equal(question.source.type, "TEACHER");
  assert.equal(question.snapshot.kind, "MASTER");
  assert.equal(question.snapshot.sourceHash, "semantic-hash");
  assert.equal(question.snapshot.revision, 3);
  assert.deepEqual(question.resourceIds, ["resource-1"]);
  assert.equal(question.source.attribution.teacherId, "teacher-1");
  assert.equal(question.questionType, "MCQ");
});

test("TeacherQuestion semantic hashes are deterministic, capture meaningful content, and ignore timestamps", () => {
  const first = source();
  const same = source({ updatedAt: "2026-08-11T10:00:00.000Z" });
  assert.equal(teacherQuestionSourceHash(first), teacherQuestionSourceHash(same));
  assert.notEqual(teacherQuestionSourceHash(first), teacherQuestionSourceHash(source({ questionText: "Which material conducts?" })));
  assert.notEqual(teacherQuestionSourceHash(first), teacherQuestionSourceHash(source({ options: [{ id: "iron", label: "Iron" }, { id: "copper", label: "Copper" }] })));
  assert.notEqual(teacherQuestionSourceHash(first), teacherQuestionSourceHash(source({ correctAnswer: "Wood" })));
});

test("TeacherQuestion preserves current and future normalized question types without claiming delivery support", () => {
  for (const [questionType, normalized] of [["MCQ", "MCQ"], ["TRUE_FALSE", "TRUE_FALSE"], ["FILL_BLANK", "FILL_BLANK"], ["MATCH", "MATCH"], ["MULTIPLE_SELECT", "MULTIPLE_SELECT"], ["SHORT", "SHORT_ANSWER"], ["LONG", "LONG_ANSWER"], ["ORDERING", "ORDERING"], ["PICTURE_BASED", "PICTURE_BASED"], ["PROJECT", "PROJECT"]] as const) {
    assert.equal(adaptTeacherQuestion(source({ questionType })).questionType, normalized);
  }
  const unsupported = adaptTeacherQuestion(source({ questionType: "FUTURE_VENDOR_TYPE" }));
  assert.equal(unsupported.questionType, "UNSUPPORTED");
  assert.equal(unsupported.originalQuestionType, "FUTURE_VENDOR_TYPE");
});

test("TeacherQuestion policy validates master content, scope, and reusable lifecycle", () => {
  assert.deepEqual(validateTeacherQuestionMaster(source()), { ok: true, questionType: "MCQ" });
  assert.equal(validateTeacherQuestionMaster(source({ questionType: "FUTURE_VENDOR_TYPE" })).ok, false);
  assert.equal(validateTeacherQuestionMaster(source({ marks: 0 })).ok, false);
  assert.equal(isTeacherQuestionOwnedBy(source(), source()), true);
  assert.equal(isTeacherQuestionOwnedBy(source(), source({ teacherId: "teacher-2" })), false);
  assert.equal(canReuseTeacherQuestion({ status: "DRAFT" }, true), true);
  assert.equal(canReuseTeacherQuestion({ status: "DRAFT" }, false), false);
  assert.equal(canReuseTeacherQuestion({ status: "ACTIVE" }, false), true);
  assert.equal(canReuseTeacherQuestion({ status: "ARCHIVED" }, true), false);
});