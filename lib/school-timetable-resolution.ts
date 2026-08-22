import "server-only";

import { selectApplicableTimetableConfig } from "@/lib/school-timetable-resolution-policy";

import { prisma } from "@/lib/prisma";

export { SchoolTimetableResolutionError, selectApplicableTimetableConfig } from "@/lib/school-timetable-resolution-policy";
export type { TimetableResolutionConfig } from "@/lib/school-timetable-resolution-policy";

export async function resolveSchoolTimetableForDate(input: { schoolId: string; academicYearId: string; date: Date }) {
  const configs = await prisma.schoolTimetableConfig.findMany({
    where: { schoolId: input.schoolId, academicYearId: input.academicYearId, active: true, effectiveFrom: { lte: input.date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.date } }] },
    orderBy: [{ effectiveFrom: "asc" }, { id: "asc" }],
  });
  return selectApplicableTimetableConfig(configs, input.date);
}