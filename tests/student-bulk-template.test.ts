import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ExcelJS from "exceljs";

import {
  STUDENT_BULK_COLUMNS,
  STUDENT_BULK_DATE_FORMAT,
  STUDENT_BULK_GENDER_VALUES,
} from "../lib/student-bulk-import-contract";
import { buildStudentBulkTemplate } from "../lib/student-bulk-template";

const read = (path: string) => readFileSync(path, "utf8");

const context = {
  schoolName: "Sample School",
  years: [{ name: "2026-27", current: true }],
  classes: [{ name: "Class 3", academicYearName: "2026-27", sections: [{ name: "A" }] }],
};

async function loadWorkbook() {
  const workbook = await buildStudentBulkTemplate(context);
  const buffer = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  return loaded;
}

function sheetText(sheet: ExcelJS.Worksheet) {
  const values: string[] = [];
  sheet.eachRow((row) => row.eachCell((cell) => values.push(String(cell.value ?? ""))));
  return values.join(" ");
}

test("ExcelJS is the only spreadsheet dependency added", () => {
  const packageJson = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
  assert.equal(packageJson.dependencies.exceljs, "^4.4.0");
  const spreadsheetDependencies = Object.keys(packageJson.dependencies).filter((name) => /excel|xlsx|sheetjs|spreadsheet/i.test(name));
  assert.deepEqual(spreadsheetDependencies, ["exceljs"]);
  assert.match(read("package-lock.json"), /node_modules\/exceljs/);
});

test("generated workbook is valid and contains the canonical sheets and headers", async () => {
  const workbook = await loadWorkbook();
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Students", "Instructions", "Reference"]);
  const students = workbook.getWorksheet("Students");
  assert.ok(students);
  const headers = (students.getRow(1).values as unknown[]).slice(1);
  assert.deepEqual(headers, STUDENT_BULK_COLUMNS.map((column) => column.header));
  assert.equal(students.views[0]?.state, "frozen");
  assert.equal(students.views[0]?.ySplit, 1);
  assert.equal(students.getCell("A2").value, "SAMPLE001");
  assert.equal(students.getCell("A3").value, "SAMPLE002");
  assert.ok(headers.every((header) => !/password|initial password|temporary password/i.test(String(header))));
});

test("instructions document the contract, hierarchy rules, samples, and automatic credentials", async () => {
  const workbook = await loadWorkbook();
  const instructions = workbook.getWorksheet("Instructions");
  assert.ok(instructions);
  const text = sheetText(instructions);
  assert.match(text, /Delete the sample rows before uploading real students/i);
  assert.match(text, /Required/);
  assert.match(text, /Optional/);
  assert.match(text, /System generated/);
  for (const value of STUDENT_BULK_GENDER_VALUES) assert.match(text, new RegExp(value));
  assert.match(text, new RegExp(STUDENT_BULK_DATE_FORMAT));
  assert.match(text, /Class and Section must already exist/i);
  assert.match(text, /Academic Year must already exist/i);
  assert.match(text, /Admission Number must be unique within this school/i);
  assert.match(text, /Initial passwords will be generated automatically/i);
  assert.match(text, /Do not add a Password column/i);
});

test("template generation is read-only and does not invoke credential generation", () => {
  const route = read("app/school-dashboard/students/bulk-upload/template/route.ts");
  const generator = read("lib/student-bulk-template.ts");
  assert.match(route, /requireSchool\(\)/);
  assert.doesNotMatch(route, /student(?:Enrollment)?\.(?:create|update|delete|upsert)/);
  assert.doesNotMatch(generator, /generateInitialPassword|hashPassword|verifyPassword/);
  assert.match(read("lib/password.ts"), /generateInitialPassword/);
});

test("bulk-upload page and entry point stay school-scoped and expose validation-only preview", () => {
  const page = read("app/school-dashboard/students/bulk-upload/page.tsx");
  const students = read("app/school-dashboard/students/page.tsx");
  assert.match(page, /requireSchool\(\)/);
  assert.match(page, /Download Student Excel Template/);
  assert.match(page, /StudentBulkUploadClient/);
  assert.match(page, /confirm the import|Upload, review, and import/);
  assert.doesNotMatch(page, /type="file"|<form/);
  assert.match(students, /\/school-dashboard\/students\/bulk-upload/);
});
