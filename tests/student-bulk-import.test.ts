import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ExcelJS from "exceljs";

import {
  parseStudentBulkWorkbook,
  STUDENT_BULK_MAX_FILE_BYTES,
  STUDENT_BULK_MAX_ROWS,
  validateStudentBulkRows,
  type StudentBulkParsedRow,
  type StudentBulkValidationContext,
} from "../lib/student-bulk-import";
import { STUDENT_BULK_COLUMNS } from "../lib/student-bulk-import-contract";
import { buildStudentBulkTemplate } from "../lib/student-bulk-template";

const hierarchy: StudentBulkValidationContext = {
  years: [{
    id: "year-1", name: "2026-2027", active: true, current: true,
    classes: [{ id: "class-1", name: "Class 3", active: true, sections: [{ id: "section-a", name: "A", active: true }] }],
  }],
  students: [], users: [], enrollments: [],
};

function fields(overrides: Partial<StudentBulkParsedRow["fields"]> = {}) {
  return {
    admissionNumber: "BG-001", studentName: "Asha Rao", gender: "Female", dateOfBirth: "01-01-2017",
    guardianName: "Ravi Rao", guardianPhone: "+919876543210", mobile: "", email: "asha@example.com",
    className: "Class 3", sectionName: "A", rollNumber: "1", academicYear: "2026-2027", joinDate: "01-04-2026",
    ...overrides,
  };
}

function parsed(overrides: Partial<StudentBulkParsedRow["fields"]> = {}, excelRow = 2): StudentBulkParsedRow {
  return { excelRow, fields: fields(overrides), parseMessages: [] };
}

async function workbookBytes(rows: unknown[][], headers: string[] = STUDENT_BULK_COLUMNS.map((column) => column.header)) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

test("parses the canonical 3D-1A workbook and flags sample rows", async () => {
  const workbook = await buildStudentBulkTemplate({
    schoolName: "Bluegate School",
    years: [{ name: "2026-2027", current: true }],
    classes: [{ name: "Class 3", academicYearName: "2026-2027", sections: [{ name: "A" }] }],
  });
  const parsedWorkbook = await parseStudentBulkWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer()), "students.xlsx");
  assert.equal(parsedWorkbook.ok, true);
  if (!parsedWorkbook.ok) return;
  const preview = validateStudentBulkRows(parsedWorkbook.rows, hierarchy);
  assert.equal(preview.summary.total, 2);
  assert.equal(preview.summary.errors, 2);
  assert.ok(preview.rows.every((row) => row.messages.includes("Delete the sample row before importing.")));
});

test("rejects invalid file type, malformed workbook, missing Students sheet, and oversized input", async () => {
  assert.equal((await parseStudentBulkWorkbook(new Uint8Array([1, 2, 3]), "students.csv")).ok, false);
  assert.equal((await parseStudentBulkWorkbook(new Uint8Array([1, 2, 3]), "students.xlsx")).ok, false);
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Instructions");
  assert.equal((await parseStudentBulkWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer()), "students.xlsx")).ok, false);
  assert.equal((await parseStudentBulkWorkbook(new Uint8Array(STUDENT_BULK_MAX_FILE_BYTES + 1), "students.xlsx")).ok, false);
});

test("enforces required headers and ignores unknown headers with a warning", async () => {
  const requiredHeaders = STUDENT_BULK_COLUMNS.filter((column) => column.required).map((column) => column.header);
  const missing = await parseStudentBulkWorkbook(await workbookBytes([["BG-001"]], requiredHeaders.slice(0, -1)), "students.xlsx");
  assert.equal(missing.ok, false);
  const headers = [...STUDENT_BULK_COLUMNS.map((column) => column.header), "Unexpected Column"];
  const result = await parseStudentBulkWorkbook(await workbookBytes([[...Object.values(fields()), "ignored"]], headers), "students.xlsx");
  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.workbookWarnings[0] ?? "", /Unexpected Column/);
});

test("ignores empty rows and enforces the row bound", async () => {
  const result = await parseStudentBulkWorkbook(await workbookBytes([[], Object.values(fields()), []]), "students.xlsx");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.rows.length, 1);
  const tooMany = Array.from({ length: STUDENT_BULK_MAX_ROWS + 1 }, (_, index) => Object.values(fields({ admissionNumber: "BG-" + index })));
  assert.equal((await parseStudentBulkWorkbook(await workbookBytes(tooMany), "students.xlsx")).ok, false);
});

test("validates required values, sample rows, dates, gender, email, phone, and formulas", () => {
  const invalid = validateStudentBulkRows([parsed({
    admissionNumber: "", studentName: "", gender: "Unknown", dateOfBirth: "31-02-2017",
    guardianPhone: "123", email: "not-an-email", joinDate: "2026/04/01",
  })], hierarchy);
  assert.equal(invalid.rows[0]?.status, "ERROR");
  assert.ok(invalid.rows[0]?.messages.some((message) => message.includes("Admission Number is required.")));
  assert.ok(invalid.rows[0]?.messages.some((message) => message.includes("Gender must be")));
  assert.ok(invalid.rows[0]?.messages.some((message) => message.includes("Guardian Phone is not valid.")));
  assert.ok(invalid.rows[0]?.messages.some((message) => message.includes("Email is not valid.")));
  assert.ok(invalid.rows[0]?.messages.some((message) => message.includes("Join Date must use")));
  assert.equal(validateStudentBulkRows([parsed({ admissionNumber: "SAMPLE001" })], hierarchy).rows[0]?.status, "ERROR");
  const formula: StudentBulkParsedRow = { ...parsed(), parseMessages: ["Student Name contains a formula. Use a literal value."] };
  assert.equal(validateStudentBulkRows([formula], hierarchy).rows[0]?.status, "ERROR");
});

test("validates hierarchy existence and active state", () => {
  const missing = validateStudentBulkRows([parsed({ academicYear: "2099-2100" })], hierarchy);
  assert.equal(missing.rows[0]?.status, "ERROR");
  assert.ok(missing.rows[0]?.messages.some((message) => message.includes("does not exist")));
  const inactive: StudentBulkValidationContext = {
    ...hierarchy,
    years: [{
      ...hierarchy.years[0],
      active: false,
      classes: [{ ...hierarchy.years[0].classes[0], active: false, sections: [{ id: "section-a", name: "A", active: false }] }],
    }],
  };
  const result = validateStudentBulkRows([parsed()], inactive);
  assert.equal(result.rows[0]?.status, "ERROR");
  assert.ok(result.rows[0]?.messages.some((message) => message.includes("inactive")));
});

test("detects in-file duplicates, existing students, enrollments, and email collisions", () => {
  const context: StudentBulkValidationContext = {
    ...hierarchy,
    students: [{ id: "student-1", admissionNumber: "BG-001", userId: "user-1", userEmail: "asha@example.com" }],
    users: [
      { email: "asha@example.com", studentId: "student-1", studentSchoolId: "school-1" },
      { email: "other@example.com", studentId: "student-2", studentSchoolId: "school-1" },
    ],
    enrollments: [{ studentId: "student-1", academicYearId: "year-1", schoolClassId: "class-1", sectionId: "section-a", status: "ACTIVE" }],
  };
  const preview = validateStudentBulkRows([
    parsed({ email: "asha@example.com" }, 2),
    parsed({ email: "other@example.com" }, 3),
  ], context);
  assert.equal(preview.rows[0]?.status, "ERROR");
  assert.ok(preview.rows[0]?.messages.some((message) => message.includes("Duplicate Admission Number")));
  assert.ok(preview.rows[0]?.messages.some((message) => message.includes("Already enrolled")));
  assert.ok(preview.rows[1]?.messages.some((message) => message.includes("email is already linked")));
  assert.ok(preview.rows.every((row) => !("id" in row)));
});

test("the route is authenticated, read-only, bounded, and never creates passwords or imports", async () => {
  const route = await readFile("app/school-dashboard/students/bulk-upload/template/route.ts", "utf8");
  assert.match(route, /requireSchool\(\)/);
  assert.match(route, /STUDENT_BULK_MAX_FILE_BYTES/);
  assert.match(route, /findMany/);
  assert.doesNotMatch(route, /\.create\(|\.update\(|\.upsert\(|\$transaction|delete\(/);
  assert.doesNotMatch(route, /generateInitialPassword|hashPassword|createUser|createStudent/);
  const client = await readFile("components/school/StudentBulkUploadClient.tsx", "utf8");
  assert.doesNotMatch(client, /Import Students|Import now|importStudents/i);
});

test("shares the 3D-1A canonical contract and does not change the password helper", async () => {
  const contract = await readFile("lib/student-bulk-import-contract.ts", "utf8");
  const password = await readFile("lib/password.ts", "utf8");
  assert.equal(STUDENT_BULK_COLUMNS.length, 13);
  assert.match(contract, /Admission Number/);
  assert.match(password, /generateInitialPassword/);
});
