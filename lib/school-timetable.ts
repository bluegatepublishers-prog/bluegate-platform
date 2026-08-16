import "server-only";

import { Prisma, TimetableSlotType, Weekday } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { requireSchoolFeature } from "@/lib/school-feature-access";

export class SchoolTimetableValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchoolTimetableValidationError";
  }
}

export const WEEKDAYS = Object.values(Weekday);
export const TIMETABLE_SLOT_TYPES = Object.values(TimetableSlotType);

export type TimetableConfigInput = {
  academicYearId: string;
  schoolStartMinute: number;
  schoolEndMinute: number;
  workingDays: Weekday[];
};

export type PeriodSlotInput = {
  academicYearId: string;
  label: string;
  sequence: number;
  startMinute: number;
  endMinute: number;
  type: TimetableSlotType;
};

export type TimetableEntryInput = {
  academicYearId: string;
  sectionId: string;
  weekday: Weekday;
  periodSlotId: string;
  sectionSubjectId: string;
  teacherAssignmentId: string;
  entryId?: string;
};

export type ExistingTimetableSlot = Pick<PeriodSlotInput, "startMinute" | "endMinute">;
export type ExistingTimetableEntry = Pick<TimetableEntryInput, "weekday">;

function fail(message: string): never {
  throw new SchoolTimetableValidationError(message);
}

function minute(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 1439) {
    fail(label + " must be a whole minute from 00:00 to 23:59.");
  }
}

function validateRange(startMinute: number, endMinute: number) {
  minute(startMinute, "Start time");
  minute(endMinute, "End time");
  if (startMinute >= endMinute) fail("Start time must be before end time.");
}

function validateConfig(input: TimetableConfigInput) {
  validateRange(input.schoolStartMinute, input.schoolEndMinute);
  if (!input.workingDays.length) fail("Select at least one working day.");
  if (new Set(input.workingDays).size !== input.workingDays.length) fail("Working days cannot contain duplicates.");
  if (input.workingDays.some((day) => !WEEKDAYS.includes(day))) fail("Working days contains an invalid weekday.");
}

export function validateProposedConfig(
  input: TimetableConfigInput,
  currentConfig: Pick<TimetableConfigInput, "workingDays"> | null,
  existingSlots: ExistingTimetableSlot[],
  existingEntries: ExistingTimetableEntry[],
) {
  validateConfig(input);
  if (existingSlots.some((slot) => slot.startMinute < input.schoolStartMinute || slot.endMinute > input.schoolEndMinute)) {
    fail("School timing cannot be changed because existing period slots fall outside the new school day.");
  }
  const removedDays = currentConfig?.workingDays.filter((day) => !input.workingDays.includes(day)) ?? [];
  if (existingEntries.some((entry) => removedDays.includes(entry.weekday))) {
    fail("Working day cannot be removed while timetable entries exist for that day.");
  }
}

function validateSlotShape(input: PeriodSlotInput) {
  if (!input.label.trim() || input.label.trim().length > 120) fail("Enter a slot label up to 120 characters.");
  if (!Number.isInteger(input.sequence) || input.sequence < 1) fail("Slot sequence must be a positive whole number.");
  validateRange(input.startMinute, input.endMinute);
  if (!TIMETABLE_SLOT_TYPES.includes(input.type)) fail("Select a valid slot type.");
}

function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function schoolYear(schoolId: string, academicYearId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const year = await tx.academicYear.findFirst({
    where: { id: academicYearId, schoolId, active: true },
    select: { id: true, schoolId: true, name: true, current: true },
  });
  if (!year) fail("Academic year is not available for this school.");
  return year;
}

function structureLockKey(schoolId: string, academicYearId: string) {
  return "school-timetable-structure:" + schoolId + ":" + academicYearId;
}

async function lockScope(tx: Prisma.TransactionClient, identityKey: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identityKey}))`;
}

async function configFor(tx: Prisma.TransactionClient, schoolId: string, academicYearId: string) {
  const config = await tx.schoolTimetableConfig.findUnique({
    where: { schoolId_academicYearId: { schoolId, academicYearId } },
  });
  if (!config) fail("Set the School timetable timing before editing period slots.");
  return config;
}

async function assertSlotDoesNotOverlap(tx: Prisma.TransactionClient, input: PeriodSlotInput, schoolId: string, excludeId?: string) {
  const slots = await tx.schoolPeriodSlot.findMany({
    where: { schoolId, academicYearId: input.academicYearId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, startMinute: true, endMinute: true },
  });
  if (slots.some((slot) => input.startMinute < slot.endMinute && input.endMinute > slot.startMinute)) {
    fail("Period slot overlaps an existing slot.");
  }
}

export async function getSchoolTimetableWorkspace(yearId?: string, sectionId?: string) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  const years = await prisma.academicYear.findMany({
    where: { schoolId: school.id, active: true },
    include: {
      classes: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          sections: {
            where: { active: true },
            orderBy: { name: "asc" },
            include: {
              subjects: {
                where: { active: true, subject: { active: true } },
                include: { subject: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
    orderBy: [{ current: "desc" }, { startDate: "desc" }],
  });
  const year = years.find((item) => item.id === yearId) ?? years.find((item) => item.current) ?? years[0] ?? null;
  if (!year) return { school, years, year: null, section: null, config: null, slots: [], entries: [], assignments: [] };
  const classes = year.classes;
  const section = classes.flatMap((item) => item.sections).find((item) => item.id === sectionId) ?? classes[0]?.sections[0] ?? null;
  if (!section) return { school, years, year, section: null, config: null, slots: [], entries: [], assignments: [] };
  const [config, slots, entries, assignments] = await Promise.all([
    prisma.schoolTimetableConfig.findUnique({ where: { schoolId_academicYearId: { schoolId: school.id, academicYearId: year.id } } }),
    prisma.schoolPeriodSlot.findMany({ where: { schoolId: school.id, academicYearId: year.id }, orderBy: { sequence: "asc" } }),
    prisma.classTimetableEntry.findMany({
      where: { schoolId: school.id, academicYearId: year.id, sectionId: section.id },
      include: {
        periodSlot: true,
        sectionSubject: { include: { subject: true } },
        teacherAssignment: { include: { teacher: { include: { user: true } } } },
      },
      orderBy: [{ periodSlot: { sequence: "asc" } }, { weekday: "asc" }],
    }),
    prisma.teacherAssignment.findMany({
      where: {
        schoolId: school.id,
        academicYearId: year.id,
        sectionId: section.id,
        active: true,
        type: "SUBJECT_TEACHER",
        subjectId: { not: null },
        OR: [{ endedAt: null }, { endedAt: { gt: new Date() } }],
      },
      include: { subject: true, teacher: { include: { user: true } } },
      orderBy: { teacher: { user: { name: "asc" } } },
    }),
  ]);
  return { school, years, year, section, config, slots, entries, assignments };
}

export async function saveSchoolTimetableConfig(input: TimetableConfigInput) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  try {
    return await prisma.$transaction(async (tx) => {
      await lockScope(tx, structureLockKey(school.id, input.academicYearId));
      await schoolYear(school.id, input.academicYearId, tx);
      const currentConfig = await tx.schoolTimetableConfig.findUnique({
        where: { schoolId_academicYearId: { schoolId: school.id, academicYearId: input.academicYearId } },
        select: { workingDays: true },
      });
      const [existingSlots, existingEntries] = await Promise.all([
        tx.schoolPeriodSlot.findMany({ where: { schoolId: school.id, academicYearId: input.academicYearId }, select: { startMinute: true, endMinute: true } }),
        tx.classTimetableEntry.findMany({ where: { schoolId: school.id, academicYearId: input.academicYearId }, select: { weekday: true } }),
      ]);
      validateProposedConfig(input, currentConfig, existingSlots, existingEntries);
      return tx.schoolTimetableConfig.upsert({
        where: { schoolId_academicYearId: { schoolId: school.id, academicYearId: input.academicYearId } },
        update: { schoolStartMinute: input.schoolStartMinute, schoolEndMinute: input.schoolEndMinute, workingDays: input.workingDays },
        create: { schoolId: school.id, academicYearId: input.academicYearId, schoolStartMinute: input.schoolStartMinute, schoolEndMinute: input.schoolEndMinute, workingDays: input.workingDays },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof SchoolTimetableValidationError) throw error;
    throw new SchoolTimetableValidationError("Unable to save the School timetable settings.");
  }
}

export async function listSchoolPeriodSlots(academicYearId: string) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  await schoolYear(school.id, academicYearId);
  return prisma.schoolPeriodSlot.findMany({ where: { schoolId: school.id, academicYearId }, orderBy: { sequence: "asc" } });
}

export async function createSchoolPeriodSlot(input: PeriodSlotInput) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  try {
    return await prisma.$transaction(async (tx) => {
      await lockScope(tx, structureLockKey(school.id, input.academicYearId));
      validateSlotShape(input);
      await schoolYear(school.id, input.academicYearId, tx);
      const config = await configFor(tx, school.id, input.academicYearId);
      if (input.startMinute < config.schoolStartMinute || input.endMinute > config.schoolEndMinute) fail("Period slot must fit inside the School day.");
      await assertSlotDoesNotOverlap(tx, input, school.id);
      return tx.schoolPeriodSlot.create({ data: { ...input, schoolId: school.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof SchoolTimetableValidationError) throw error;
    if (isUniqueError(error)) throw new SchoolTimetableValidationError("That slot sequence is already in use.");
    throw new SchoolTimetableValidationError("Unable to create the period slot.");
  }
}

export async function updateSchoolPeriodSlot(id: string, input: PeriodSlotInput) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  try {
    return await prisma.$transaction(async (tx) => {
      await lockScope(tx, structureLockKey(school.id, input.academicYearId));
      validateSlotShape(input);
      await schoolYear(school.id, input.academicYearId, tx);
      const current = await tx.schoolPeriodSlot.findFirst({ where: { id, schoolId: school.id, academicYearId: input.academicYearId } });
      if (!current) fail("Period slot not found.");
      const config = await configFor(tx, school.id, input.academicYearId);
      if (input.startMinute < config.schoolStartMinute || input.endMinute > config.schoolEndMinute) fail("Period slot must fit inside the School day.");
      await assertSlotDoesNotOverlap(tx, input, school.id, id);
      if (current.type === TimetableSlotType.TEACHING && input.type !== TimetableSlotType.TEACHING) {
        const linked = await tx.classTimetableEntry.count({ where: { periodSlotId: id } });
        if (linked) fail("Remove or reassign timetable entries before changing this teaching slot.");
      }
      return tx.schoolPeriodSlot.update({ where: { id }, data: { label: input.label.trim(), sequence: input.sequence, startMinute: input.startMinute, endMinute: input.endMinute, type: input.type } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof SchoolTimetableValidationError) throw error;
    if (isUniqueError(error)) throw new SchoolTimetableValidationError("That slot sequence is already in use.");
    throw new SchoolTimetableValidationError("Unable to update the period slot.");
  }
}

export async function deleteSchoolPeriodSlot(id: string, academicYearId: string) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  try {
    return await prisma.$transaction(async (tx) => {
      await lockScope(tx, structureLockKey(school.id, academicYearId));
      await schoolYear(school.id, academicYearId, tx);
      const slot = await tx.schoolPeriodSlot.findFirst({ where: { id, schoolId: school.id, academicYearId } });
      if (!slot) fail("Period slot not found.");
      const linked = await tx.classTimetableEntry.count({ where: { periodSlotId: id } });
      if (linked) fail("Remove or reassign timetable entries before deleting this slot.");
      return tx.schoolPeriodSlot.delete({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof SchoolTimetableValidationError) throw error;
    throw new SchoolTimetableValidationError("Unable to delete the period slot.");
  }
}

async function timetableEntryScope(tx: Prisma.TransactionClient, schoolId: string, input: TimetableEntryInput) {
  const year = await schoolYear(schoolId, input.academicYearId, tx);
  const config = await configFor(tx, schoolId, input.academicYearId);
  if (!config.workingDays.includes(input.weekday)) fail("That weekday is not configured as a School working day.");
  const section = await tx.classSection.findFirst({
    where: { id: input.sectionId, active: true, schoolClass: { schoolId, academicYearId: input.academicYearId, active: true } },
    select: { id: true, schoolClassId: true },
  });
  if (!section) fail("Section is not available for this School academic year.");
  const sectionSubject = await tx.sectionSubject.findFirst({
    where: { id: input.sectionSubjectId, sectionId: input.sectionId, active: true, subject: { active: true } },
    select: { id: true, subjectId: true },
  });
  if (!sectionSubject) fail("Subject is not assigned to this section.");
  const slot = await tx.schoolPeriodSlot.findFirst({ where: { id: input.periodSlotId, schoolId, academicYearId: input.academicYearId } });
  if (!slot) fail("Period slot is not available for this School academic year.");
  if (slot.type !== TimetableSlotType.TEACHING) fail("Break and non-teaching slots cannot receive a subject.");
  const now = new Date();
  const assignment = await tx.teacherAssignment.findFirst({
    where: {
      id: input.teacherAssignmentId,
      schoolId,
      academicYearId: input.academicYearId,
      schoolClassId: section.schoolClassId,
      sectionId: input.sectionId,
      subjectId: sectionSubject.subjectId,
      type: "SUBJECT_TEACHER",
      active: true,
      OR: [{ endedAt: null }, { endedAt: { gt: now } }],
    },
    select: { id: true, teacherId: true },
  });
  if (!assignment) fail("Select an active subject-teacher assignment for this section and subject.");
  return { year, config, section, sectionSubject, slot, assignment };
}

export async function upsertClassTimetableEntry(input: TimetableEntryInput) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  try {
    return await prisma.$transaction(async (tx) => {
      await lockScope(tx, structureLockKey(school.id, input.academicYearId));
      const scope = await timetableEntryScope(tx, school.id, input);
      await lockScope(tx, "school-timetable-entry:" + school.id + ":" + input.academicYearId + ":" + input.weekday + ":" + input.periodSlotId + ":" + scope.assignment.teacherId);
      await lockScope(tx, "school-timetable-cell:" + school.id + ":" + input.academicYearId + ":" + input.sectionId + ":" + input.weekday + ":" + input.periodSlotId);
      const existingAtCell = await tx.classTimetableEntry.findFirst({
        where: { academicYearId: input.academicYearId, sectionId: input.sectionId, weekday: input.weekday, periodSlotId: input.periodSlotId },
        select: { id: true },
      });
      if (existingAtCell && existingAtCell.id !== input.entryId) fail("This class already has a timetable entry during this period.");
      if (input.entryId && !existingAtCell) fail("Timetable entry not found.");
      const teacherConflict = await tx.classTimetableEntry.findFirst({
        where: {
          schoolId: school.id,
          academicYearId: input.academicYearId,
          weekday: input.weekday,
          periodSlotId: input.periodSlotId,
          teacherAssignment: { teacherId: scope.assignment.teacherId },
          ...(input.entryId ? { id: { not: input.entryId } } : {}),
        },
        select: { id: true },
      });
      if (teacherConflict) fail("Teacher is already assigned to another class during this period.");
      if (input.entryId) {
        return tx.classTimetableEntry.update({
          where: { id: input.entryId },
          data: { sectionId: input.sectionId, sectionSubjectId: input.sectionSubjectId, teacherAssignmentId: input.teacherAssignmentId, weekday: input.weekday, periodSlotId: input.periodSlotId },
        });
      }
      return tx.classTimetableEntry.create({
        data: { schoolId: school.id, academicYearId: input.academicYearId, sectionId: input.sectionId, weekday: input.weekday, periodSlotId: input.periodSlotId, sectionSubjectId: input.sectionSubjectId, teacherAssignmentId: input.teacherAssignmentId },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof SchoolTimetableValidationError) throw error;
    if (isUniqueError(error)) throw new SchoolTimetableValidationError("This timetable cell is already occupied.");
    throw new SchoolTimetableValidationError("Unable to save the timetable entry.");
  }
}

export async function deleteClassTimetableEntry(id: string) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.classTimetableEntry.findFirst({ where: { id, schoolId: school.id } });
      if (!entry) fail("Timetable entry not found.");
      await lockScope(tx, structureLockKey(school.id, entry.academicYearId));
      await lockScope(tx, "school-timetable-cell:" + school.id + ":" + entry.academicYearId + ":" + entry.sectionId + ":" + entry.weekday + ":" + entry.periodSlotId);
      await tx.classTimetableEntry.delete({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof SchoolTimetableValidationError) throw error;
    throw new SchoolTimetableValidationError("Unable to delete the timetable entry.");
  }
}

export async function getSectionTimetable(academicYearId: string, sectionId: string) {
  const school = await requireSchool();
  await requireSchoolFeature("TIMETABLE");
  await schoolYear(school.id, academicYearId);
  const section = await prisma.classSection.findFirst({ where: { id: sectionId, active: true, schoolClass: { schoolId: school.id, academicYearId } }, select: { id: true } });
  if (!section) fail("Section is not available for this School academic year.");
  return prisma.classTimetableEntry.findMany({
    where: { schoolId: school.id, academicYearId, sectionId },
    include: { periodSlot: true, sectionSubject: { include: { subject: true } }, teacherAssignment: { include: { teacher: { include: { user: true } } } } },
    orderBy: [{ periodSlot: { sequence: "asc" } }, { weekday: "asc" }],
  });
}
