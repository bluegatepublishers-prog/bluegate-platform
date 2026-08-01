import { AttendanceLockBehavior, AttendanceMode } from "@prisma/client";

import { getSchoolAttendancePolicy } from "@/lib/attendance";
import { saveSchoolAttendancePolicyAction } from "../actions";

export const dynamic = "force-dynamic";

const dayLabels: Array<{ value: number; label: string }> = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export default async function SchoolAttendanceSettingsPage() {
  const policy = await getSchoolAttendancePolicy();

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Attendance Policy</h1>
        <p className="mt-2 text-sm text-slate-600">Central attendance policy used by teacher workflow, school review, low-attendance calculations, and reports.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={saveSchoolAttendancePolicyAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">Attendance Mode
            <select name="attendanceMode" defaultValue={policy.attendanceMode} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">
              {Object.values(AttendanceMode).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">Lock Behavior
            <select name="lockBehavior" defaultValue={policy.lockBehavior} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">
              {Object.values(AttendanceLockBehavior).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">Lock Time (Hour)
            <input type="number" min={0} max={23} name="lockHour" defaultValue={policy.lockHour} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
          </label>

          <label className="text-sm font-semibold text-slate-700">Correction Window (Days)
            <input type="number" min={1} max={60} name="correctionWindowDays" defaultValue={policy.correctionWindowDays} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
          </label>

          <label className="text-sm font-semibold text-slate-700">Minimum Attendance Percentage
            <input type="number" min={0} max={100} step={0.1} name="minimumAttendancePercentage" defaultValue={policy.minimumAttendancePercentage} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
          </label>

          <label className="text-sm font-semibold text-slate-700">Late Threshold (Minutes)
            <input type="number" min={1} max={240} name="lateThresholdMinutes" defaultValue={policy.lateThresholdMinutes} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
          </label>

          <label className="text-sm font-semibold text-slate-700">Half-Day Threshold (Minutes)
            <input type="number" min={30} max={480} name="halfDayThresholdMinutes" defaultValue={policy.halfDayThresholdMinutes} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
          </label>

          <div className="md:col-span-2 xl:col-span-3">
            <p className="text-sm font-semibold text-slate-700">Working Days</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {dayLabels.map((day) => (
                <label key={day.value} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm">
                  <input type="checkbox" name={`workingDay${day.value}`} defaultChecked={policy.workingDays.includes(day.value)} />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="allowTeacherDraftSaving" defaultChecked={policy.allowTeacherDraftSaving} />
            Allow Teacher Draft Saving
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="excludeHolidays" defaultChecked={policy.excludeHolidays} />
            Exclude Holidays
          </label>

          <div className="md:col-span-2 xl:col-span-3">
            <p className="text-sm font-semibold text-slate-700">Require Remarks For</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm"><input type="checkbox" name="requireRemarkAbsent" defaultChecked={policy.requireRemarkAbsent} />Absent</label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm"><input type="checkbox" name="requireRemarkLate" defaultChecked={policy.requireRemarkLate} />Late</label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm"><input type="checkbox" name="requireRemarkHalfDay" defaultChecked={policy.requireRemarkHalfDay} />Half Day</label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm"><input type="checkbox" name="requireRemarkExcused" defaultChecked={policy.requireRemarkExcused} />Excused</label>
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Save Attendance Policy</button>
          </div>
        </form>
      </section>
    </main>
  );
}
