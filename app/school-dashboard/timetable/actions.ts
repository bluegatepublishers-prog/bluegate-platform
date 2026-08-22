"use server";

import { revalidatePath } from "next/cache";
import { TimetableSeason, TimetableSlotType, Weekday } from "@prisma/client";

import {
  createSchoolPeriodSlot,
  deleteClassTimetableEntry,
  deleteSchoolPeriodSlot,
  saveSchoolTimetableConfig,
  saveCompleteClassTimetable,
  updateSchoolPeriodSlot,
  upsertClassTimetableEntry,
} from "@/lib/school-timetable";
import { parseTimeMinutes } from "@/lib/timetable-time";

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function dateValue(value: string): Date;
function dateValue(value: string, optional: true): Date | null;
function dateValue(value: string, optional = false): Date | null {
  if (optional && !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date.");
  return date;
}

function weekdayValues(form: FormData) {
  return form.getAll("workingDays").map(String) as Weekday[];
}

function refresh() {
  revalidatePath("/school-dashboard/timetable");
}

export async function saveSchoolTimetableConfigAction(form: FormData) {
  await saveSchoolTimetableConfig({
    academicYearId: value(form, "academicYearId"),
    configId: value(form, "configId") || undefined,
    name: value(form, "name") || "Default Timetable",
    season: value(form, "season") as TimetableSeason,
    effectiveFrom: dateValue(value(form, "effectiveFrom")),
    effectiveTo: dateValue(value(form, "effectiveTo"), true),
    active: form.get("active") === "on",
    schoolStartMinute: parseTimeMinutes(value(form, "schoolStartMinute")),
    schoolEndMinute: parseTimeMinutes(value(form, "schoolEndMinute")),
    workingDays: weekdayValues(form),
  });
  refresh();
}

export async function createSchoolPeriodSlotAction(form: FormData) {
  await createSchoolPeriodSlot({
    academicYearId: value(form, "academicYearId"),
    timetableConfigId: value(form, "timetableConfigId") || undefined,
    label: value(form, "label"),
    sequence: Number(value(form, "sequence")),
    startMinute: parseTimeMinutes(value(form, "startMinute")),
    endMinute: parseTimeMinutes(value(form, "endMinute")),
    type: value(form, "type") as TimetableSlotType,
  });
  refresh();
}

export async function updateSchoolPeriodSlotAction(form: FormData) {
  await updateSchoolPeriodSlot(value(form, "id"), {
    academicYearId: value(form, "academicYearId"),
    timetableConfigId: value(form, "timetableConfigId") || undefined,
    label: value(form, "label"),
    sequence: Number(value(form, "sequence")),
    startMinute: parseTimeMinutes(value(form, "startMinute")),
    endMinute: parseTimeMinutes(value(form, "endMinute")),
    type: value(form, "type") as TimetableSlotType,
  });
  refresh();
}

export async function deleteSchoolPeriodSlotAction(form: FormData) {
  await deleteSchoolPeriodSlot(value(form, "id"), value(form, "academicYearId"), value(form, "timetableConfigId") || undefined);
  refresh();
}

export async function saveCompleteClassTimetableAction(form: FormData) {
  const entries = [...form.entries()]
    .filter(([key, raw]) => key.startsWith("cell:") && typeof raw === "string")
    .flatMap(([key, raw]) => {
      const [, weekday, periodSlotId] = key.split(":");
      const [sectionSubjectId, teacherAssignmentId] = String(raw).split("|");
      return sectionSubjectId && teacherAssignmentId ? [{
        academicYearId: value(form, "academicYearId"),
        timetableConfigId: value(form, "timetableConfigId") || undefined,
        sectionId: value(form, "sectionId"),
        weekday: weekday as Weekday,
        periodSlotId,
        sectionSubjectId,
        teacherAssignmentId,
      }] : [];
    });
  const result = await saveCompleteClassTimetable({ academicYearId: value(form, "academicYearId"), sectionId: value(form, "sectionId"), timetableConfigId: value(form, "timetableConfigId") || undefined, entries });
  refresh();
  void result;
}

export async function saveClassTimetableEntryAction(form: FormData) {
  await upsertClassTimetableEntry({
    entryId: value(form, "entryId") || undefined,
    academicYearId: value(form, "academicYearId"),
    timetableConfigId: value(form, "timetableConfigId") || undefined,
    sectionId: value(form, "sectionId"),
    weekday: value(form, "weekday") as Weekday,
    periodSlotId: value(form, "periodSlotId"),
    sectionSubjectId: value(form, "sectionSubjectId"),
    teacherAssignmentId: value(form, "teacherAssignmentId"),
  });
  refresh();
}

export async function deleteClassTimetableEntryAction(form: FormData) {
  await deleteClassTimetableEntry(value(form, "id"));
  refresh();
}