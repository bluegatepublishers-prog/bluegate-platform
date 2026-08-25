import ExcelJS from "exceljs";

import {
  TEACHER_BULK_ASSIGNMENT_COLUMNS,
  TEACHER_BULK_SAMPLE_EMAILS,
  TEACHER_BULK_TEACHER_COLUMNS,
  type TeacherBulkTemplateContext,
} from "@/lib/teacher-bulk-import-contract";

const BLUE = "FF1D4ED8";
const SLATE = "FF64748B";
const LIGHT_BLUE = "FFEFF6FF";
const SAMPLE = "FFFFFBEB";
const BORDER = "FFD9E2EC";

export async function buildTeacherBulkTemplate(context: TeacherBulkTemplateContext) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bluegate";
  workbook.company = "Bluegate";
  workbook.created = new Date();
  workbook.modified = new Date();

  const teachers = workbook.addWorksheet("Teachers");
  styleTableSheet(teachers, TEACHER_BULK_TEACHER_COLUMNS.map((column) => ({ header: column.header, key: column.key, width: column.key === "teacherName" ? 28 : column.key === "email" ? 34 : 22 })));
  teachers.addRows([
    { teacherName: "Sample Teacher One", email: TEACHER_BULK_SAMPLE_EMAILS[0], phone: "+15550100001", designation: "Class Teacher" },
    { teacherName: "Sample Teacher Two", email: TEACHER_BULK_SAMPLE_EMAILS[1], phone: "+15550100002", designation: "Subject Teacher" },
  ]);
  finishTable(teachers, TEACHER_BULK_TEACHER_COLUMNS.length, 3, true);

  const assignments = workbook.addWorksheet("Assignments");
  styleTableSheet(assignments, TEACHER_BULK_ASSIGNMENT_COLUMNS.map((column) => ({ header: column.header, key: column.key, width: column.key === "teacherEmail" ? 34 : column.key === "assignmentType" ? 22 : 20 })));
  const samples = buildAssignmentSamples(context);
  assignments.addRows(samples);
  finishTable(assignments, TEACHER_BULK_ASSIGNMENT_COLUMNS.length, samples.length + 1, true);
  for (let rowNumber = 2; rowNumber <= 4; rowNumber += 1) {
    assignments.getCell(rowNumber, 5).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["\"SUBJECT_TEACHER,CLASS_TEACHER\""],
    };
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.views = [{ state: "frozen", ySplit: 4 }];
  instructions.getColumn("A").width = 28;
  instructions.getColumn("B").width = 20;
  instructions.getColumn("C").width = 82;
  instructions.mergeCells("A1:C1");
  instructions.getCell("A1").value = "Bluegate Teacher Bulk Upload Template";
  instructions.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  instructions.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  instructions.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  instructions.getRow(1).height = 30;
  instructions.mergeCells("A2:C2");
  instructions.getCell("A2").value = "School: " + context.schoolName;
  instructions.getCell("A2").font = { bold: true, color: { argb: BLUE } };
  instructions.addRow(["How to use this template", "", ""]);
  instructions.addRows([
    ["1", "Delete sample rows", "DELETE SAMPLE ROWS BEFORE UPLOAD."],
    ["2", "Teachers", "Teacher Name and Email are required. Phone and Designation are optional."],
    ["3", "Identity", "Email uniquely identifies a Teacher account. Use the same Teacher Email in Assignments. Do not repeat a Teacher in Teachers."],
    ["4", "Assignments", "One Teacher may have multiple assignment rows. SUBJECT_TEACHER requires Subject Code. CLASS_TEACHER must leave Subject Code blank."],
    ["5", "Account", "No password should be entered. After a future confirmed import, the Teacher receives a secure activation email and chooses a password."],
    ["6", "Security", "Never put passwords in this workbook. Do not add database IDs, usernames, school IDs, or publisher IDs."],
    ["7", "Import", "This phase is preview only. Validation happens before any future import. Existing Teacher profile fields are not overwritten."],
    ["8", "Reference", "Reference contains only authorized hierarchy values for the authenticated school."],
  ]);
  instructions.addRow(["", "", ""]);
  instructions.addRow(["Field contract", "Status", "Notes"]);
  for (const column of TEACHER_BULK_TEACHER_COLUMNS) instructions.addRow(["Teachers / " + column.header, column.required ? "Required" : "Optional", column.description]);
  for (const column of TEACHER_BULK_ASSIGNMENT_COLUMNS) instructions.addRow(["Assignments / " + column.header, column.required ? "Required" : "Conditional / optional", column.description]);
  for (let rowNumber = 3; rowNumber <= instructions.rowCount; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 3; columnNumber += 1) {
      const cell = instructions.getRow(rowNumber).getCell(columnNumber);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
    }
  }
  instructions.getRow(3).font = { bold: true, color: { argb: BLUE } };
  instructions.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
  const contractHeader = 13;
  instructions.getRow(contractHeader).font = { bold: true, color: { argb: "FFFFFFFF" } };
  instructions.getRow(contractHeader).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };

  const reference = workbook.addWorksheet("Reference");
  styleTableSheet(reference, [
    { header: "Academic Year", key: "academicYear", width: 22 },
    { header: "Class Code", key: "classCode", width: 16 },
    { header: "Class Name", key: "className", width: 24 },
    { header: "Section Code", key: "sectionCode", width: 18 },
    { header: "Section Name", key: "sectionName", width: 22 },
    { header: "Subject Code", key: "subjectCode", width: 18 },
    { header: "Subject Name", key: "subjectName", width: 28 },
  ]);
  for (const schoolClass of context.classes) {
    for (const section of schoolClass.sections) {
      if (!section.subjects.length) {
        reference.addRow({ academicYear: schoolClass.academicYearName, classCode: schoolClass.code, className: schoolClass.name, sectionCode: section.code, sectionName: section.name, subjectCode: "", subjectName: "" });
        continue;
      }
      for (const subject of section.subjects) reference.addRow({ academicYear: schoolClass.academicYearName, classCode: schoolClass.code, className: schoolClass.name, sectionCode: section.code, sectionName: section.name, subjectCode: subject.code, subjectName: subject.name });
    }
  }
  if (reference.rowCount === 1) reference.addRow(["No active school hierarchy values available.", "", "", "", "", "", ""]);
  finishTable(reference, 7, reference.rowCount, false);

  return workbook;
}

function styleTableSheet(sheet: ExcelJS.Worksheet, columns: Array<{ header: string; key: string; width: number }>) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = columns;
  sheet.getRow(1).height = 32;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: BORDER } } };
  });
  sheet.autoFilter = { from: "A1", to: String.fromCharCode(64 + columns.length) + "1" };
}

function finishTable(sheet: ExcelJS.Worksheet, columnCount: number, lastRow: number, sampleRows: boolean) {
  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      const cell = sheet.getRow(rowNumber).getCell(columnNumber);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: BORDER } }, right: { style: "thin", color: { argb: BORDER } } };
      if (sampleRows && rowNumber > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SAMPLE } };
    }
  }
}

function buildAssignmentSamples(context: TeacherBulkTemplateContext) {
  const rows: Array<Record<string, string>> = [];
  const firstYear = context.years[0]?.name ?? "2026-27";
  const firstClasses = context.classes.filter((item) => item.academicYearName === firstYear);
  const firstClass = firstClasses[0];
  const firstSubject = firstClass?.sections.flatMap((section) => section.subjects)[0];
  const firstSection = firstClass?.sections[0];
  const secondSection = firstClass?.sections[1];
  if (firstClass && firstSection && firstSubject) {
    rows.push({ teacherEmail: TEACHER_BULK_SAMPLE_EMAILS[0], academicYear: firstYear, classCode: firstClass.code, sectionCode: firstSection.code, assignmentType: "SUBJECT_TEACHER", subjectCode: firstSubject.code });
    rows.push({ teacherEmail: TEACHER_BULK_SAMPLE_EMAILS[0], academicYear: firstYear, classCode: firstClass.code, sectionCode: secondSection?.code ?? firstSection.code, assignmentType: "SUBJECT_TEACHER", subjectCode: firstSubject.code });
  } else {
    rows.push({ teacherEmail: TEACHER_BULK_SAMPLE_EMAILS[0], academicYear: "2026-27", classCode: "3", sectionCode: "A", assignmentType: "SUBJECT_TEACHER", subjectCode: "EVS" });
    rows.push({ teacherEmail: TEACHER_BULK_SAMPLE_EMAILS[0], academicYear: "2026-27", classCode: "3", sectionCode: "B", assignmentType: "SUBJECT_TEACHER", subjectCode: "EVS" });
  }
  const secondClass = firstClasses[1] ?? context.classes[1];
  const secondClassSection = secondClass?.sections[0];
  rows.push({ teacherEmail: TEACHER_BULK_SAMPLE_EMAILS[1], academicYear: secondClass?.academicYearName ?? firstYear, classCode: secondClass?.code ?? "4", sectionCode: secondClassSection?.code ?? "A", assignmentType: "CLASS_TEACHER", subjectCode: "" });
  return rows;
}
