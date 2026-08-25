import ExcelJS from "exceljs";

import {
  STUDENT_BULK_COLUMNS,
  STUDENT_BULK_DATE_FORMAT,
  STUDENT_BULK_GENDER_VALUES,
  STUDENT_BULK_SYSTEM_GENERATED_FIELDS,
  type StudentBulkTemplateContext,
} from "@/lib/student-bulk-import-contract";

const BLUE = "FF1D4ED8";
const LIGHT_BLUE = "FFEFF6FF";
const BORDER = "FFD9E2EC";

export async function buildStudentBulkTemplate(context: StudentBulkTemplateContext) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bluegate";
  workbook.company = "Bluegate";
  workbook.created = new Date();
  workbook.modified = new Date();

  const students = workbook.addWorksheet("Students");
  students.views = [{ state: "frozen", ySplit: 1 }];
  students.columns = STUDENT_BULK_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: Math.max(16, Math.min(28, column.header.length + 8)),
  }));
  students.getRow(1).height = 32;
  students.getRow(1).eachCell((cell, columnNumber) => {
    const column = STUDENT_BULK_COLUMNS[columnNumber - 1];
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: column?.required ? BLUE : "FF64748B" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: BORDER } } };
  });

  students.addRows([
    {
      admissionNumber: "SAMPLE001",
      studentName: "Aarav Sharma",
      gender: "Male",
      dateOfBirth: "15-08-2017",
      guardianName: "Rajesh Sharma",
      guardianPhone: "9876543210",
      mobile: "9876500001",
      email: "aarav.sample@example.com",
      className: "Class 3",
      sectionName: "A",
      rollNumber: "1",
      academicYear: "2026-27",
      joinDate: "01-04-2026",
    },
    {
      admissionNumber: "SAMPLE002",
      studentName: "Ananya Verma",
      gender: "Female",
      dateOfBirth: "20-09-2017",
      guardianName: "Amit Verma",
      guardianPhone: "9876543211",
      mobile: "9876500002",
      email: "ananya.sample@example.com",
      className: "Class 3",
      sectionName: "A",
      rollNumber: "2",
      academicYear: "2026-27",
      joinDate: "01-04-2026",
    },
  ]);
  students.autoFilter = { from: "A1", to: "M3" };
  students.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
  students.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
  for (let rowNumber = 1; rowNumber <= 3; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= STUDENT_BULK_COLUMNS.length; columnNumber += 1) {
      const cell = students.getRow(rowNumber).getCell(columnNumber);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        bottom: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
    }
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.views = [{ state: "frozen", ySplit: 4 }];
  instructions.getColumn("A").width = 28;
  instructions.getColumn("B").width = 22;
  instructions.getColumn("C").width = 72;
  instructions.getColumn("D").width = 18;
  instructions.mergeCells("A1:D1");
  instructions.getCell("A1").value = "Bluegate Student Bulk Upload Template";
  instructions.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  instructions.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  instructions.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  instructions.getRow(1).height = 30;
  instructions.mergeCells("A2:D2");
  instructions.getCell("A2").value = "School: " + context.schoolName;
  instructions.getCell("A2").font = { bold: true, color: { argb: BLUE } };
  instructions.addRow(["How to use this template", "", "", ""]);
  instructions.addRows([
    ["1", "Do not rename column headings.", "", ""],
    ["2", "One row = one student.", "", ""],
    ["3", "Delete the sample rows before uploading real students.", "", ""],
    ["4", "Admission Number must be unique within this school.", "", ""],
    ["5", "Class and Section must already exist in the School Dashboard.", "", ""],
    ["6", "Unknown Class or Section values will be rejected during future validation.", "", ""],
    ["7", "Academic Year must already exist for this school.", "", ""],
    ["8", "Use only the documented Gender values: " + STUDENT_BULK_GENDER_VALUES.join(", ") + ".", "", ""],
    ["9", "Use the documented date format: " + STUDENT_BULK_DATE_FORMAT + ".", "", ""],
    ["10", "Email is not a password. Do not add a Password column.", "", ""],
    ["11", "Initial passwords will be generated automatically by Bluegate during the future import.", "", ""],
    ["12", "Passwords are stored securely and are not readable from the database.", "", ""],
    ["13", "Future import will validate the sheet before saving any records.", "", ""],
  ]);
  instructions.addRow(["", "", "", ""]);
  instructions.addRow(["Field contract", "Status", "Notes", ""]);
  for (const column of STUDENT_BULK_COLUMNS) {
    instructions.addRow([column.header, column.required ? "Required" : "Optional", column.description, ""]);
  }
  instructions.addRow(["System generated", "Generated by Bluegate", STUDENT_BULK_SYSTEM_GENERATED_FIELDS.join("; "), ""]);
  instructions.addRow(["Current school reference", "Reference", "See the Reference sheet for non-sensitive current school hierarchy values.", ""]);
  for (let rowNumber = 3; rowNumber <= instructions.rowCount; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 4; columnNumber += 1) {
      const cell = instructions.getRow(rowNumber).getCell(columnNumber);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
    }
  }
  instructions.getRow(3).font = { bold: true, color: { argb: BLUE } };
  const contractHeaderRow = 18;
  instructions.getRow(contractHeaderRow).font = { bold: true, color: { argb: "FFFFFFFF" } };
  instructions.getRow(contractHeaderRow).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  instructions.getRow(contractHeaderRow).alignment = { wrapText: true };
  instructions.getRow(contractHeaderRow).height = 24;
  instructions.getRow(3).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
  });

  const reference = workbook.addWorksheet("Reference");
  reference.views = [{ state: "frozen", ySplit: 1 }];
  reference.columns = [
    { header: "Academic Year", key: "academicYear", width: 22 },
    { header: "Current", key: "current", width: 14 },
    { header: "Class", key: "className", width: 24 },
    { header: "Section", key: "sectionName", width: 20 },
  ];
  reference.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  for (const schoolClass of context.classes) {
    for (const section of schoolClass.sections) {
      reference.addRow({
        academicYear: schoolClass.academicYearName,
        current: context.years.find((year) => year.name === schoolClass.academicYearName)?.current ? "Yes" : "No",
        className: schoolClass.name,
        sectionName: section.name,
      });
    }
  }
  if (reference.rowCount === 1) reference.addRow(["No active school hierarchy values available.", "", "", ""]);
  for (let rowNumber = 1; rowNumber <= reference.rowCount; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 4; columnNumber += 1) {
      reference.getRow(rowNumber).getCell(columnNumber).alignment = { vertical: "top", wrapText: true };
    }
  }

  return workbook;
}
