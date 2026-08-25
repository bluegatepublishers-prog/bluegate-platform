import ExcelJS from "exceljs";

import {
  normalizeAdmissionNumber,
  normalizeEmail,
  validEmail,
} from "@/lib/onboarding-policy";
import {
  STUDENT_BULK_COLUMNS,
  STUDENT_BULK_DATE_FORMAT,
  STUDENT_BULK_GENDER_VALUES,
  type StudentBulkImportField,
} from "@/lib/student-bulk-import-contract";

export const STUDENT_BULK_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const STUDENT_BULK_MAX_ROWS = 5000;
export const INVALID_STUDENT_BULK_FILE_MESSAGE = "Please upload a valid Bluegate Student Excel template (.xlsx).";

export type StudentBulkNormalizedFields = Record<StudentBulkImportField, string>;
export type StudentBulkParsedRow = {
  excelRow: number;
  fields: StudentBulkNormalizedFields;
  parseMessages: string[];
};

export type StudentBulkHierarchyYear = {
  id: string;
  name: string;
  active: boolean;
  current: boolean;
  classes: StudentBulkHierarchyClass[];
};
export type StudentBulkHierarchyClass = {
  id: string;
  name: string;
  active: boolean;
  sections: StudentBulkHierarchySection[];
};
export type StudentBulkHierarchySection = { id: string; name: string; active: boolean };
export type StudentBulkExistingStudent = {
  id: string;
  admissionNumber: string;
  userId: string | null;
  userEmail: string | null;
};
export type StudentBulkExistingUser = {
  email: string | null;
  studentId: string | null;
  studentSchoolId: string | null;
};
export type StudentBulkExistingEnrollment = {
  studentId: string;
  academicYearId: string;
  schoolClassId: string;
  sectionId: string;
  status: string;
};
export type StudentBulkValidationContext = {
  years: StudentBulkHierarchyYear[];
  students: StudentBulkExistingStudent[];
  users: StudentBulkExistingUser[];
  enrollments: StudentBulkExistingEnrollment[];
};

export type StudentBulkPreviewStatus = "READY" | "WARNING" | "ERROR" | "EXISTING";
export type StudentBulkPreviewRow = {
  excelRow: number;
  admissionNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  academicYear: string;
  status: StudentBulkPreviewStatus;
  messages: string[];
};
export type StudentBulkPreview = {
  ok: true;
  summary: { total: number; ready: number; existing: number; warnings: number; errors: number };
  rows: StudentBulkPreviewRow[];
  workbookWarnings: string[];
  notice: "No students have been imported yet.";
};
export type StudentBulkFileError = { ok: false; error: string };
export type StudentBulkImportRowStatus = "IMPORTED" | "SKIPPED" | "FAILED";
export type StudentBulkImportRow = {
  excelRow: number;
  admissionNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  academicYear: string;
  status: StudentBulkImportRowStatus;
  message: string;
};
export type StudentBulkImportResult = {
  ok: true;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  rows: StudentBulkImportRow[];
  notice: "Student Import Complete";
};

const EMPTY_FIELDS: StudentBulkNormalizedFields = {
  admissionNumber: "",
  studentName: "",
  gender: "",
  dateOfBirth: "",
  guardianName: "",
  guardianPhone: "",
  mobile: "",
  email: "",
  className: "",
  sectionName: "",
  rollNumber: "",
  academicYear: "",
  joinDate: "",
};

export async function parseStudentBulkWorkbook(
  bytes: Uint8Array,
  fileName: string,
): Promise<{ ok: true; rows: StudentBulkParsedRow[]; workbookWarnings: string[] } | StudentBulkFileError> {
  if (bytes.byteLength > STUDENT_BULK_MAX_FILE_BYTES || !fileName.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: INVALID_STUDENT_BULK_FILE_MESSAGE };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(bytes) as any);
  } catch {
    return { ok: false, error: INVALID_STUDENT_BULK_FILE_MESSAGE };
  }
  const students = workbook.getWorksheet("Students");
  if (!students) return { ok: false, error: "The workbook must contain a Students sheet." };

  const headerRow = students.getRow(1);
  const headerMap = new Map<StudentBulkImportField, number>();
  const workbookWarnings: string[] = [];
  const duplicateHeaders: string[] = [];
  for (let columnNumber = 1; columnNumber <= headerRow.cellCount; columnNumber += 1) {
    const header = literalText(headerRow.getCell(columnNumber).value);
    if (!header) continue;
    const column = STUDENT_BULK_COLUMNS.find((candidate) => candidate.header === header);
    if (!column) {
      workbookWarnings.push('Column "' + header + '" is not part of the Student contract and will be ignored.');
      continue;
    }
    if (headerMap.has(column.key)) duplicateHeaders.push(header);
    headerMap.set(column.key, columnNumber);
  }
  if (duplicateHeaders.length) {
    return { ok: false, error: "The workbook contains duplicate headers: " + duplicateHeaders.join(", ") + "." };
  }
  const missingHeaders = STUDENT_BULK_COLUMNS
    .filter((column) => column.required && !headerMap.has(column.key))
    .map((column) => column.header);
  if (missingHeaders.length) {
    return { ok: false, error: "Missing required header(s): " + missingHeaders.join(", ") + "." };
  }

  const rows: StudentBulkParsedRow[] = [];
  let nonEmptyRowCount = 0;
  let exceededRowLimit = false;
  students.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1 || rowIsEmpty(row)) return;
    nonEmptyRowCount += 1;
    if (nonEmptyRowCount > STUDENT_BULK_MAX_ROWS) {
      exceededRowLimit = true;
      return;
    }
    const fields = { ...EMPTY_FIELDS };
    const parseMessages: string[] = [];
    for (const column of STUDENT_BULK_COLUMNS) {
      const columnNumber = headerMap.get(column.key);
      if (!columnNumber) continue;
      const cell = row.getCell(columnNumber);
      if (isFormulaValue(cell.value)) {
        parseMessages.push(column.header + " contains a formula. Use a literal value.");
        continue;
      }
      fields[column.key] = column.key === "dateOfBirth" || column.key === "joinDate"
        ? normalizeDateValue(cell.value)
        : normalizeFieldText(column.key, cell.value);
    }
    rows.push({ excelRow: rowNumber, fields, parseMessages });
  });
  if (exceededRowLimit) return { ok: false, error: "This file exceeds the maximum of " + STUDENT_BULK_MAX_ROWS + " student rows." };
  return { ok: true, rows, workbookWarnings };
}

export function validateStudentBulkRows(
  parsedRows: StudentBulkParsedRow[],
  context: StudentBulkValidationContext,
): StudentBulkPreview {
  const admissionRows = new Map<string, number[]>();
  for (const row of parsedRows) {
    const admissionNumber = row.fields.admissionNumber;
    if (!admissionNumber) continue;
    admissionRows.set(admissionNumber, [...(admissionRows.get(admissionNumber) ?? []), row.excelRow]);
  }
  const rows = parsedRows.map((parsed) => {
    const fields = parsed.fields;
    const errors = [...parsed.parseMessages];
    const messages: string[] = [];
    validateRequiredFields(fields, errors);
    validateFieldValues(fields, errors);
    if (/^SAMPLE\d+$/i.test(fields.admissionNumber)) errors.push("Delete the sample row before importing.");
    const hierarchy = resolveHierarchy(fields, context.years, errors, messages);
    return { parsed, fields, errors, messages, hierarchy };
  }).map(({ parsed, fields, errors, messages, hierarchy }) => {
    const duplicateRows = fields.admissionNumber ? admissionRows.get(fields.admissionNumber) ?? [] : [];
    if (duplicateRows.length > 1) errors.push("Duplicate Admission Number appears elsewhere in this file.");
    return { parsed, fields, errors, messages, hierarchy };
  });
  const previewRows = rows.map(({ parsed, fields, errors, messages, hierarchy }) => {
    const existing = context.students.find((student) => normalizeAdmissionNumber(student.admissionNumber) === fields.admissionNumber);
    const matchingUser = fields.email ? context.users.find((user) => normalizeEmail(user.email) === fields.email) : undefined;
    if (matchingUser && (!existing || matchingUser.studentId !== existing.id)) errors.push("This email is already linked to another account.");
    if (existing) {
      messages.push("Existing student found; no changes will be made in this phase.");
      const activeEnrollment = context.enrollments.filter((enrollment) => enrollment.studentId === existing.id && enrollment.status === "ACTIVE");
      if (hierarchy && activeEnrollment.some((enrollment) =>
        enrollment.academicYearId === hierarchy.year.id &&
        enrollment.schoolClassId === hierarchy.schoolClass.id &&
        enrollment.sectionId === hierarchy.section.id
      )) messages.push("Already enrolled in this Academic Year, Class, and Section.");
      else if (hierarchy && activeEnrollment.some((enrollment) => enrollment.academicYearId === hierarchy.year.id)) messages.push("Existing active enrollment differs; no move will be performed.");
    }
    const status: StudentBulkPreviewStatus = errors.length ? "ERROR" : existing ? "EXISTING" : messages.length ? "WARNING" : "READY";
    return {
      excelRow: parsed.excelRow,
      admissionNumber: fields.admissionNumber,
      studentName: fields.studentName,
      className: fields.className,
      sectionName: fields.sectionName,
      academicYear: fields.academicYear,
      status,
      messages: [...errors, ...messages],
    };
  });
  return {
    ok: true,
    summary: {
      total: previewRows.length,
      ready: previewRows.filter((row) => row.status === "READY").length,
      existing: previewRows.filter((row) => row.status === "EXISTING").length,
      warnings: previewRows.filter((row) => row.status === "WARNING").length,
      errors: previewRows.filter((row) => row.status === "ERROR").length,
    },
    rows: previewRows,
    workbookWarnings: [],
    notice: "No students have been imported yet.",
  };
}

function validateRequiredFields(fields: StudentBulkNormalizedFields, errors: string[]) {
  for (const column of STUDENT_BULK_COLUMNS.filter((candidate) => candidate.required)) {
    if (!fields[column.key]) errors.push(column.header + " is required.");
  }
}

function validateFieldValues(fields: StudentBulkNormalizedFields, errors: string[]) {
  if (fields.admissionNumber && (fields.admissionNumber.length > 50 || /[\u0000-\u001f]/.test(fields.admissionNumber))) {
    errors.push("Admission Number must be 50 characters or fewer and contain readable characters.");
  }
  if (fields.studentName && fields.studentName.length > 120) errors.push("Student Name must be 120 characters or fewer.");
  if (fields.gender && !STUDENT_BULK_GENDER_VALUES.includes(fields.gender as (typeof STUDENT_BULK_GENDER_VALUES)[number])) errors.push("Gender must be Male, Female, or Other.");
  if (fields.dateOfBirth) {
    const date = parseCanonicalDate(fields.dateOfBirth);
    if (!date) errors.push("Date of Birth must use " + STUDENT_BULK_DATE_FORMAT + " and be a real date.");
    else if (date > startOfToday()) errors.push("Date of Birth cannot be in the future.");
  }
  if (fields.guardianPhone && !validPhone(fields.guardianPhone)) errors.push("Guardian Phone is not valid.");
  if (fields.mobile && !validPhone(fields.mobile)) errors.push("Mobile is not valid.");
  if (fields.email && !validEmail(fields.email)) errors.push("Email is not valid.");
  if (fields.guardianName && fields.guardianName.length > 120) errors.push("Guardian Name must be 120 characters or fewer.");
  if (fields.rollNumber && fields.rollNumber.length > 30) errors.push("Roll Number must be 30 characters or fewer.");
  if (fields.joinDate && !parseCanonicalDate(fields.joinDate)) errors.push("Join Date must use " + STUDENT_BULK_DATE_FORMAT + " and be a real date.");
}

function resolveHierarchy(fields: StudentBulkNormalizedFields, years: StudentBulkHierarchyYear[], errors: string[], messages: string[]) {
  if (!fields.academicYear || !fields.className || !fields.sectionName) return null;
  const year = years.find((candidate) => normalizeYear(candidate.name) === normalizeYear(fields.academicYear));
  if (!year) {
    errors.push('Academic Year "' + fields.academicYear + '" does not exist.');
    return null;
  }
  if (!year.active) errors.push('Academic Year "' + year.name + '" is inactive.');
  const schoolClass = year.classes.find((candidate) => normalizeHierarchy(candidate.name) === normalizeHierarchy(fields.className));
  if (!schoolClass) {
    errors.push('Class "' + fields.className + '" does not exist in Academic Year ' + year.name + ".");
    return null;
  }
  if (!schoolClass.active) errors.push('Class "' + schoolClass.name + '" is inactive.');
  const section = schoolClass.sections.find((candidate) => normalizeSection(candidate.name) === normalizeSection(fields.sectionName));
  if (!section) {
    errors.push('Section "' + fields.sectionName + '" does not exist for Class ' + schoolClass.name + ".");
    return null;
  }
  if (!section.active) errors.push('Section "' + section.name + '" is inactive.');
  return { year, schoolClass, section };
}

export function findStudentBulkHierarchy(
  fields: StudentBulkNormalizedFields,
  years: StudentBulkHierarchyYear[],
) {
  if (!fields.academicYear || !fields.className || !fields.sectionName) return null;
  const year = years.find((candidate) => normalizeYear(candidate.name) === normalizeYear(fields.academicYear));
  if (!year) return null;
  const schoolClass = year.classes.find((candidate) => normalizeHierarchy(candidate.name) === normalizeHierarchy(fields.className));
  if (!schoolClass) return null;
  const section = schoolClass.sections.find((candidate) => normalizeSection(candidate.name) === normalizeSection(fields.sectionName));
  return section ? { year, schoolClass, section } : null;
}

export function parseStudentBulkDate(value: string) {
  return parseCanonicalDate(value);
}

function normalizeFieldText(field: StudentBulkImportField, value: unknown) {
  const text = literalText(value).trim().replace(/\s+/g, " ");
  if (field === "admissionNumber") return normalizeAdmissionNumber(text);
  if (field === "email") return normalizeEmail(text);
  if (field === "gender") return text ? text[0].toUpperCase() + text.slice(1).toLowerCase() : "";
  if (field === "guardianPhone" || field === "mobile") return normalizePhone(text);
  return text;
}

function normalizeDateValue(value: unknown) {
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatDate(new Date(Date.UTC(1899, 11, 30) + value * 86_400_000));
  }
  return literalText(value).trim();
}

function literalText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "object" && value && "richText" in value) {
    const richText = (value as { richText?: Array<{ text?: string }> }).richText ?? [];
    return richText.map((item) => item.text ?? "").join("");
  }
  return "";
}

function isFormulaValue(value: unknown): value is { formula: string; result?: unknown } {
  return Boolean(value && typeof value === "object" && "formula" in value);
}

function rowIsEmpty(row: ExcelJS.Row) {
  for (let columnNumber = 1; columnNumber <= row.cellCount; columnNumber += 1) {
    if (row.getCell(columnNumber).value != null && literalText(row.getCell(columnNumber).value).trim()) return false;
  }
  return true;
}

function formatDate(value: Date) {
  if (Number.isNaN(value.valueOf())) return "";
  return String(value.getUTCDate()).padStart(2, "0") + "-" +
    String(value.getUTCMonth() + 1).padStart(2, "0") + "-" +
    value.getUTCFullYear();
}

function parseCanonicalDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  return date.getUTCFullYear() === Number(match[3]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[1])
    ? date
    : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function normalizePhone(value: string) {
  const compact = value.replace(/\s+/g, "").slice(0, 30);
  if (!compact) return "";
  const cleaned = compact.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    const rest = cleaned.slice(1).replace(/\+/g, "");
    return rest ? "+" + rest : "";
  }
  return cleaned.replace(/\+/g, "");
}

function validPhone(value: string) {
  return /^\+?\d{7,15}$/.test(value);
}

function normalizeYear(value: string) {
  return value.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
}

function normalizeHierarchy(value: string) {
  return value.trim().toLowerCase().replace(/\b(class|grade|standard|std)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

function normalizeSection(value: string) {
  return value.trim().toLowerCase().replace(/^section\s+/i, "").replace(/[^a-z0-9]+/g, "");
}
