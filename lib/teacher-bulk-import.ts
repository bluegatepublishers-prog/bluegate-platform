import ExcelJS from "exceljs";

import { normalizeEmail, validEmail } from "@/lib/onboarding-policy";
import {
  TEACHER_BULK_ASSIGNMENT_COLUMNS,
  TEACHER_BULK_FILE_MESSAGE,
  TEACHER_BULK_MAX_ASSIGNMENT_ROWS,
  TEACHER_BULK_MAX_FILE_BYTES,
  TEACHER_BULK_MAX_TEACHER_ROWS,
  TEACHER_BULK_SAMPLE_EMAILS,
  TEACHER_BULK_TEACHER_COLUMNS,
  type TeacherBulkAssignmentPreviewRow,
  type TeacherBulkAssignmentType,
  type TeacherBulkExistingTeacher,
  type TeacherBulkHierarchyYear,
  type TeacherBulkNormalizedAssignment,
  type TeacherBulkNormalizedTeacher,
  type TeacherBulkParsedAssignmentRow,
  type TeacherBulkParsedTeacherRow,
  type TeacherBulkPreview,
  type TeacherBulkPreviewStatus,
  type TeacherBulkValidationContext,
} from "@/lib/teacher-bulk-import-contract";

export async function parseTeacherBulkWorkbook(bytes: Uint8Array, fileName: string): Promise<
  { ok: true; teachers: TeacherBulkParsedTeacherRow[]; assignments: TeacherBulkParsedAssignmentRow[]; workbookWarnings: string[] } |
  { ok: false; error: string }
> {
  if (bytes.byteLength > TEACHER_BULK_MAX_FILE_BYTES || !fileName.toLowerCase().endsWith(".xlsx")) return { ok: false, error: TEACHER_BULK_FILE_MESSAGE };
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(bytes) as any);
  } catch {
    return { ok: false, error: TEACHER_BULK_FILE_MESSAGE };
  }
  if ((workbook as ExcelJS.Workbook & { vbaProject?: unknown }).vbaProject) return { ok: false, error: "Macro-enabled workbooks are not supported." };
  const expectedSheets = ["Teachers", "Assignments", "Instructions", "Reference"];
  const actualSheets = workbook.worksheets.map((sheet) => sheet.name);
  const missingSheets = expectedSheets.filter((sheet) => !actualSheets.includes(sheet));
  const extraSheets = actualSheets.filter((sheet) => !expectedSheets.includes(sheet));
  if (missingSheets.length) return { ok: false, error: "Missing required sheet(s): " + missingSheets.join(", ") + "." };
  if (extraSheets.length) return { ok: false, error: "Unexpected sheet(s): " + extraSheets.join(", ") + ". Use only Teachers, Assignments, Instructions, and Reference." };

  const workbookWarnings: string[] = [];
  const teacherHeaders = readHeaders(workbook.getWorksheet("Teachers")!, TEACHER_BULK_TEACHER_COLUMNS, workbookWarnings);
  const assignmentHeaders = readHeaders(workbook.getWorksheet("Assignments")!, TEACHER_BULK_ASSIGNMENT_COLUMNS, workbookWarnings);
  if (!teacherHeaders.ok) return teacherHeaders;
  if (!assignmentHeaders.ok) return assignmentHeaders;
  const teachers = readRows(workbook.getWorksheet("Teachers")!, TEACHER_BULK_TEACHER_COLUMNS, teacherHeaders.columns, TEACHER_BULK_MAX_TEACHER_ROWS, normalizeTeacherField);
  if (!teachers.ok) return teachers;
  const assignments = readRows(workbook.getWorksheet("Assignments")!, TEACHER_BULK_ASSIGNMENT_COLUMNS, assignmentHeaders.columns, TEACHER_BULK_MAX_ASSIGNMENT_ROWS, normalizeAssignmentField);
  if (!assignments.ok) return assignments;
  return { ok: true, teachers: teachers.rows as TeacherBulkParsedTeacherRow[], assignments: assignments.rows as TeacherBulkParsedAssignmentRow[], workbookWarnings };
}

export function validateTeacherBulkRows(
  parsedTeachers: TeacherBulkParsedTeacherRow[],
  parsedAssignments: TeacherBulkParsedAssignmentRow[],
  context: TeacherBulkValidationContext,
): TeacherBulkPreview {
  const teacherEmailRows = new Map<string, number[]>();
  for (const row of parsedTeachers) if (row.fields.email) teacherEmailRows.set(row.fields.email, [...(teacherEmailRows.get(row.fields.email) ?? []), row.excelRow]);
  const existingTeachers = new Map(context.teachers.map((teacher) => [normalizeEmail(teacher.email), teacher]));
  const existingUsers = new Map(context.users.map((user) => [normalizeEmail(user.email), user]));
  const teacherRows = parsedTeachers.map((parsed) => {
    const fields = parsed.fields;
    const errors = [...parsed.parseMessages];
    const messages: string[] = [];
    validateTeacherFields(fields, errors);
    if (isSampleEmail(fields.email)) errors.push("Delete the sample row before upload.");
    const duplicateRows = fields.email ? teacherEmailRows.get(fields.email) ?? [] : [];
    if (duplicateRows.length > 1) errors.push("Duplicate Teacher Email appears elsewhere in this file.");
    const existingTeacher = fields.email ? existingTeachers.get(fields.email) : undefined;
    const matchingUser = fields.email ? existingUsers.get(fields.email) : undefined;
    if (matchingUser && !existingTeacher) errors.push("This email is already in use by another account.");
    if (existingTeacher) messages.push("Existing Teacher found; profile fields will not be overwritten.");
    const status: TeacherBulkPreviewStatus = errors.length ? "ERROR" : existingTeacher ? "EXISTING" : messages.length ? "WARNING" : "READY";
    return { parsed, fields, errors, messages, existingTeacher, status };
  });
  const teacherPreviewRows = teacherRows.map(({ parsed, fields, errors, messages, status }) => ({
    excelRow: parsed.excelRow,
    teacherName: fields.teacherName,
    email: fields.email,
    phone: fields.phone,
    designation: fields.designation,
    status,
    messages: [...errors, ...messages],
  }));

  const uploadedTeacherRows = new Map<string, typeof teacherRows[number]>();
  for (const row of teacherRows) if (row.fields.email && row.status !== "ERROR") uploadedTeacherRows.set(row.fields.email, row);
  const assignmentKeys = new Map<string, number[]>();
  const assignmentRows = parsedAssignments.map((parsed) => {
    const fields = parsed.fields;
    const errors = [...parsed.parseMessages];
    const messages: string[] = [];
    if (isSampleEmail(fields.teacherEmail)) errors.push("Delete the sample row before upload.");
    validateAssignmentFields(fields, errors);
    const uploaded = fields.teacherEmail ? uploadedTeacherRows.get(fields.teacherEmail) : undefined;
    const existingTeacher = fields.teacherEmail ? existingTeachers.get(fields.teacherEmail) : undefined;
    const matchingUser = fields.teacherEmail ? existingUsers.get(fields.teacherEmail) : undefined;
    const teacher = uploaded?.existingTeacher ?? existingTeacher;
    if (fields.teacherEmail && !uploaded && !existingTeacher) {
      if (matchingUser) errors.push("Teacher Email cannot be resolved for this school.");
      else errors.push("Teacher Email cannot be resolved.");
    }
    if (teacher && !teacher.eligible) errors.push("This Teacher is not currently eligible for assignment management.");
    const hierarchy = resolveAssignmentHierarchy(fields, context.years, errors);
    const assignmentKey = makeAssignmentKey(fields, teacher?.id ?? fields.teacherEmail, hierarchy);
    if (assignmentKey) assignmentKeys.set(assignmentKey, [...(assignmentKeys.get(assignmentKey) ?? []), parsed.excelRow]);
    const existingAssignment = teacher && hierarchy
      ? context.assignments.find((assignment) => makeExistingAssignmentKey(assignment) === makeResolvedAssignmentKey(teacher.id, hierarchy))
      : undefined;
    const conflictingAssignment = hierarchy
      ? context.assignments.find((assignment) => (!teacher || assignment.teacherId !== teacher.id) && assignment.academicYearId === hierarchy.year.id && assignment.schoolClassId === hierarchy.schoolClass.id && assignment.sectionId === hierarchy.section.id && assignment.subjectId === (hierarchy.subject?.id ?? null) && assignment.type === hierarchy.type)
      : undefined;
    if (existingAssignment) messages.push("Matching active assignment already exists.");
    if (conflictingAssignment) errors.push("A different Teacher already has this active assignment.");
    return { parsed, fields, errors, messages, hierarchy, existingAssignment };
  });
  for (const row of assignmentRows) {
    const key = makeAssignmentKey(row.fields, row.fields.teacherEmail, row.hierarchy);
    if (key && (assignmentKeys.get(key)?.length ?? 0) > 1) row.errors.push("Duplicate logical assignment appears elsewhere in this file.");
  }
  const assignmentPreviewRows: TeacherBulkAssignmentPreviewRow[] = assignmentRows.map(({ parsed, fields, errors, messages, hierarchy, existingAssignment }) => {
    const allMessages = [...errors, ...messages];
    const status: TeacherBulkPreviewStatus = errors.length ? "ERROR" : existingAssignment ? "EXISTING" : messages.length ? "WARNING" : "READY";
    return {
      excelRow: parsed.excelRow,
      teacherEmail: fields.teacherEmail,
      academicYear: fields.academicYear,
      classCode: fields.classCode,
      className: hierarchy?.schoolClass?.name ?? "",
      sectionCode: fields.sectionCode,
      sectionName: hierarchy?.section?.name ?? "",
      assignmentType: hierarchy?.type ?? fields.assignmentType,
      subjectCode: fields.subjectCode,
      subjectName: hierarchy?.subject?.name ?? "",
      status,
      messages: allMessages,
    };
  });
  return {
    ok: true,
    teachers: teacherPreviewRows,
    assignments: assignmentPreviewRows,
    teacherSummary: {
      total: teacherPreviewRows.length,
      new: teacherPreviewRows.filter((row) => row.status === "READY").length,
      existing: teacherPreviewRows.filter((row) => row.status === "EXISTING").length,
      warnings: teacherPreviewRows.filter((row) => row.status === "WARNING").length,
      errors: teacherPreviewRows.filter((row) => row.status === "ERROR").length,
    },
    assignmentSummary: {
      total: assignmentPreviewRows.length,
      ready: assignmentPreviewRows.filter((row) => row.status === "READY").length,
      existing: assignmentPreviewRows.filter((row) => row.status === "EXISTING").length,
      warnings: assignmentPreviewRows.filter((row) => row.status === "WARNING").length,
      errors: assignmentPreviewRows.filter((row) => row.status === "ERROR").length,
    },
    workbookWarnings: [],
    notice: "Preview only. No Teacher, User, membership, assignment, challenge, password, or email was created.",
  };
}

function validateTeacherFields(fields: TeacherBulkNormalizedTeacher, errors: string[]) {
  if (!fields.teacherName) errors.push("Teacher Name is required.");
  if (!fields.email) errors.push("Email is required.");
  if (fields.teacherName.length > 120 || hasControlCharacters(fields.teacherName)) errors.push("Teacher Name must be 120 characters or fewer and contain readable characters.");
  if (fields.email && !validEmail(fields.email)) errors.push("Email is not valid.");
  if (fields.phone && !validPhone(fields.phone)) errors.push("Phone is not valid.");
  if (fields.designation.length > 80 || hasControlCharacters(fields.designation)) errors.push("Designation must be 80 characters or fewer and contain readable characters.");
}

function validateAssignmentFields(fields: TeacherBulkNormalizedAssignment, errors: string[]) {
  for (const column of TEACHER_BULK_ASSIGNMENT_COLUMNS.filter((item) => item.required)) if (!fields[column.key]) errors.push(column.header + " is required.");
  if (fields.teacherEmail && !validEmail(fields.teacherEmail)) errors.push("Teacher Email is not valid.");
  if (fields.assignmentType && !["SUBJECT_TEACHER", "CLASS_TEACHER"].includes(fields.assignmentType)) errors.push("Assignment Type must be SUBJECT_TEACHER or CLASS_TEACHER.");
  if (fields.assignmentType === "SUBJECT_TEACHER" && !fields.subjectCode) errors.push("Subject Code is required for SUBJECT_TEACHER.");
  if (fields.assignmentType === "CLASS_TEACHER" && fields.subjectCode) errors.push("Subject Code must be blank for CLASS_TEACHER.");
}

function resolveAssignmentHierarchy(fields: TeacherBulkNormalizedAssignment, years: TeacherBulkHierarchyYear[], errors: string[]) {
  if (!fields.academicYear || !fields.classCode || !fields.sectionCode || !fields.assignmentType) return null;
  const year = years.find((candidate) => sameKey(candidate.name, fields.academicYear));
  if (!year) { errors.push("Academic Year is unknown for this school."); return null; }
  if (!year.active) { errors.push("Academic Year is inactive."); return null; }
  const schoolClass = year.classes.find((candidate) => sameKey(candidate.code, fields.classCode));
  if (!schoolClass) { errors.push("Class Code does not belong to the selected Academic Year."); return null; }
  if (!schoolClass.active) { errors.push("Class is inactive."); return null; }
  const section = schoolClass.sections.find((candidate) => sameKey(candidate.code, fields.sectionCode));
  if (!section) { errors.push("Section Code does not belong to the selected Class."); return null; }
  if (!section.active) { errors.push("Section is inactive."); return null; }
  const type = fields.assignmentType as TeacherBulkAssignmentType;
  if (type === "CLASS_TEACHER") return { type, year, schoolClass, section, subject: null, teacher: "" };
  const sectionSubject = section.subjects.find((candidate) => candidate.active && sameKey(candidate.subject.code, fields.subjectCode));
  if (!sectionSubject) { errors.push("Subject Code must belong to an active SectionSubject for the selected Section."); return null; }
  return { type, year, schoolClass, section, subject: sectionSubject.subject, teacher: "" };
}

function makeAssignmentKey(fields: TeacherBulkNormalizedAssignment, teacher: TeacherBulkExistingTeacher | string | undefined, hierarchy: ReturnType<typeof resolveAssignmentHierarchy>) {
  const teacherKey = typeof teacher === "string" ? teacher : teacher?.id;
  if (!teacherKey || !hierarchy) return null;
  return [teacherKey, hierarchy.year.id, hierarchy.schoolClass.id, hierarchy.section.id, hierarchy.subject?.id ?? "", hierarchy.type].join("|");
}

function makeResolvedAssignmentKey(teacherId: string, hierarchy: NonNullable<ReturnType<typeof resolveAssignmentHierarchy>>) {
  return [teacherId, hierarchy.year.id, hierarchy.schoolClass.id, hierarchy.section.id, hierarchy.subject?.id ?? "", hierarchy.type].join("|");
}

function makeExistingAssignmentKey(assignment: TeacherBulkValidationContext["assignments"][number]) {
  return [assignment.teacherId, assignment.academicYearId, assignment.schoolClassId, assignment.sectionId, assignment.subjectId ?? "", assignment.type].join("|");
}

function readHeaders<T extends ReadonlyArray<{ key: string; header: string; required: boolean }>>(sheet: ExcelJS.Worksheet, contract: T, warnings: string[]) {
  const columns = new Map<string, number>();
  const duplicateHeaders: string[] = [];
  for (let columnNumber = 1; columnNumber <= sheet.getRow(1).cellCount; columnNumber += 1) {
    const header = literalText(sheet.getRow(1).getCell(columnNumber).value).trim();
    if (!header) continue;
    const column = contract.find((candidate) => candidate.header === header);
    if (!column) { warnings.push('Column "' + header + '" is not part of the Teacher contract and will be ignored.'); continue; }
    if (columns.has(column.key)) duplicateHeaders.push(header);
    columns.set(column.key, columnNumber);
  }
  if (duplicateHeaders.length) return { ok: false as const, error: "The workbook contains duplicate headers: " + duplicateHeaders.join(", ") + "." };
  const missing = contract.filter((column) => !columns.has(column.key)).map((column) => column.header);
  if (missing.length) return { ok: false as const, error: "Missing required header(s): " + missing.join(", ") + "." };
  return { ok: true as const, columns };
}

function readRows<T extends ReadonlyArray<{ key: string; header: string; required: boolean }>, Fields extends Record<string, string>>(
  sheet: ExcelJS.Worksheet,
  contract: T,
  headers: Map<string, number>,
  maxRows: number,
  normalizer: (field: string, value: unknown) => string,
): { ok: true; rows: Array<{ excelRow: number; fields: Fields; parseMessages: string[] }> } | { ok: false; error: string } {
  const rows: Array<{ excelRow: number; fields: Fields; parseMessages: string[] }> = [];
  let nonEmptyRows = 0;
  let exceeded = false;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1 || rowIsEmpty(row)) return;
    nonEmptyRows += 1;
    if (nonEmptyRows > maxRows) { exceeded = true; return; }
    const fields = {} as Fields;
    const parseMessages: string[] = [];
    for (const column of contract) {
      const columnNumber = headers.get(column.key);
      if (!columnNumber) { (fields as Record<string, string>)[column.key] = ""; continue; }
      const value = row.getCell(columnNumber).value;
      if (isFormulaValue(value)) parseMessages.push(column.header + " contains a formula. Use a literal value.");
      (fields as Record<string, string>)[column.key] = isFormulaValue(value) ? "" : normalizer(column.key, value);
    }
    rows.push({ excelRow: rowNumber, fields, parseMessages });
  });
  return exceeded ? { ok: false, error: "This file exceeds the maximum of " + maxRows + " rows for this sheet." } : { ok: true, rows };
}

function normalizeTeacherField(field: string, value: unknown) {
  const text = literalText(value).trim().replace(/\s+/g, " ");
  if (field === "email") return normalizeEmail(text);
  if (field === "phone") return normalizePhone(text);
  return text;
}

function normalizeAssignmentField(field: string, value: unknown) {
  const text = literalText(value).trim().replace(/\s+/g, " ");
  if (field === "teacherEmail") return normalizeEmail(text);
  if (field === "assignmentType") return text.toUpperCase();
  return text;
}

function literalText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "richText" in value) return ((value as { richText?: Array<{ text?: string }> }).richText ?? []).map((item) => item.text ?? "").join("");
  return "";
}

function isFormulaValue(value: unknown): value is { formula: string; result?: unknown } { return Boolean(value && typeof value === "object" && "formula" in value); }
function rowIsEmpty(row: ExcelJS.Row) { for (let columnNumber = 1; columnNumber <= row.cellCount; columnNumber += 1) if (literalText(row.getCell(columnNumber).value).trim()) return false; return true; }
function hasControlCharacters(value: string) { return /[\u0000-\u001f]/.test(value); }
function normalizePhone(value: string) { const compact = value.replace(/\s+/g, "").slice(0, 30); if (!compact) return ""; const cleaned = compact.replace(/[^\d+]/g, ""); if (!cleaned) return ""; return cleaned.startsWith("+") ? "+" + cleaned.slice(1).replace(/\+/g, "") : cleaned.replace(/\+/g, ""); }
function validPhone(value: string) { return /^\+?\d{7,15}$/.test(value); }
function sameKey(left: string, right: string) { return left.trim().toLowerCase().replace(/\s+/g, " ") === right.trim().toLowerCase().replace(/\s+/g, " "); }
function isSampleEmail(email: string) { return (TEACHER_BULK_SAMPLE_EMAILS as readonly string[]).includes(email); }
