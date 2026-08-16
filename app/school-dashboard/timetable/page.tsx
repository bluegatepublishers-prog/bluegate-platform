import { CalendarDays, Clock3, Plus, Save, Trash2 } from "lucide-react";

import SchoolFeatureUnavailable from "@/components/school/SchoolFeatureUnavailable";
import { schoolTypography } from "@/components/school/SchoolUI";
import { getSchoolFeatureAccess } from "@/lib/school-feature-access";
import { getSchoolTimetableWorkspace, WEEKDAYS } from "@/lib/school-timetable";
import { TimetableSlotType } from "@prisma/client";

import {
  createSchoolPeriodSlotAction,
  deleteClassTimetableEntryAction,
  deleteSchoolPeriodSlotAction,
  saveClassTimetableEntryAction,
  saveSchoolTimetableConfigAction,
  updateSchoolPeriodSlotAction,
} from "./actions";

export const dynamic = "force-dynamic";

function clock(minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return hour + ":" + minute;
}

export default async function SchoolTimetablePage({ searchParams }: { searchParams: Promise<{ year?: string; section?: string }> }) {
  if (!(await getSchoolFeatureAccess("TIMETABLE")).allowed) return <SchoolFeatureUnavailable label="Timetable" />;
  const params = await searchParams;
  const data = await getSchoolTimetableWorkspace(params.year, params.section);
  if (!data.year || !data.section) {
    return <main className="p-4 sm:p-6 lg:p-8"><h1 className={schoolTypography.pageTitle}>Timetable</h1><p className="mt-2 text-sm text-slate-500">Create an active academic year and section before setting up the timetable.</p></main>;
  }
  const entryMap = new Map(data.entries.map((entry) => [entry.weekday + ":" + entry.periodSlotId, entry]));
  const subjectAssignments = data.assignments;
  const currentDays = data.config?.workingDays ?? [];
  const selectedClass = data.year.classes.find((schoolClass) => schoolClass.sections.some((item) => item.id === data.section?.id));

  return (
    <main className="space-y-5 p-3 sm:p-5 lg:p-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">School operations</p><h1 className={schoolTypography.pageTitle}>Timetable</h1><p className="mt-1 text-sm text-slate-500">School-owned weekly periods for the selected academic structure.</p></div>
        <CalendarDays className="h-7 w-7 text-blue-600" aria-hidden="true" />
      </header>

      <form method="get" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">Academic Year<select name="year" defaultValue={data.year.id} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm">{data.years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.current ? " · Current" : ""}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Class / Section<select name="section" defaultValue={data.section.id} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm">{data.year.classes.flatMap((schoolClass) => schoolClass.sections.map((section) => <option key={section.id} value={section.id}>{schoolClass.name} - {section.name}</option>))}</select></label>
        <button className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"><CalendarDays className="h-4 w-4" />Load timetable</button>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" /><h2 className={schoolTypography.sectionTitle}>School timing</h2></div>
        <form action={saveSchoolTimetableConfigAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_2fr_auto]">
          <input type="hidden" name="academicYearId" value={data.year.id} />
          <label className="text-xs font-semibold text-slate-600">Start<input name="schoolStartMinute" type="time" defaultValue={clock(data.config?.schoolStartMinute ?? 480)} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">End<input name="schoolEndMinute" type="time" defaultValue={clock(data.config?.schoolEndMinute ?? 840)} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label>
          <fieldset><legend className="text-xs font-semibold text-slate-600">Working days</legend><div className="mt-2 flex flex-wrap gap-2">{WEEKDAYS.map((day) => <label key={day} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold"><input type="checkbox" name="workingDays" value={day} defaultChecked={currentDays.includes(day)} />{day.slice(0, 3)}</label>)}</div></fieldset>
          <button className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-700"><Save className="h-3.5 w-3.5" />Save timing</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-blue-600" /><h2 className={schoolTypography.sectionTitle}>Period slots</h2></div>
        <form action={createSchoolPeriodSlotAction} className="grid gap-2 border-b border-slate-100 pb-4 md:grid-cols-6">
          <input type="hidden" name="academicYearId" value={data.year.id} />
          <input name="label" required placeholder="Period 1" className="h-9 rounded-lg border px-3 text-sm" />
          <input name="sequence" required type="number" min="1" placeholder="Order" className="h-9 rounded-lg border px-3 text-sm" />
          <input name="startMinute" required type="time" className="h-9 rounded-lg border px-3 text-sm" />
          <input name="endMinute" required type="time" className="h-9 rounded-lg border px-3 text-sm" />
          <select name="type" defaultValue="TEACHING" className="h-9 rounded-lg border px-3 text-sm">{Object.values(TimetableSlotType).map((type) => <option key={type}>{type}</option>)}</select>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />Add slot</button>
        </form>
        <div className="mt-3 space-y-2">{data.slots.length ? data.slots.map((slot) => <form key={slot.id} action={updateSchoolPeriodSlotAction} className="grid gap-2 rounded-lg bg-slate-50 p-2 md:grid-cols-7"><input type="hidden" name="id" value={slot.id} /><input type="hidden" name="academicYearId" value={data.year.id} /><input name="label" defaultValue={slot.label} className="h-8 rounded-md border px-2 text-xs" /><input name="sequence" type="number" min="1" defaultValue={slot.sequence} className="h-8 rounded-md border px-2 text-xs" /><input name="startMinute" type="time" defaultValue={clock(slot.startMinute)} className="h-8 rounded-md border px-2 text-xs" /><input name="endMinute" type="time" defaultValue={clock(slot.endMinute)} className="h-8 rounded-md border px-2 text-xs" /><select name="type" defaultValue={slot.type} className="h-8 rounded-md border px-2 text-xs">{Object.values(TimetableSlotType).map((type) => <option key={type}>{type}</option>)}</select><button className="h-8 rounded-md border bg-white text-xs font-semibold text-blue-700">Save</button><button formAction={deleteSchoolPeriodSlotAction} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border bg-white text-xs font-semibold text-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete</button></form>) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Save School timing before adding period slots.</p>}</div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4"><h2 className={schoolTypography.sectionTitle}>{data.year.name} · {data.section.id === params.section ? "Selected section" : "Section"} timetable</h2><p className="mt-1 text-xs text-slate-500">Class {selectedClass?.name ?? "Selected class"} · Section {data.section.name}. Breaks remain layout-only.</p></div>
        {data.config && data.slots.length ? <table className="min-w-[850px] table-fixed border-collapse text-left text-xs"><thead><tr><th className="w-32 border-b p-2 text-slate-500">Slot</th>{WEEKDAYS.map((day) => <th key={day} className={`border-b p-2 ${currentDays.includes(day) ? "text-slate-700" : "text-slate-300"}`}>{day.slice(0, 3)}</th>)}</tr></thead><tbody>{data.slots.map((slot) => <tr key={slot.id}><th className="border-b bg-slate-50 p-2 font-semibold">{slot.label}<span className="block font-normal text-slate-400">{clock(slot.startMinute)}-{clock(slot.endMinute)}</span></th>{WEEKDAYS.map((day) => { const entry = entryMap.get(day + ":" + slot.id); return <td key={day} className="border-b p-1 align-top">{slot.type !== "TEACHING" ? <div className="grid min-h-16 place-items-center text-slate-300">—</div> : entry ? <div className="min-h-16 rounded-md bg-blue-50 p-2"><strong className="block text-blue-800">{entry.sectionSubject.subject.name}</strong><span className="block truncate text-[10px] text-slate-500">{entry.teacherAssignment.teacher.user.name}</span><form action={deleteClassTimetableEntryAction} className="mt-1"><input type="hidden" name="id" value={entry.id} /><button className="text-[10px] font-semibold text-rose-700">Remove</button></form></div> : <form action={saveClassTimetableEntryAction} className="min-h-16 space-y-1 rounded-md border border-dashed border-slate-200 p-1"><input type="hidden" name="academicYearId" value={data.year.id} /><input type="hidden" name="sectionId" value={data.section.id} /><input type="hidden" name="weekday" value={day} /><input type="hidden" name="periodSlotId" value={slot.id} /><select required name="sectionSubjectId" className="h-7 w-full rounded border px-1 text-[10px]"><option value="">Subject</option>{data.section.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subject.name}</option>)}</select><select required name="teacherAssignmentId" className="h-7 w-full rounded border px-1 text-[10px]"><option value="">Teacher</option>{subjectAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.subject?.name} · {assignment.teacher.user.name}</option>)}</select><button className="w-full rounded bg-blue-600 py-1 text-[10px] font-semibold text-white">Assign</button></form>}</td>; })}</tr>)}</tbody></table> : <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">Configure timing and at least one slot to open the weekly grid.</p>}
      </section>
    </main>
  );
}
