"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TimetableSeason, TimetableSlotType, Weekday } from "@prisma/client";

import {
  SchoolTimetableValidationError,
  createSchoolPeriodSlot,
  deleteClassTimetableEntry,
  deleteSchoolPeriodSlot,
  saveSchoolTimetableConfig,
  saveCompleteClassTimetable,
  updateSchoolPeriodSlot,
  upsertClassTimetableEntry,
} from "@/lib/school-timetable";
import { parseTimeMinutes } from "@/lib/timetable-time";
import { parseCompleteTimetableForm } from "@/lib/school-timetable-form";

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

function timetableQuery(form: FormData) {
  const query = new URLSearchParams();
  const year = value(form, "academicYearId");
  const section = value(form, "sectionId");
  const config = value(form, "timetableConfigId") || value(form, "configId");
  if (year) query.set("year", year);
  if (section) query.set("section", section);
  if (config) query.set("config", config);
  return query;
}

function redirectForTimetableValidation(form: FormData, error: unknown): never {
  const isInputError = error instanceof SchoolTimetableValidationError ||
    (error instanceof Error && ["Enter a valid date.", "Enter a valid time."].includes(error.message));
  if (!isInputError) throw error;

  const query = timetableQuery(form);
  query.set("error", error.message);
  redirect(`/school-dashboard/timetable?${query.toString()}`);
}

function redirectToTimetable(form: FormData, saved = false): never {
  const query = timetableQuery(form);
  if (saved) query.set("saved", "1");
  redirect(`/school-dashboard/timetable?${query.toString()}`);
}

function refresh() {
  revalidatePath("/school-dashboard/timetable");
}

export async function saveSchoolTimetableConfigAction(form: FormData) {
  try {
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
    redirectToTimetable(form);
  } catch (error) {
    redirectForTimetableValidation(form, error);
  }
}

export async function createSchoolPeriodSlotAction(form: FormData) {
  try {
    await createSchoolPeriodSlot({
      academicYearId: value(form, "academicYearId"),
      timetableConfigId: value(form, "timetableConfigId"),
      label: value(form, "label"),
      sequence: Number(value(form, "sequence")),
      startMinute: parseTimeMinutes(value(form, "startMinute")),
      endMinute: parseTimeMinutes(value(form, "endMinute")),
      type: value(form, "type") as TimetableSlotType,
    });
    refresh();
    redirectToTimetable(form);
  } catch (error) {
    redirectForTimetableValidation(form, error);
  }
}

export async function updateSchoolPeriodSlotAction(form: FormData) {
  try {
    await updateSchoolPeriodSlot(value(form, "id"), {
      academicYearId: value(form, "academicYearId"),
      timetableConfigId: value(form, "timetableConfigId"),
      label: value(form, "label"),
      sequence: Number(value(form, "sequence")),
      startMinute: parseTimeMinutes(value(form, "startMinute")),
      endMinute: parseTimeMinutes(value(form, "endMinute")),
      type: value(form, "type") as TimetableSlotType,
    });
    refresh();
    redirectToTimetable(form);
  } catch (error) {
    redirectForTimetableValidation(form, error);
  }
}

export async function deleteSchoolPeriodSlotAction(form: FormData) {
  try {
    await deleteSchoolPeriodSlot(value(form, "id"), value(form, "academicYearId"), value(form, "timetableConfigId"));
    refresh();
    redirectToTimetable(form);
  } catch (error) {
    redirectForTimetableValidation(form, error);
  }
}

export async function saveCompleteClassTimetableAction(form: FormData) {
  try {
    let normalized;
    try {
      normalized = parseCompleteTimetableForm(form);
    } catch (error) {
      throw new SchoolTimetableValidationError(error instanceof Error ? error.message : "The timetable form is invalid.");
    }
    await saveCompleteClassTimetable(normalized);
    refresh();
    redirectToTimetable(form, true);
  } catch (error) {
    redirectForTimetableValidation(form, error);
  }
}

export async function saveClassTimetableEntryAction(form: FormData) {
  try {
    await upsertClassTimetableEntry({
      entryId: value(form, "entryId") || undefined,
      academicYearId: value(form, "academicYearId"),
      timetableConfigId: value(form, "timetableConfigId"),
      sectionId: value(form, "sectionId"),
      weekday: value(form, "weekday") as Weekday,
      periodSlotId: value(form, "periodSlotId"),
      sectionSubjectId: value(form, "sectionSubjectId"),
      teacherAssignmentId: value(form, "teacherAssignmentId"),
    });
    refresh();
    redirectToTimetable(form);
  } catch (error) {
    redirectForTimetableValidation(form, error);
  }
}

export async function deleteClassTimetableEntryAction(form: FormData) {
  try {
    await deleteClassTimetableEntry(value(form, "id"));
    refresh();
    redirectToTimetable(form);
  } catch (error) {
    redirectForTimetableValidation(form, error);
  }
}
