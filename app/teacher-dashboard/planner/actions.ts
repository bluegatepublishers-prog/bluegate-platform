"use server";

import { revalidatePath } from "next/cache";

import { completeTeacherTimetableOccurrence, planTeacherTimetableOccurrence } from "@/lib/teacher-planner";

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export async function planTeacherTimetableOccurrenceAction(form: FormData) {
  await planTeacherTimetableOccurrence({
    timetableEntryId: value(form, "timetableEntryId"),
    date: value(form, "date"),
    bookId: value(form, "bookId") || undefined,
  });
  revalidatePath("/teacher-dashboard/planner");
}

export async function completeTeacherTimetableOccurrenceAction(form: FormData) {
  await completeTeacherTimetableOccurrence(value(form, "periodId"));
  revalidatePath("/teacher-dashboard/planner");
}