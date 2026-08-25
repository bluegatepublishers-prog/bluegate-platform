import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { buildTeacherBulkTemplate } from "@/lib/teacher-bulk-template";

export async function GET() {
  const school = await requireSchool();
  const years = await prisma.academicYear.findMany({
    where: { schoolId: school.id, active: true },
    select: {
      name: true,
      current: true,
      classes: {
        where: { active: true },
        select: {
          code: true,
          name: true,
          academicYear: { select: { name: true } },
          sections: {
            where: { active: true },
            select: {
              code: true,
              name: true,
              subjects: {
                where: { active: true, subject: { active: true } },
                select: { subject: { select: { code: true, name: true } } },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { code: "asc" },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      },
    },
    orderBy: [{ current: "desc" }, { startDate: "desc" }],
  });
  const workbook = await buildTeacherBulkTemplate({
    schoolName: school.schoolName,
    years: years.map((year) => ({ name: year.name, current: year.current })),
    classes: years.flatMap((year) => year.classes.map((schoolClass) => ({
      code: schoolClass.code,
      name: schoolClass.name,
      academicYearName: schoolClass.academicYear.name,
      sections: schoolClass.sections.map((section) => ({
        code: section.code,
        name: section.name,
        subjects: section.subjects.map((item) => item.subject),
      })),
    }))),
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="bluegate-teacher-bulk-upload-template.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
