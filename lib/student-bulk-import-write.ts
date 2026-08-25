import { EnrollmentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  findStudentBulkHierarchy,
  parseStudentBulkDate,
  type StudentBulkHierarchyYear,
  type StudentBulkParsedRow,
  type StudentBulkPreview,
  type StudentBulkImportResult,
} from "@/lib/student-bulk-import";

type ImportInput = {
  schoolId: string;
  parsedRows: StudentBulkParsedRow[];
  preview: StudentBulkPreview;
  years: StudentBulkHierarchyYear[];
  db?: StudentBulkDatabase;
};

export type StudentBulkDatabase = {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  student: Pick<Prisma.TransactionClient["student"], "findUnique">;
};

export async function importStudentBulkRows({
  schoolId,
  parsedRows,
  preview,
  years,
  db = prisma,
}: ImportInput): Promise<StudentBulkImportResult> {
  const previewByRow = new Map(preview.rows.map((row) => [row.excelRow, row]));
  const rows: StudentBulkImportResult["rows"] = [];

  for (const parsed of parsedRows) {
    const previewRow = previewByRow.get(parsed.excelRow);
    if (!previewRow) continue;
    const base = {
      excelRow: parsed.excelRow,
      admissionNumber: parsed.fields.admissionNumber,
      studentName: parsed.fields.studentName,
      className: parsed.fields.className,
      sectionName: parsed.fields.sectionName,
      academicYear: parsed.fields.academicYear,
    };

    if (previewRow.status === "EXISTING") {
      rows.push({ ...base, status: "SKIPPED", message: "Existing student skipped; no changes were made." });
      continue;
    }
    if (previewRow.status === "ERROR") {
      rows.push({ ...base, status: "FAILED", message: previewRow.messages.join(" ") });
      continue;
    }

    const hierarchy = findStudentBulkHierarchy(parsed.fields, years);
    if (!hierarchy) {
      rows.push({ ...base, status: "FAILED", message: "The Academic Year, Class, or Section is no longer active or valid." });
      continue;
    }

    try {
      const outcome = await db.$transaction(async (tx) => {
        const existing = await tx.student.findUnique({
          where: { schoolId_admissionNumber: { schoolId, admissionNumber: parsed.fields.admissionNumber } },
          select: { id: true },
        });
        if (existing) return { status: "SKIPPED" as const, message: "Student was created before confirmation and was skipped." };

        const section = await tx.classSection.findFirst({
          where: {
            id: hierarchy.section.id,
            active: true,
            schoolClass: {
              id: hierarchy.schoolClass.id,
              schoolId,
              active: true,
              academicYearId: hierarchy.year.id,
              academicYear: { id: hierarchy.year.id, schoolId, active: true },
            },
          },
          select: { id: true, schoolClassId: true },
        });
        if (!section) throw new Error("The hierarchy changed before this row could be imported.");

        if (parsed.fields.rollNumber) {
          const rollConflict = await tx.studentEnrollment.findFirst({
            where: {
              schoolId,
              sectionId: section.id,
              rollNumber: parsed.fields.rollNumber,
              status: EnrollmentStatus.ACTIVE,
            },
            select: { id: true },
          });
          if (rollConflict) throw new Error("The Roll Number is already active in this Section.");
        }

        const joinDate = parseStudentBulkDate(parsed.fields.joinDate);
        const dateOfBirth = parsed.fields.dateOfBirth ? parseStudentBulkDate(parsed.fields.dateOfBirth) : null;
        if (!joinDate || (parsed.fields.dateOfBirth && !dateOfBirth)) {
          throw new Error("The date value is no longer valid.");
        }
        const nameParts = parsed.fields.studentName.split(" ");
        const firstName = nameParts.shift() ?? parsed.fields.studentName;
        const lastName = nameParts.join(" ") || null;
        const student = await tx.student.create({
          data: {
            schoolId,
            admissionNumber: parsed.fields.admissionNumber,
            name: parsed.fields.studentName,
            firstName,
            lastName,
            displayName: null,
            gender: parsed.fields.gender || null,
            dateOfBirth,
            guardianName: parsed.fields.guardianName || null,
            guardianPhone: parsed.fields.guardianPhone,
            phone: parsed.fields.mobile || null,
            email: parsed.fields.email || null,
            joinDate,
            active: true,
          },
          select: { id: true },
        });
        await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            schoolId,
            academicYearId: hierarchy.year.id,
            schoolClassId: section.schoolClassId,
            sectionId: section.id,
            admissionNumber: parsed.fields.admissionNumber,
            activeSessionKey: student.id + ":" + hierarchy.year.id,
            rollNumber: parsed.fields.rollNumber || null,
            status: EnrollmentStatus.ACTIVE,
            joinedAt: joinDate,
          },
        });
        return { status: "IMPORTED" as const, message: "Student and enrollment imported." };
      });
      rows.push({ ...base, ...outcome });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const racedStudent = await db.student.findUnique({
          where: { schoolId_admissionNumber: { schoolId, admissionNumber: parsed.fields.admissionNumber } },
          select: { id: true },
        });
        if (racedStudent) {
          rows.push({ ...base, status: "SKIPPED", message: "Student was created concurrently and was skipped." });
          continue;
        }
      }
      rows.push({
        ...base,
        status: "FAILED",
        message: error instanceof Error ? error.message : "This row could not be imported.",
      });
    }
  }

  return {
    ok: true,
    total: rows.length,
    imported: rows.filter((row) => row.status === "IMPORTED").length,
    skipped: rows.filter((row) => row.status === "SKIPPED").length,
    failed: rows.filter((row) => row.status === "FAILED").length,
    rows,
    notice: "Student Import Complete",
  };
}
