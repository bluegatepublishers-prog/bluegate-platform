import "server-only";

import { Prisma } from "@prisma/client";

import { getSchoolFeatureAccessForSchool } from "@/lib/school-feature-access";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { resolveSchoolTimetableForDate } from "@/lib/school-timetable-resolution";

export class TeacherTimetableAccessError extends Error {
  constructor() {
    super("Timetable is not enabled for this school.");
    this.name = "TeacherTimetableAccessError";
  }
}

export async function getTeacherTimetable(date = new Date()) {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school) throw new TeacherTimetableAccessError();
  const access = await getSchoolFeatureAccessForSchool(teacher.school, "TIMETABLE");
  if (!access.allowed) throw new TeacherTimetableAccessError();
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: teacher.schoolId, current: true, active: true },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!academicYear) return { teacher, academicYear: null, config: null, entries: [] };
  const config = await resolveSchoolTimetableForDate({ schoolId: teacher.schoolId, academicYearId: academicYear.id, date });
  if (!config) return { teacher, academicYear, config: null, entries: [] };
  const entries = await prisma.classTimetableEntry.findMany({
    where: {
      schoolId: teacher.schoolId,
      academicYearId: academicYear.id,
      timetableConfigId: config.id,
      periodSlot: { type: "TEACHING" },
      section: { active: true, schoolClass: { active: true, schoolId: teacher.schoolId, academicYearId: academicYear.id } },
      sectionSubject: { active: true, subject: { active: true } },
      teacherAssignment: {
        teacherId: teacher.id,
        type: "SUBJECT_TEACHER",
        active: true,
        OR: [{ endedAt: null }, { endedAt: { gt: new Date() } }],
      },
    },
    include: {
      periodSlot: true,
      section: { include: { schoolClass: true } },
      sectionSubject: { include: { subject: true, book: { select: { id: true, title: true } } } },
    },
    orderBy: [{ weekday: "asc" }, { periodSlot: { sequence: "asc" } }],
  });
  return { teacher, academicYear, config, entries };
}

export type TeacherTimetableEntry = Prisma.PromiseReturnType<typeof getTeacherTimetable>["entries"][number];