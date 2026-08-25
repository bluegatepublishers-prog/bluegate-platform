import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ExcelJS from "exceljs";

import { TEACHER_BULK_ASSIGNMENT_COLUMNS, TEACHER_BULK_SAMPLE_EMAILS, TEACHER_BULK_TEACHER_COLUMNS } from "../lib/teacher-bulk-import-contract";
import { buildTeacherBulkTemplate } from "../lib/teacher-bulk-template";

const read = (path: string) => readFileSync(path, "utf8");
const context = {
  schoolName: "Sample School",
  years: [{ name: "2026-27", current: true }],
  classes: [{
    code: "3", name: "Class 3", academicYearName: "2026-27",
    sections: [
      { code: "A", name: "Section A", subjects: [{ code: "EVS", name: "Environmental Studies" }] },
      { code: "B", name: "Section B", subjects: [{ code: "EVS", name: "Environmental Studies" }] },
    ],
  }],
};

async function loadWorkbook() {
  const workbook = await buildTeacherBulkTemplate(context);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  return loaded;
}

function sheetText(sheet: ExcelJS.Worksheet) {
  const values: string[] = [];
  sheet.eachRow((row) => row.eachCell((cell) => values.push(String(cell.value ?? ""))));
  return values.join(" ");
}

test("Teacher template is a valid four-sheet workbook with canonical headers", async () => {
  const workbook = await loadWorkbook();
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Teachers", "Assignments", "Instructions", "Reference"]);
  assert.deepEqual((workbook.getWorksheet("Teachers")!.getRow(1).values as unknown[]).slice(1), TEACHER_BULK_TEACHER_COLUMNS.map((column) => column.header));
  assert.deepEqual((workbook.getWorksheet("Assignments")!.getRow(1).values as unknown[]).slice(1), TEACHER_BULK_ASSIGNMENT_COLUMNS.map((column) => column.header));
  assert.equal(workbook.getWorksheet("Teachers")!.views[0]?.state, "frozen");
  assert.equal((workbook.getWorksheet("Assignments")!.views[0] as { ySplit?: number }).ySplit, 1);
});

test("template contains fictitious samples, multiple assignments, and explicit instructions", async () => {
  const workbook = await loadWorkbook();
  const teachers = workbook.getWorksheet("Teachers")!;
  const assignments = workbook.getWorksheet("Assignments")!;
  assert.equal(teachers.getCell("B2").value, TEACHER_BULK_SAMPLE_EMAILS[0]);
  assert.equal(teachers.getCell("B3").value, TEACHER_BULK_SAMPLE_EMAILS[1]);
  assert.equal(assignments.rowCount, 4);
  assert.equal(assignments.getCell("A2").value, TEACHER_BULK_SAMPLE_EMAILS[0]);
  assert.equal(assignments.getCell("A3").value, TEACHER_BULK_SAMPLE_EMAILS[0]);
  assert.equal(assignments.getCell("E4").value, "CLASS_TEACHER");
  assert.equal(assignments.getCell("F4").value, "");
  const instructions = sheetText(workbook.getWorksheet("Instructions")!);
  assert.match(instructions, /DELETE SAMPLE ROWS BEFORE UPLOAD/i);
  assert.match(instructions, /no password/i);
  assert.match(instructions, /activation email/i);
  assert.match(instructions, /preview only/i);
});

test("Reference contains authorized display values only and no database identifiers", async () => {
  const workbook = await loadWorkbook();
  const reference = workbook.getWorksheet("Reference")!;
  const headers = (reference.getRow(1).values as unknown[]).slice(1).map(String);
  assert.deepEqual(headers, ["Academic Year", "Class Code", "Class Name", "Section Code", "Section Name", "Subject Code", "Subject Name"]);
  assert.match(String(reference.getCell("A2").value), /2026-27/);
  assert.match(String(reference.getCell("F2").value), /EVS/);
  assert.doesNotMatch(sheetText(reference), /schoolId|publisherId|teacherId|userId|cuid/i);
});

test("template and validation entry points are school-scoped, with import requiring explicit mode", () => {
  const templateRoute = read("app/school-dashboard/teachers/bulk-upload/template/route.ts");
  const validationRoute = read("app/school-dashboard/teachers/bulk-upload/validate/route.ts");
  const page = read("app/school-dashboard/teachers/bulk-upload/page.tsx");
  const client = read("components/school/TeacherBulkUploadClient.tsx");
  assert.match(templateRoute, /requireSchool\(\)/);
  assert.match(validationRoute, /requireSchool\(\)/);
  assert.doesNotMatch(templateRoute + validationRoute, /\.create\(|\.update\(|\.upsert\(|\$transaction|delete\(/);
  assert.doesNotMatch(templateRoute + validationRoute, /generateInitialPassword|hashPassword|sendConfiguredMail|issueSchoolTeacherActivation/);
  assert.match(page, /TeacherBulkUploadClient/);
  assert.match(page, /explicitly import|explicit import action/);
  assert.doesNotMatch(page, /validation-only preview|future import|This phase never creates/);
  assert.match(client, /Import Teachers & Assignments/);
  assert.match(client, /window\.confirm/);
});

test("Teacher page exposes the protected Bulk Upload entry point", () => {
  const page = read("app/school-dashboard/teachers/page.tsx");
  assert.match(page, /\/school-dashboard\/teachers\/bulk-upload/);
  assert.match(page, /Bulk Upload/);
});
