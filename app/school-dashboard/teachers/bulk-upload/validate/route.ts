import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { parseTeacherBulkWorkbook, validateTeacherBulkRows } from "@/lib/teacher-bulk-import";
import { TEACHER_BULK_FILE_MESSAGE, TEACHER_BULK_MAX_FILE_BYTES } from "@/lib/teacher-bulk-import-contract";
import { importTeacherBulkWorkbook } from "@/lib/teacher-bulk-import-write";

export async function POST(request: Request) {
  const school = await requireSchool();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size > TEACHER_BULK_MAX_FILE_BYTES) return NextResponse.json({ ok: false, error: TEACHER_BULK_FILE_MESSAGE }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (formData.get("mode") === "import") {
    const result = await importTeacherBulkWorkbook({ school: { id: school.id, schoolName: school.schoolName, publisherId: school.publisherId, userId: school.userId }, bytes, fileName: file.name });
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    revalidatePath("/school-dashboard/teachers");
    revalidatePath("/school-dashboard/teachers/teacher-assignments");
    revalidatePath("/school-dashboard/staff");
    revalidatePath("/school-dashboard");
    return NextResponse.json(result);
  }
  const parsed = await parseTeacherBulkWorkbook(bytes, file.name);
  if (!parsed.ok) return NextResponse.json(parsed, { status: 400 });
  const emails = [...new Set([...parsed.teachers.map((row) => row.fields.email), ...parsed.assignments.map((row) => row.fields.teacherEmail)].filter(Boolean))];
  const [years, users, assignments] = await Promise.all([
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
            academicYearId: true,
            code: true,
            name: true,
            active: true,
            sections: {
              select: {
                id: true,
                schoolClassId: true,
                code: true,
                name: true,
                active: true,
                subjects: { select: { id: true, subjectId: true, active: true, subject: { select: { id: true, code: true, name: true, active: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    }),
    emails.length ? prisma.user.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: { email: true, teacher: { select: { id: true, userId: true, schoolId: true, active: true, status: true, schoolMemberships: { where: { active: true, status: "ACTIVE" }, select: { schoolId: true } } } } },
    }) : Promise.resolve([]),
    prisma.teacherAssignment.findMany({ where: { schoolId: school.id, active: true }, select: { teacherId: true, academicYearId: true, schoolClassId: true, sectionId: true, subjectId: true, type: true } }),
  ]);
  const context = {
    years,
    teachers: users.flatMap((user) => user.teacher && user.teacher.schoolId === school.id ? [{ id: user.teacher.id, userId: user.teacher.userId, email: user.email ?? "", active: user.teacher.active, status: user.teacher.status, eligible: user.teacher.active && user.teacher.status === "APPROVED" && user.teacher.schoolMemberships.some((membership) => membership.schoolId === school.id) }] : []),
    users: users.map((user) => ({ email: user.email ?? "", teacherId: user.teacher?.id ?? null, teacherSchoolId: user.teacher?.schoolId ?? null })),
    assignments,
  };
  const preview = validateTeacherBulkRows(parsed.teachers, parsed.assignments, context);
  preview.workbookWarnings.push(...parsed.workbookWarnings);
  preview.teacherSummary.warnings += parsed.workbookWarnings.length;
  return NextResponse.json(preview);
}
