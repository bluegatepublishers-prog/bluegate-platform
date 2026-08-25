export const STUDENT_BULK_DATE_FORMAT = "DD-MM-YYYY";

export const STUDENT_BULK_GENDER_VALUES = ["Male", "Female", "Other"] as const;

export const STUDENT_BULK_COLUMNS = [
  { key: "admissionNumber", header: "Admission Number", required: true, description: "Unique within this school." },
  { key: "studentName", header: "Student Name", required: true, description: "The student's full name." },
  { key: "gender", header: "Gender", required: false, description: "Use Male, Female, or Other." },
  { key: "dateOfBirth", header: "Date of Birth", required: false, description: "Use DD-MM-YYYY." },
  { key: "guardianName", header: "Guardian Name", required: false, description: "Primary guardian name." },
  { key: "guardianPhone", header: "Guardian Phone", required: true, description: "Required by the current student service." },
  { key: "mobile", header: "Mobile", required: false, description: "Student phone number, if available." },
  { key: "email", header: "Email", required: false, description: "Student email, if available." },
  { key: "className", header: "Class", required: true, description: "Must already exist for the school and academic year." },
  { key: "sectionName", header: "Section", required: true, description: "Must already exist for the selected class." },
  { key: "rollNumber", header: "Roll Number", required: false, description: "Optional active-enrollment roll number." },
  { key: "academicYear", header: "Academic Year", required: true, description: "Must already exist for the school." },
  { key: "joinDate", header: "Join Date", required: true, description: "Required by the current enrollment service; use DD-MM-YYYY." },
] as const;

export type StudentBulkImportField = (typeof STUDENT_BULK_COLUMNS)[number]["key"];

export type StudentBulkReferenceYear = {
  name: string;
  current: boolean;
};

export type StudentBulkReferenceClass = {
  name: string;
  academicYearName: string;
  sections: { name: string }[];
};

export type StudentBulkTemplateContext = {
  schoolName: string;
  years: StudentBulkReferenceYear[];
  classes: StudentBulkReferenceClass[];
};

export const STUDENT_BULK_SYSTEM_GENERATED_FIELDS = [
  "User account",
  "Initial password",
  "Password hash",
  "Student and enrollment database IDs",
] as const;
