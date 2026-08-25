import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ExcelJS from "exceljs";

import {
  TEACHER_BULK_ASSIGNMENT_COLUMNS,
  TEACHER_BULK_MAX_ASSIGNMENT_ROWS,
  TEACHER_BULK_MAX_FILE_BYTES,
  TEACHER_BULK_TEACHER_COLUMNS,
  type TeacherBulkParsedAssignmentRow,
  type TeacherBulkParsedTeacherRow,
  type TeacherBulkValidationContext,
} from "../lib/teacher-bulk-import-contract";
import { parseTeacherBulkWorkbook, validateTeacherBulkRows } from "../lib/teacher-bulk-import";

const read = (path: string) => readFileSync(path, "utf8");
const context: TeacherBulkValidationContext = {
  years: [{ id: "year-1", name: "2026-27", active: true, current: true, classes: [{ id: "class-3", academicYearId: "year-1", code: "3", name: "Class 3", active: true, sections: [{ id: "section-a", schoolClassId: "class-3", code: "A", name: "Section A", active: true, subjects: [{ id: "section-subject-a-evs", subjectId: "subject-evs", active: true, subject: { id: "subject-evs", code: "EVS", name: "Environmental Studies", active: true } }] }, { id: "section-b", schoolClassId: "class-3", code: "B", name: "Section B", active: true, subjects: [{ id: "section-subject-b-evs", subjectId: "subject-evs", active: true, subject: { id: "subject-evs", code: "EVS", name: "Environmental Studies", active: true } }] }] }] }],
  teachers: [], users: [], assignments: [],
};

function teacher(fields: Partial<TeacherBulkParsedTeacherRow["fields"]> = {}, excelRow = 2): TeacherBulkParsedTeacherRow {
  return { excelRow, parseMessages: [], fields: { teacherName: "Asha Rao", email: "asha@example.com", phone: "+919876543210", designation: "Teacher", ...fields } };
}

function assignment(fields: Partial<TeacherBulkParsedAssignmentRow["fields"]> = {}, excelRow = 2): TeacherBulkParsedAssignmentRow {
  return { excelRow, parseMessages: [], fields: { teacherEmail: "asha@example.com", academicYear: "2026-27", classCode: "3", sectionCode: "A", assignmentType: "SUBJECT_TEACHER", subjectCode: "EVS", ...fields } };
}

async function workbookBytes(teacherRows: unknown[][], assignmentRows: unknown[][], teacherHeaders: string[] = TEACHER_BULK_TEACHER_COLUMNS.map((column) => column.header), assignmentHeaders: string[] = TEACHER_BULK_ASSIGNMENT_COLUMNS.map((column) => column.header)) {
  const workbook = new ExcelJS.Workbook();
  const teachers = workbook.addWorksheet("Teachers"); teachers.addRow(teacherHeaders); teacherRows.forEach((row) => teachers.addRow(row));
  const assignments = workbook.addWorksheet("Assignments"); assignments.addRow(assignmentHeaders); assignmentRows.forEach((row) => assignments.addRow(row));
  workbook.addWorksheet("Instructions"); workbook.addWorksheet("Reference");
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

test("parser normalizes email and rejects unchanged sample rows", async () => {
  const bytes = await workbookBytes([["Sample Teacher One", "TEACHER.ONE@EXAMPLE.COM", "+1 555 010 0001", "Teacher"]], [["TEACHER.ONE@EXAMPLE.COM", "2026-27", "3", "A", "SUBJECT_TEACHER", "EVS"]]);
  const parsed = await parseTeacherBulkWorkbook(bytes, "teachers.xlsx");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.teachers[0]?.fields.email, "teacher.one@example.com");
  const preview = validateTeacherBulkRows(parsed.teachers, parsed.assignments, context);
  assert.equal(preview.teachers[0]?.status, "ERROR");
  assert.ok(preview.teachers[0]?.messages.some((message) => /sample row/i.test(message)));
});

test("parser rejects malformed files, wrong extensions, missing sheets, extra sheets, and oversized input", async () => {
  assert.equal((await parseTeacherBulkWorkbook(new Uint8Array([1, 2, 3]), "teachers.csv")).ok, false);
  assert.equal((await parseTeacherBulkWorkbook(new Uint8Array([1, 2, 3]), "teachers.xlsx")).ok, false);
  const missing = new ExcelJS.Workbook(); missing.addWorksheet("Teachers");
  assert.equal((await parseTeacherBulkWorkbook(new Uint8Array(await missing.xlsx.writeBuffer()), "teachers.xlsx")).ok, false);
  const extra = new ExcelJS.Workbook(); ["Teachers", "Assignments", "Instructions", "Reference", "Technical"].forEach((name) => extra.addWorksheet(name));
  assert.equal((await parseTeacherBulkWorkbook(new Uint8Array(await extra.xlsx.writeBuffer()), "teachers.xlsx")).ok, false);
  assert.equal((await parseTeacherBulkWorkbook(new Uint8Array(TEACHER_BULK_MAX_FILE_BYTES + 1), "teachers.xlsx")).ok, false);
});

test("parser enforces canonical headers, warns on unknown headers, and enforces row limits", async () => {
  const missing = await parseTeacherBulkWorkbook(await workbookBytes([["Asha"]], [], TEACHER_BULK_TEACHER_COLUMNS.slice(0, 3).map((column) => column.header)), "teachers.xlsx");
  assert.equal(missing.ok, false);
  const headers = [...TEACHER_BULK_TEACHER_COLUMNS.map((column) => column.header), "Unexpected"];
  const result = await parseTeacherBulkWorkbook(await workbookBytes([["Asha", "asha@example.com", "", "", "ignored"]], [], headers), "teachers.xlsx");
  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.workbookWarnings.join(" "), /Unexpected/);
  const rows = Array.from({ length: TEACHER_BULK_MAX_ASSIGNMENT_ROWS + 1 }, () => ["asha@example.com", "2026-27", "3", "A", "CLASS_TEACHER", ""]);
  assert.equal((await parseTeacherBulkWorkbook(await workbookBytes([], rows), "teachers.xlsx")).ok, false);
});

test("teacher validation covers required fields, malformed email, phone, designation, formulas, and duplicate identity", () => {
  const invalid = validateTeacherBulkRows([teacher({ teacherName: "", email: "not-an-email", phone: "123" }, 2), teacher({ email: "not-an-email" }, 3)], [], context);
  assert.equal(invalid.teachers[0]?.status, "ERROR");
  assert.ok(invalid.teachers[0]?.messages.some((message) => /Teacher Name is required/i.test(message)));
  assert.ok(invalid.teachers[0]?.messages.some((message) => /Email is not valid/i.test(message)));
  assert.ok(invalid.teachers[0]?.messages.some((message) => /Phone is not valid/i.test(message)));
  assert.ok(invalid.teachers[1]?.messages.some((message) => /Duplicate Teacher Email/i.test(message)));
  const formula = validateTeacherBulkRows([{ ...teacher(), parseMessages: ["Teacher Name contains a formula. Use a literal value."] }], [], context);
  assert.equal(formula.teachers[0]?.status, "ERROR");
});

test("new Teachers and valid assignments are READY, while existing same-school identities are EXISTING", () => {
  const ready = validateTeacherBulkRows([teacher()], [assignment()], context);
  assert.equal(ready.teachers[0]?.status, "READY");
  assert.equal(ready.assignments[0]?.status, "READY");
  const existingContext: TeacherBulkValidationContext = {
    ...context,
    teachers: [{ id: "teacher-1", userId: "user-1", email: "asha@example.com", active: true, status: "APPROVED", eligible: true }],
    users: [{ email: "asha@example.com", teacherId: "teacher-1", teacherSchoolId: "school-1" }],
  };
  const existing = validateTeacherBulkRows([teacher()], [assignment()], existingContext);
  assert.equal(existing.teachers[0]?.status, "EXISTING");
  assert.equal(existing.assignments[0]?.status, "READY");
});

test("existing active assignments are EXISTING and historical inactive assignments do not block READY", () => {
  const existingContext: TeacherBulkValidationContext = {
    ...context,
    teachers: [{ id: "teacher-1", userId: "user-1", email: "asha@example.com", active: true, status: "APPROVED", eligible: true }],
    users: [{ email: "asha@example.com", teacherId: "teacher-1", teacherSchoolId: "school-1" }],
    assignments: [{ teacherId: "teacher-1", academicYearId: "year-1", schoolClassId: "class-3", sectionId: "section-a", subjectId: "subject-evs", type: "SUBJECT_TEACHER" }],
  };
  const existing = validateTeacherBulkRows([], [assignment()], existingContext);
  assert.equal(existing.assignments[0]?.status, "EXISTING");
  const historical = validateTeacherBulkRows([], [assignment()], { ...existingContext, assignments: [] });
  assert.equal(historical.assignments[0]?.status, "READY");
});

test("active assignment conflicts with a different Teacher are rejected before import", () => {
  const conflict = validateTeacherBulkRows([teacher()], [assignment()], {
    ...context,
    assignments: [{ teacherId: "another-teacher", academicYearId: "year-1", schoolClassId: "class-3", sectionId: "section-a", subjectId: "subject-evs", type: "SUBJECT_TEACHER" }],
  });
  assert.equal(conflict.assignments[0]?.status, "ERROR");
  assert.ok(conflict.assignments[0]?.messages.some((message) => /different Teacher/i.test(message)));
});

test("email collisions remain generic and unresolved assignment Teacher Email is rejected", () => {
  const collision = validateTeacherBulkRows([teacher({ email: "student@example.com" })], [], { ...context, users: [{ email: "student@example.com", teacherId: null, teacherSchoolId: null }] });
  assert.equal(collision.teachers[0]?.status, "ERROR");
  assert.ok(collision.teachers[0]?.messages.some((message) => /another account/i.test(message)));
  assert.doesNotMatch(collision.teachers[0]?.messages.join(" ") ?? "", /student|school|role|user id/i);
  const unresolved = validateTeacherBulkRows([], [assignment({ teacherEmail: "missing@example.com" })], context);
  assert.equal(unresolved.assignments[0]?.status, "ERROR");
  assert.ok(unresolved.assignments[0]?.messages.some((message) => /cannot be resolved/i.test(message)));
});

test("assignment validation enforces year, class, section, type, and subject rules", () => {
  assert.equal(validateTeacherBulkRows([], [assignment({ academicYear: "2099-00" })], context).assignments[0]?.status, "ERROR");
  assert.equal(validateTeacherBulkRows([], [assignment({ classCode: "4" })], context).assignments[0]?.status, "ERROR");
  assert.equal(validateTeacherBulkRows([], [assignment({ sectionCode: "B" })], context).assignments[0]?.status, "ERROR");
  assert.equal(validateTeacherBulkRows([], [assignment({ subjectCode: "" })], context).assignments[0]?.status, "ERROR");
  assert.equal(validateTeacherBulkRows([], [assignment({ assignmentType: "CLASS_TEACHER", subjectCode: "EVS" })], context).assignments[0]?.status, "ERROR");
  assert.equal(validateTeacherBulkRows([], [assignment({ assignmentType: "OTHER" })], context).assignments[0]?.status, "ERROR");
  assert.equal(validateTeacherBulkRows([], [assignment({ subjectCode: "SCIENCE" })], context).assignments[0]?.status, "ERROR");
  assert.equal(validateTeacherBulkRows([teacher()], [assignment({ assignmentType: "CLASS_TEACHER", subjectCode: "" })], context).assignments[0]?.status, "READY");
});

test("duplicate assignment rows are rejected and inactive teachers cannot receive assignments", () => {
  const duplicate = validateTeacherBulkRows([], [assignment({}, 2), assignment({}, 3)], context);
  assert.equal(duplicate.assignments[0]?.status, "ERROR");
  assert.equal(duplicate.assignments[1]?.status, "ERROR");
  const inactive = validateTeacherBulkRows([], [assignment()], { ...context, teachers: [{ id: "teacher-1", userId: "user-1", email: "asha@example.com", active: false, status: "SUSPENDED", eligible: false }] });
  assert.equal(inactive.assignments[0]?.status, "ERROR");
  assert.ok(inactive.assignments[0]?.messages.some((message) => /not currently eligible/i.test(message)));
});

test("validation route is bounded, server-scoped, and contains no write/import path", () => {
  const route = read("app/school-dashboard/teachers/bulk-upload/validate/route.ts");
  assert.match(route, /requireSchool\(\)/);
  assert.match(route, /findMany/);
  assert.doesNotMatch(route, /\.create\(|\.update\(|\.upsert\(|\$transaction|delete\(/);
  assert.doesNotMatch(route, /sendConfiguredMail|issueSchoolTeacherActivation|generateInitialPassword|hashPassword/);
});
