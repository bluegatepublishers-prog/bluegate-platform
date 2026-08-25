import ExcelJS from "exceljs";

import type { StudentAccountActivationCredential } from "@/lib/student-account-activation";

const BLUE = "FF1D4ED8";
const LIGHT_BLUE = "FFEFF6FF";
const BORDER = "FFD9E2EC";

export async function buildStudentCredentialsWorkbook(credentials: StudentAccountActivationCredential[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bluegate";
  workbook.company = "Bluegate";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Student Credentials");
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [
    { header: "Admission Number", key: "admissionNumber", width: 22 },
    { header: "Student Name", key: "studentName", width: 28 },
    { header: "Class", key: "className", width: 20 },
    { header: "Section", key: "sectionName", width: 18 },
    { header: "Roll Number", key: "rollNumber", width: 18 },
    { header: "Login ID", key: "loginId", width: 22 },
    { header: "Initial Password", key: "initialPassword", width: 24 },
  ];
  sheet.autoFilter = { from: "A1", to: "G1" };
  sheet.getRow(1).height = 32;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: BORDER } } };
  });
  for (const credential of credentials) sheet.addRow({ ...credential, rollNumber: credential.rollNumber ?? "Not provided" });
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 7; columnNumber += 1) {
      const cell = sheet.getRow(rowNumber).getCell(columnNumber);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: BORDER } }, right: { style: "thin", color: { argb: BORDER } } };
    }
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.getColumn("A").width = 28;
  instructions.getColumn("B").width = 92;
  instructions.mergeCells("A1:B1");
  instructions.getCell("A1").value = "Bluegate Student Login Credentials";
  instructions.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  instructions.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  instructions.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  instructions.getRow(1).height = 30;
  instructions.addRow(["Important", "Keep this file secure and distribute each credential only to the intended student."]);
  instructions.addRows([
    ["Password handling", "Each password belongs to one student and is shown in this one-time credentials file only."],
    ["After login", "Students can change their password from Profile → Change Password."],
    ["Storage", "Passwords are not stored in readable form by Bluegate."],
    ["Delete", "Delete this credentials file after the credentials have been distributed securely."],
    ["Lost password", "If a password is lost, a School Admin can use Reset Password for that student."],
  ]);
  for (let rowNumber = 2; rowNumber <= instructions.rowCount; rowNumber += 1) {
    instructions.getRow(rowNumber).getCell(1).font = { bold: true, color: { argb: BLUE } };
    instructions.getRow(rowNumber).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
    for (let columnNumber = 1; columnNumber <= 2; columnNumber += 1) {
      const cell = instructions.getRow(rowNumber).getCell(columnNumber);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
    }
  }
  instructions.views = [{ state: "frozen", ySplit: 1 }];
  return workbook;
}
