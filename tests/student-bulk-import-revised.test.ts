import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Prisma } from "@prisma/client";

import {
  type StudentBulkParsedRow,
  type StudentBulkPreview,
  type StudentBulkValidationContext,
} from "../lib/student-bulk-import";
import { importStudentBulkRows, type StudentBulkDatabase } from "../lib/student-bulk-import-write";

const years: StudentBulkValidationContext["years"] = [{
  id: "year-1", name: "2026-2027", active: true, current: true,
  classes: [{ id: "class-1", name: "Class 3", active: true, sections: [{ id: "section-a", name: "A", active: true }] }],
}];

function parsed(overrides: Partial<StudentBulkParsedRow["fields"]> = {}, excelRow = 2): StudentBulkParsedRow {
  return {
    excelRow,
    fields: {
      admissionNumber: "BG-001", studentName: "Asha Rao", gender: "Female", dateOfBirth: "",
      guardianName: "Ravi Rao", guardianPhone: "+919876543210", mobile: "", email: "",
      className: "Class 3", sectionName: "A", rollNumber: "", academicYear: "2026-2027", joinDate: "01-04-2026",
      ...overrides,
    },
    parseMessages: [],
  };
}

function previewFor(rows: StudentBulkParsedRow[], status: "READY" | "EXISTING" | "ERROR" = "READY"): StudentBulkPreview {
  return {
    ok: true,
    summary: {
      total: rows.length,
      ready: status === "READY" ? rows.length : 0,
      existing: status === "EXISTING" ? rows.length : 0,
      warnings: 0,
      errors: status === "ERROR" ? rows.length : 0,
    },
    rows: rows.map((row) => ({
      excelRow: row.excelRow,
      admissionNumber: row.fields.admissionNumber,
      studentName: row.fields.studentName,
      className: row.fields.className,
      sectionName: row.fields.sectionName,
      academicYear: row.fields.academicYear,
      status,
      messages: status === "ERROR" ? ["Invalid row."] : [],
    })),
    workbookWarnings: [],
    notice: "No students have been imported yet.",
  };
}

function fakeDatabase(options: { existing?: boolean; failEnrollment?: boolean; failAdmission?: string; raceAdmission?: string } = {}) {
  const calls = { transactions: 0, studentCreates: 0, enrollmentCreates: 0, createdEmail: null as string | null };
  const tx = {
    student: {
      findUnique: async () => options.existing ? { id: "existing-student" } : null,
      create: async ({ data }: { data: { email: string | null; admissionNumber: string } }) => {
        calls.studentCreates += 1;
        calls.createdEmail = data.email;
        if (options.raceAdmission === data.admissionNumber) {
          throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });
        }
        if (options.failAdmission === data.admissionNumber) throw new Error("student create failure");
        return { id: "student-" + data.admissionNumber };
      },
    },
    classSection: {
      findFirst: async () => ({ id: "section-a", schoolClassId: "class-1" }),
    },
    studentEnrollment: {
      findFirst: async () => null,
      create: async () => {
        calls.enrollmentCreates += 1;
        if (options.failEnrollment) throw new Error("enrollment failure");
        return { id: "enrollment-1" };
      },
    },
  } as unknown as Prisma.TransactionClient;
  const db = {
    $transaction: async <T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) => {
      calls.transactions += 1;
      return callback(tx);
    },
    student: { findUnique: async () => options.raceAdmission ? { id: "raced-student" } : null },
  } as unknown as StudentBulkDatabase;
  return { db, calls };
}

test("imports a Student without email, creates its Enrollment, and creates no User", async () => {
  const row = parsed();
  const { db, calls } = fakeDatabase();
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [row], preview: previewFor([row]), years, db });
  assert.equal(result.imported, 1);
  assert.equal(result.failed, 0);
  assert.equal(calls.studentCreates, 1);
  assert.equal(calls.enrollmentCreates, 1);
  assert.equal(calls.createdEmail, null);
});

test("preserves an optional Student email without creating an account", async () => {
  const row = parsed({ email: "asha@example.com" });
  const { db, calls } = fakeDatabase();
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [row], preview: previewFor([row]), years, db });
  assert.equal(result.imported, 1);
  assert.equal(calls.createdEmail, "asha@example.com");
});

test("skips existing students before creating Student or Enrollment", async () => {
  const row = parsed();
  const { db, calls } = fakeDatabase({ existing: true });
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [row], preview: previewFor([row], "EXISTING"), years, db });
  assert.equal(result.skipped, 1);
  assert.equal(calls.studentCreates, 0);
  assert.equal(calls.enrollmentCreates, 0);
});

test("revalidated errors and invalid hierarchy never reach writes", async () => {
  const invalid = parsed({ admissionNumber: "SAMPLE001" });
  const { db, calls } = fakeDatabase();
  const failed = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [invalid], preview: previewFor([invalid], "ERROR"), years, db });
  assert.equal(failed.failed, 1);
  assert.equal(calls.transactions, 0);
  const noHierarchy = parsed({ academicYear: "2099-2100" }, 3);
  const noHierarchyPreview = previewFor([noHierarchy]);
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [noHierarchy], preview: noHierarchyPreview, years, db });
  assert.equal(result.failed, 1);
  assert.equal(calls.transactions, 0);
});

test("each row is processed in its own transaction and one failure does not undo another", async () => {
  const first = parsed({ admissionNumber: "BG-001" }, 2);
  const second = parsed({ admissionNumber: "BG-002" }, 3);
  const { db, calls } = fakeDatabase({ failAdmission: "BG-002" });
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [first, second], preview: previewFor([first, second]), years, db });
  assert.equal(calls.transactions, 2);
  assert.equal(result.imported, 1);
  assert.equal(result.failed, 1);
});

test("a duplicate admission race is classified as skipped", async () => {
  const row = parsed();
  const { db } = fakeDatabase({ raceAdmission: "BG-001" });
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [row], preview: previewFor([row]), years, db });
  assert.equal(result.imported, 0);
  assert.equal(result.skipped, 1);
  assert.match(result.rows[0]?.message ?? "", /concurrently/);
});

test("confirm uses the workbook route, not browser preview rows, and creates no accounts or passwords", async () => {
  const route = await readFile("app/school-dashboard/students/bulk-upload/template/route.ts", "utf8");
  const writer = await readFile("lib/student-bulk-import-write.ts", "utf8");
  assert.match(route, /requireSchool\(\)/);
  assert.match(route, /mode === "import"/);
  assert.match(route, /parseStudentBulkWorkbook/);
  assert.match(route, /validateStudentBulkRows/);
  assert.match(route, /importStudentBulkRows/);
  assert.doesNotMatch(writer, /user\.(create|update|upsert)|generateInitialPassword|hashPassword|username/);
  assert.doesNotMatch(writer, /academicYear\.create|schoolClass\.create|classSection\.create/);
  assert.doesNotMatch(route, /schoolId.*formData|publisherId.*formData/);
  const client = await readFile("components/school/StudentBulkUploadClient.tsx", "utf8");
  assert.match(client, /window\.confirm/);
});

test("import processing is sequential and the existing activation path remains separate", async () => {
  const writer = await readFile("lib/student-bulk-import-write.ts", "utf8");
  const onboarding = await readFile("lib/onboarding.ts", "utf8");
  assert.match(writer, /for \(const parsed of parsedRows\)/);
  assert.doesNotMatch(writer, /Promise\.all/);
  assert.doesNotMatch(writer, /parsedRows\.map\(async/);
  assert.match(onboarding, /activateStudentAccount/);
  assert.match(onboarding, /studentActivationCode/);
});

test("import result exposes no password or internal identifiers", async () => {
  const row = parsed();
  const { db } = fakeDatabase();
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [row], preview: previewFor([row]), years, db });
  assert.equal(result.rows[0]?.status, "IMPORTED");
  assert.doesNotMatch(JSON.stringify(result), /password|userId|studentId|enrollmentId/i);
});

test("server-derived parsed fields win over tampered preview labels", async () => {
  const row = parsed();
  const tamperedPreview = previewFor([row]);
  tamperedPreview.rows[0]!.admissionNumber = "HACKED";
  tamperedPreview.rows[0]!.studentName = "Tampered Name";
  const { db } = fakeDatabase();
  const result = await importStudentBulkRows({ schoolId: "school-1", parsedRows: [row], preview: tamperedPreview, years, db });
  assert.equal(result.rows[0]?.admissionNumber, "BG-001");
  assert.equal(result.rows[0]?.studentName, "Asha Rao");
});
