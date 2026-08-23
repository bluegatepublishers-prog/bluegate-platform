import type { Weekday } from "@prisma/client";

export type CompleteTimetableEntryInput = {
  academicYearId: string;
  timetableConfigId: string;
  sectionId: string;
  weekday: Weekday;
  periodSlotId: string;
  sectionSubjectId: string;
  teacherAssignmentId: string;
};

export type CompleteTimetableFormInput = {
  academicYearId: string;
  timetableConfigId: string;
  sectionId: string;
  entries: CompleteTimetableEntryInput[];
};

function formValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

const cellKey = /^cell:(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY):([^:]+)$/;

export function parseCompleteTimetableForm(form: FormData): CompleteTimetableFormInput {
  const academicYearId = formValue(form, "academicYearId");
  const timetableConfigId = formValue(form, "timetableConfigId");
  const sectionId = formValue(form, "sectionId");
  if (!academicYearId || !timetableConfigId || !sectionId) {
    throw new Error("The timetable form is missing its selected year, configuration, or section.");
  }

  const entries: CompleteTimetableEntryInput[] = [];
  for (const [key, raw] of form.entries()) {
    const match = cellKey.exec(key);
    if (!match || typeof raw !== "string") continue;
    const selected = raw.trim();
    if (!selected || selected === "|") continue;
    const parts = selected.split("|");
    if (parts.length !== 2 || parts.some((part) => !part)) {
      throw new Error("Select one valid subject and teacher for each timetable cell.");
    }
    entries.push({
      academicYearId,
      timetableConfigId,
      sectionId,
      weekday: match[1] as Weekday,
      periodSlotId: match[2],
      sectionSubjectId: parts[0],
      teacherAssignmentId: parts[1],
    });
  }

  return { academicYearId, timetableConfigId, sectionId, entries };
}