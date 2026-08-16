"use server";

import { revalidatePath } from "next/cache";
import { TimetableSlotType, Weekday } from "@prisma/client";

import {
  createSchoolPeriodSlot,
  deleteClassTimetableEntry,
  deleteSchoolPeriodSlot,
  saveSchoolTimetableConfig,
  updateSchoolPeriodSlot,
  upsertClassTimetableEntry,
} from "@/lib/school-timetable";
import { parseTimeMinutes } from "@/lib/timetable-time";

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
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
    schoolStartMinute: parseTimeMinutes(value(form, "schoolStartMinute")),
    schoolEndMinute: parseTimeMinutes(value(form, "schoolEndMinute")),
    workingDays: weekdayValues(form),
  });
  refresh();
}

export async function createSchoolPeriodSlotAction(form: FormData) {
  await createSchoolPeriodSlot({
    academicYearId: value(form, "academicYearId"),
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
    label: value(form, "label"),
    sequence: Number(value(form, "sequence")),
    startMinute: parseTimeMinutes(value(form, "startMinute")),
    endMinute: parseTimeMinutes(value(form, "endMinute")),
    type: value(form, "type") as TimetableSlotType,
  });
  refresh();
}

export async function deleteSchoolPeriodSlotAction(form: FormData) {
  await deleteSchoolPeriodSlot(value(form, "id"), value(form, "academicYearId"));
  refresh();
}

export async function saveClassTimetableEntryAction(form: FormData) {
  await upsertClassTimetableEntry({
    entryId: value(form, "entryId") || undefined,
    academicYearId: value(form, "academicYearId"),
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
