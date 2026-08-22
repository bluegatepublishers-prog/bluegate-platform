import "server-only";

import { Prisma, TeachingPeriodStatus } from "@prisma/client";

import { getWeekdayForTimeZone, APPLICATION_TIME_ZONE } from "@/lib/application-timezone";
import { getSchoolFeatureAccessForSchool } from "@/lib/school-feature-access";
import { prisma } from "@/lib/prisma";
import {
  getTeachingPeriod,
  getOrCreateTeachingPlan,
  updateTeachingPeriod,
} from "@/lib/teaching-plan";
import { parseTeachingPeriodDate, TeachingPlanError } from "@/lib/teaching-plan-policy";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getTeacherTimetable } from "@/lib/teacher-timetable";

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

type PlannerView = "today" | "week" | "month" | "completed";
type TimetableEntry = Awaited<ReturnType<typeof getTeacherTimetable>>["entries"][number];
type CalendarOverlayType = "HOLIDAY" | "EMERGENCY_HOLIDAY" | "EXAM";

export type PlannerCalendarOverlay = {
  date: string;
  type: CalendarOverlayType;
  title: string;
  description: string | null;
};

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APPLICATION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateAtNoon(key: string) {
  return new Date(key + "T12:00:00.000Z");
}

function dateAtStart(key: string) {
  return new Date(key + "T00:00:00.000Z");
}

function addDays(key: string, days: number) {
  const value = dateAtNoon(key);
  value.setUTCDate(value.getUTCDate() + days);
  return dateKey(value);
}

function rangeForView(view: PlannerView, now = new Date()) {
  const today = dateKey(now);
  if (view === "today") return { start: today, end: addDays(today, 1), dates: [today] };
  const todayIndex = WEEKDAYS.indexOf(getWeekdayForTimeZone(dateAtNoon(today)) as (typeof WEEKDAYS)[number]);
  const start = addDays(today, -todayIndex);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return { start, end: addDays(start, 7), dates };
}

function monthRange(now = new Date()) {
  const today = dateKey(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const start = `${today.slice(0, 7)}-01`;
  const endDate = new Date(Date.UTC(year, month, 1, 12));
  const end = dateKey(endDate);
  const dates = Array.from({ length: Math.round((endDate.getTime() - dateAtNoon(start).getTime()) / 86400000) }, (_, index) => addDays(start, index));
  return { start, end, dates };
}

function plannerRange(view: PlannerView, now = new Date()) {
  return view === "month" ? monthRange(now) : rangeForView(view, now);
}

function periodKey(timetableEntryId: string, plannedDate: Date | null) {
  return timetableEntryId + ":" + (plannedDate ? dateKey(plannedDate) : "");
}

function labelForEntry(entry: TimetableEntry) {
  return entry.sectionSubject.subject.name + " - " + entry.periodSlot.label;
}

function overlayPriority(type: CalendarOverlayType) {
  return type === "EMERGENCY_HOLIDAY" ? 3 : type === "HOLIDAY" ? 2 : 1;
}

function addOverlay(map: Map<string, PlannerCalendarOverlay>, overlay: PlannerCalendarOverlay) {
  const current = map.get(overlay.date);
  if (!current || overlayPriority(overlay.type) > overlayPriority(current.type)) map.set(overlay.date, overlay);
}

async function calendarOverlays(input: { schoolId: string; academicYearId: string; start: string; end: string; sectionIds: string[]; sectionSubjectIds: string[] }) {
  const [items, assessments] = await Promise.all([
    prisma.academicPlannerItem.findMany({
      where: { schoolId: input.schoolId, academicYearId: input.academicYearId, sectionId: null, type: { in: ["HOLIDAY", "EMERGENCY_HOLIDAY"] }, currentDate: { gte: dateAtStart(input.start), lt: dateAtStart(input.end) }, status: { not: "CANCELLED" } },
      select: { currentDate: true, type: true, title: true, description: true },
    }),
    input.sectionIds.length && input.sectionSubjectIds.length ? prisma.assessment.findMany({
      where: { schoolId: input.schoolId, academicYearId: input.academicYearId, sectionId: { in: input.sectionIds }, sectionSubjectId: { in: input.sectionSubjectIds }, status: { not: "DRAFT" }, OR: [{ opensAt: { gte: dateAtStart(input.start), lt: dateAtStart(input.end) } }, { dueAt: { gte: dateAtStart(input.start), lt: dateAtStart(input.end) } }, { opensAt: { lte: dateAtStart(input.start) }, dueAt: { gte: dateAtStart(input.end) } }] },
      select: { title: true, instructions: true, opensAt: true, dueAt: true },
    }) : Promise.resolve([]),
  ]);
  const overlays = new Map<string, PlannerCalendarOverlay>();
  for (const item of items) addOverlay(overlays, { date: dateKey(item.currentDate), type: item.type as "HOLIDAY" | "EMERGENCY_HOLIDAY", title: item.title, description: item.description });
  for (const assessment of assessments) {
    for (const date of [assessment.opensAt, assessment.dueAt]) if (date) addOverlay(overlays, { date: dateKey(date), type: "EXAM", title: assessment.title, description: assessment.instructions });
  }
  return overlays;
}

async function readPeriods(periodRows: Array<{ id: string; timetableEntryId: string | null; plannedDate: Date | null }>) {
  const reads = await Promise.all(periodRows.map(async (row) => ({ row, period: await getTeachingPeriod({ periodId: row.id }) })));
  return new Map(reads.map(({ row, period }) => [periodKey(row.timetableEntryId ?? "", row.plannedDate), period]));
}

export async function getTeacherPlannerData(view: PlannerView = "today") {
  const teacher = await requireTeacher();
  const plannerAccess = teacher.school ? await getSchoolFeatureAccessForSchool(teacher.school, "PLANNER") : { allowed: false };
  const timetableAccess = teacher.school ? await getSchoolFeatureAccessForSchool(teacher.school, "TIMETABLE") : { allowed: false };
  if (!plannerAccess.allowed || !timetableAccess.allowed || !teacher.schoolId) return { teacher, plannerEnabled: plannerAccess.allowed, timetableEnabled: timetableAccess.allowed, view, dates: [], occurrences: [], completed: [], overlays: [] };
  const timetable = await getTeacherTimetable();
  const range = plannerRange(view);
  const academicYearId = timetable.academicYear?.id;
  if (!academicYearId) return { teacher, plannerEnabled: true, timetableEnabled: true, view, dates: range.dates, occurrences: [], completed: [], overlays: [] };
  const dateTimetables = view === "completed" ? [] : await Promise.all(range.dates.map((date) => getTeacherTimetable(dateAtNoon(date))));
  const entryByDate = new Map(dateTimetables.map((item, index) => [range.dates[index], item.entries]));
  const allEntries = [...new Map(dateTimetables.flatMap((item) => item.entries).map((entry) => [entry.id, entry])).values()];
  const entryById = new Map(timetable.entries.map((entry) => [entry.id, entry]));
  const sectionIds = [...new Set(allEntries.map((entry) => entry.sectionId))];
  const sectionSubjectIds = [...new Set(allEntries.map((entry) => entry.sectionSubjectId))];
  const overlaysByDate = view === "completed" ? new Map<string, PlannerCalendarOverlay>() : await calendarOverlays({ schoolId: teacher.schoolId, academicYearId, start: range.start, end: range.end, sectionIds, sectionSubjectIds });
  const entryIds = allEntries.map((entry) => entry.id);
  const periodRows = view === "completed" || !entryIds.length ? [] : await prisma.teachingPeriod.findMany({ where: { plan: { schoolId: teacher.schoolId, teacherId: teacher.id, academicYearId }, timetableEntryId: { in: entryIds }, plannedDate: { gte: dateAtStart(range.start), lt: dateAtStart(range.end) } }, select: { id: true, timetableEntryId: true, plannedDate: true } });
  const periodMap = await readPeriods(periodRows);
  const occurrences = range.dates.flatMap((date) => {
    const weekday = getWeekdayForTimeZone(dateAtNoon(date));
    const overlay = overlaysByDate.get(date);
    const closed = overlay?.type === "HOLIDAY" || overlay?.type === "EMERGENCY_HOLIDAY";
    return (entryByDate.get(date) ?? []).filter((entry) => entry.weekday === weekday).map((entry) => ({ date, weekday, entry, period: periodMap.get(periodKey(entry.id, dateAtStart(date))) ?? null, book: entry.sectionSubject.book })).filter((item) => !closed || item.period);
  });
  const completedRows = view === "completed" ? await prisma.teachingPeriod.findMany({ where: { plan: { schoolId: teacher.schoolId, teacherId: teacher.id, academicYearId }, timetableEntryId: { not: null }, status: TeachingPeriodStatus.COMPLETED }, select: { id: true, timetableEntryId: true, plannedDate: true }, orderBy: [{ plannedDate: "desc" }, { updatedAt: "desc" }], take: 100 }) : [];
  const completedEntryIds = completedRows.flatMap((row) => row.timetableEntryId ? [row.timetableEntryId] : []);
  if (completedEntryIds.length) {
    const historicalEntries = await prisma.classTimetableEntry.findMany({ where: { id: { in: completedEntryIds }, schoolId: teacher.schoolId, academicYearId, teacherAssignment: { teacherId: teacher.id } }, include: { periodSlot: true, section: { include: { schoolClass: true } }, sectionSubject: { include: { subject: true, book: { select: { id: true, title: true } } } } } });
    for (const entry of historicalEntries) entryById.set(entry.id, entry);
  }
  const completedReads = await Promise.all(completedRows.map(async (row) => ({ row, period: await getTeachingPeriod({ periodId: row.id }) })));
  const completed = completedReads.flatMap(({ row, period }) => { const entry = row.timetableEntryId ? entryById.get(row.timetableEntryId) : undefined; return entry ? [{ date: row.plannedDate ? dateKey(row.plannedDate) : "", weekday: entry.weekday, entry, period, book: entry.sectionSubject.book }] : []; });
  return { teacher, plannerEnabled: true, timetableEnabled: true, view, dates: range.dates, occurrences, completed, overlays: [...overlaysByDate.values()].sort((left, right) => left.date.localeCompare(right.date)) };
}

export async function planTeacherTimetableOccurrence(input: { timetableEntryId: string; date: string }) {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school) throw new TeachingPlanError("UNAUTHORIZED", "Teacher school access is unavailable.");
  const plannerAccess = await getSchoolFeatureAccessForSchool(teacher.school, "PLANNER");
  if (!plannerAccess.allowed) throw new TeachingPlanError("FEATURE_DISABLED", plannerAccess.message);
  const timetableAccess = await getSchoolFeatureAccessForSchool(teacher.school, "TIMETABLE");
  if (!timetableAccess.allowed) throw new TeachingPlanError("FEATURE_DISABLED", timetableAccess.message);
  const timetable = await getTeacherTimetable(dateAtNoon(input.date));
  const academicYear = timetable.academicYear;
  if (!academicYear) throw new TeachingPlanError("ACADEMIC_YEAR_INVALID", "The current academic year is not available.");
  const closure = await prisma.academicPlannerItem.findFirst({ where: { schoolId: teacher.schoolId, academicYearId: academicYear.id, sectionId: null, type: { in: ["HOLIDAY", "EMERGENCY_HOLIDAY"] }, currentDate: { gte: dateAtStart(input.date), lt: dateAtStart(addDays(input.date, 1)) }, status: { not: "CANCELLED" } }, select: { type: true, title: true } });
  if (closure) throw new TeachingPlanError("DATE_CLOSED", closure.type === "EMERGENCY_HOLIDAY" ? "School is closed for this emergency holiday." : "School is closed for this holiday.");
  const entry = timetable.entries.find((item) => item.id === input.timetableEntryId && item.periodSlot.type === "TEACHING");
  if (!entry) throw new TeachingPlanError("UNAUTHORIZED", "This timetable entry is not assigned to you for this date.");
  const plannedDate = parseTeachingPeriodDate(input.date, academicYear);
  if (!plannedDate || getWeekdayForTimeZone(dateAtNoon(input.date)) !== entry.weekday) throw new TeachingPlanError("DATE_INVALID", "The selected date does not match this timetable entry.");
  const bookId = entry.sectionSubject.book?.id;
  if (!bookId) throw new TeachingPlanError("BOOK_NOT_ENTITLED", "Assign the section book before planning this class.");
  const plan = await getOrCreateTeachingPlan({ sectionSubjectId: entry.sectionSubjectId, bookId, academicYearId: academicYear.id });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"teacher-planner-occurrence:" + plan.id + ":" + entry.id + ":" + input.date}))`;
      const existing = await tx.teachingPeriod.findFirst({ where: { planId: plan.id, timetableEntryId: entry.id, plannedDate }, select: { id: true } });
      if (existing) return existing;
      const last = await tx.teachingPeriod.findFirst({ where: { planId: plan.id }, orderBy: [{ sequence: "desc" }, { id: "desc" }], select: { sequence: true } });
      const sequence = (last?.sequence ?? 0) + 1;
      return tx.teachingPeriod.create({ data: { planId: plan.id, sequence, title: labelForEntry(entry), plannedDate, status: TeachingPeriodStatus.PLANNED, timetableEntryId: entry.id }, select: { id: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return getTeachingPeriod({ periodId: result.id });
  } catch (error) {
    if (error instanceof TeachingPlanError) throw error;
    throw new TeachingPlanError("SAVE_FAILED", "The timetable class could not be added to the plan.");
  }
}

export async function completeTeacherTimetableOccurrence(periodId: string) {
  const period = await getTeachingPeriod({ periodId });
  return updateTeachingPeriod({ periodId, title: period.title, plannedDate: period.plannedDate ? dateKey(period.plannedDate) : null, status: TeachingPeriodStatus.COMPLETED });
}

export type { PlannerView };