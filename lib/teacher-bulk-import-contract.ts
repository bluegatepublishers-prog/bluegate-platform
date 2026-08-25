export const TEACHER_BULK_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const TEACHER_BULK_MAX_TEACHER_ROWS = 1000;
export const TEACHER_BULK_MAX_ASSIGNMENT_ROWS = 5000;
export const TEACHER_BULK_FILE_MESSAGE = "Please upload a valid Bluegate Teacher Excel template (.xlsx).";

export const TEACHER_BULK_SAMPLE_EMAILS = [
  "teacher.one@example.com",
  "teacher.two@example.com",
] as const;

export const TEACHER_BULK_TEACHER_COLUMNS = [
  { key: "teacherName", header: "Teacher Name", required: true, description: "The teacher's full name." },
  { key: "email", header: "Email", required: true, description: "Required unique Teacher identity." },
  { key: "phone", header: "Phone", required: false, description: "Optional phone number." },
  { key: "designation", header: "Designation", required: false, description: "Optional designation; the existing default is used later if blank." },
] as const;

export const TEACHER_BULK_ASSIGNMENT_COLUMNS = [
  { key: "teacherEmail", header: "Teacher Email", required: true, description: "Must resolve to an uploaded or existing same-school Teacher." },
  { key: "academicYear", header: "Academic Year", required: true, description: "Must be an active Academic Year belonging to this school." },
  { key: "classCode", header: "Class Code", required: true, description: "Must belong to the selected Academic Year." },
  { key: "sectionCode", header: "Section Code", required: true, description: "Must belong to the selected Class." },
  { key: "assignmentType", header: "Assignment Type", required: true, description: "SUBJECT_TEACHER or CLASS_TEACHER." },
  { key: "subjectCode", header: "Subject Code", required: false, description: "Required for SUBJECT_TEACHER and blank for CLASS_TEACHER." },
] as const;

export type TeacherBulkTeacherField = (typeof TEACHER_BULK_TEACHER_COLUMNS)[number]["key"];
export type TeacherBulkAssignmentField = (typeof TEACHER_BULK_ASSIGNMENT_COLUMNS)[number]["key"];
export type TeacherBulkPreviewStatus = "READY" | "EXISTING" | "WARNING" | "ERROR";
export type TeacherBulkAssignmentType = "SUBJECT_TEACHER" | "CLASS_TEACHER";

export type TeacherBulkTemplateSection = {
  code: string;
  name: string;
  subjects: Array<{ code: string; name: string }>;
};

export type TeacherBulkTemplateClass = {
  code: string;
  name: string;
  academicYearName: string;
  sections: TeacherBulkTemplateSection[];
};

export type TeacherBulkTemplateContext = {
  schoolName: string;
  years: Array<{ name: string; current: boolean }>;
  classes: TeacherBulkTemplateClass[];
};

export type TeacherBulkHierarchySubject = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export type TeacherBulkHierarchySection = {
  id: string;
  schoolClassId: string;
  code: string;
  name: string;
  active: boolean;
  subjects: Array<{ id: string; subjectId: string; active: boolean; subject: TeacherBulkHierarchySubject }>;
};

export type TeacherBulkHierarchyClass = {
  id: string;
  academicYearId: string;
  code: string;
  name: string;
  active: boolean;
  sections: TeacherBulkHierarchySection[];
};

export type TeacherBulkHierarchyYear = {
  id: string;
  name: string;
  active: boolean;
  current: boolean;
  classes: TeacherBulkHierarchyClass[];
};

export type TeacherBulkExistingTeacher = {
  id: string;
  userId: string;
  email: string;
  active: boolean;
  status: string;
  eligible: boolean;
};

export type TeacherBulkExistingUser = {
  email: string;
  teacherId: string | null;
  teacherSchoolId: string | null;
};

export type TeacherBulkExistingAssignment = {
  teacherId: string;
  academicYearId: string;
  schoolClassId: string;
  sectionId: string;
  subjectId: string | null;
  type: TeacherBulkAssignmentType;
};

export type TeacherBulkValidationContext = {
  years: TeacherBulkHierarchyYear[];
  teachers: TeacherBulkExistingTeacher[];
  users: TeacherBulkExistingUser[];
  assignments: TeacherBulkExistingAssignment[];
};

export type TeacherBulkNormalizedTeacher = Record<TeacherBulkTeacherField, string>;
export type TeacherBulkNormalizedAssignment = Record<TeacherBulkAssignmentField, string>;

export type TeacherBulkParsedTeacherRow = {
  excelRow: number;
  fields: TeacherBulkNormalizedTeacher;
  parseMessages: string[];
};

export type TeacherBulkParsedAssignmentRow = {
  excelRow: number;
  fields: TeacherBulkNormalizedAssignment;
  parseMessages: string[];
};

export type TeacherBulkTeacherPreviewRow = {
  excelRow: number;
  teacherName: string;
  email: string;
  phone: string;
  designation: string;
  status: TeacherBulkPreviewStatus;
  messages: string[];
};

export type TeacherBulkAssignmentPreviewRow = {
  excelRow: number;
  teacherEmail: string;
  academicYear: string;
  classCode: string;
  className: string;
  sectionCode: string;
  sectionName: string;
  assignmentType: string;
  subjectCode: string;
  subjectName: string;
  status: TeacherBulkPreviewStatus;
  messages: string[];
};

export type TeacherBulkPreview = {
  ok: true;
  teachers: TeacherBulkTeacherPreviewRow[];
  assignments: TeacherBulkAssignmentPreviewRow[];
  teacherSummary: { total: number; new: number; existing: number; warnings: number; errors: number };
  assignmentSummary: { total: number; ready: number; existing: number; warnings: number; errors: number };
  workbookWarnings: string[];
  notice: "Preview only. No Teacher, User, membership, assignment, challenge, password, or email was created.";
};

export type TeacherBulkFileError = { ok: false; error: string };
