import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import {
  INVALID_STUDENT_BULK_FILE_MESSAGE,
  parseStudentBulkWorkbook,
  STUDENT_BULK_MAX_FILE_BYTES,
  validateStudentBulkRows,
} from "@/lib/student-bulk-import";
import { buildStudentBulkTemplate } from "@/lib/student-bulk-template";
import { importStudentBulkRows } from "@/lib/student-bulk-import-write";

export async function GET() {
  const school = await requireSchool();
  const [years, classes] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId: school.id, active: true },
      select: { name: true, current: true },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    }),
    prisma.schoolClass.findMany({
      where: { schoolId: school.id, active: true, academicYear: { active: true } },
      select: {
        name: true,
        academicYear: { select: { name: true } },
        sections: {
          where: { active: true },
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  const workbook = await buildStudentBulkTemplate({
    schoolName: school.schoolName,
    years,
    classes: classes.map((schoolClass) => ({
      name: schoolClass.name,
      academicYearName: schoolClass.academicYear.name,
      sections: schoolClass.sections,
    })),
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="bluegate-student-bulk-upload-template.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  const school = await requireSchool();
  const formData = await request.formData();
  const mode = formData.get("mode") === "import" ? "import" : "preview";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size > STUDENT_BULK_MAX_FILE_BYTES) {
    return NextResponse.json({ ok: false, error: INVALID_STUDENT_BULK_FILE_MESSAGE }, { status: 400 });
  }

  const parsed = await parseStudentBulkWorkbook(new Uint8Array(await file.arrayBuffer()), file.name);
  if (!parsed.ok) return NextResponse.json(parsed, { status: 400 });

  const admissionNumbers = [...new Set(parsed.rows.map((row) => row.fields.admissionNumber).filter(Boolean))];
  const emails = [...new Set(parsed.rows.map((row) => row.fields.email).filter(Boolean))];
  const [years, students, users] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId: school.id },
      select: {
        id: true,
        name: true,
        active: true,
        current: true,
        classes: {
          select: {
            id: true,
            name: true,
            active: true,
            sections: { select: { id: true, name: true, active: true } },
          },
        },
      },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    }),
    admissionNumbers.length
      ? prisma.student.findMany({
          where: { schoolId: school.id, admissionNumber: { in: admissionNumbers } },
          select: { id: true, admissionNumber: true, userId: true, user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    emails.length
      ? prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true, student: { select: { id: true, schoolId: true } } },
        })
      : Promise.resolve([]),
  ]);

  const studentIds = students.map((student) => student.id);
  const enrollments = studentIds.length
    ? await prisma.studentEnrollment.findMany({
        where: { schoolId: school.id, studentId: { in: studentIds } },
        select: { studentId: true, academicYearId: true, schoolClassId: true, sectionId: true, status: true },
      })
    : [];
  const validationContext = {
    years,
    students: students.map((student) => ({
      id: student.id,
      admissionNumber: student.admissionNumber,
      userId: student.userId,
      userEmail: student.user?.email ?? null,
    })),
    users: users.map((user) => ({
      email: user.email,
      studentId: user.student?.id ?? null,
      studentSchoolId: user.student?.schoolId ?? null,
    })),
    enrollments,
  };
  const preview = validateStudentBulkRows(parsed.rows, validationContext);
  if (mode === "import") {
    return NextResponse.json(await importStudentBulkRows({
      schoolId: school.id,
      parsedRows: parsed.rows,
      preview,
      years,
    }));
  }
  preview.workbookWarnings.push(...parsed.workbookWarnings);
  preview.summary.warnings += parsed.workbookWarnings.length;
  return NextResponse.json(preview);
}
