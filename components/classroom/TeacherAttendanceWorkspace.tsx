"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  FileDown,
  FileUp,
  Lock,
  Search,
} from "lucide-react";

import {
  requestAttendanceCorrectionAction,
  saveTeacherAttendanceDraftAction,
  submitTeacherAttendanceAction,
} from "@/app/teacher-dashboard/attendance/actions";

type UiStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE" | "EXCUSED";

type AttendanceRow = {
  attendanceRecordId: string | null;
  studentId: string;
  enrollmentId: string;
  rollNumber: string | null;
  studentName: string;
  status: UiStatus;
  leaveLocked: boolean;
  remark: string;
  checkInTime: string;
};

type SubjectOption = {
  id: string;
  name: string;
};

type Props = {
  routeBase: string;
  sectionId: string;
  className: string;
  sectionName: string;
  teacherName: string;
  attendanceMode: "DAILY" | "PERIOD";
  subjects: SubjectOption[];
  selectedSubjectId: string;
  date: string;
  period: string;
  sessionType: "DAILY" | "PERIOD" | "ASSEMBLY" | "ACTIVITY" | "EXAM";
  editable: boolean;
  sessionLocked: boolean;
  sessionSubmitted: boolean;
  lockHour: number;
  rows: AttendanceRow[];
};

type SortMode = "ROLL" | "NAME" | "STATUS";

const statusOptions: Array<{ value: UiStatus; label: string; tone: string }> = [
  { value: "PRESENT", label: "Present", tone: "text-emerald-700 bg-emerald-50" },
  { value: "ABSENT", label: "Absent", tone: "text-red-700 bg-red-50" },
  { value: "LATE", label: "Late", tone: "text-amber-700 bg-amber-50" },
  { value: "HALF_DAY", label: "Half Day", tone: "text-violet-700 bg-violet-50" },
  { value: "ON_LEAVE", label: "Leave", tone: "text-purple-700 bg-purple-50" },
  { value: "EXCUSED", label: "Excused", tone: "text-cyan-700 bg-cyan-50" },
];

function toDateInput(value: string) {
  return value.slice(0, 10);
}

function statusLabel(status: UiStatus) {
  return statusOptions.find((item) => item.value === status)?.label ?? status;
}

function studentInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return `${parts[0]?.[0] ?? "S"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export default function TeacherAttendanceWorkspace(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [selectedSubjectId, setSelectedSubjectId] = useState(props.selectedSubjectId);
  const [date, setDate] = useState(toDateInput(props.date));
  const [period, setPeriod] = useState(props.period);
  const [sessionType, setSessionType] = useState<Props["sessionType"]>(props.attendanceMode);

  const [rows, setRows] = useState<AttendanceRow[]>(props.rows);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<UiStatus | "ALL">("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("ROLL");
  const [correctionTarget, setCorrectionTarget] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState<UiStatus>("PRESENT");
  const [feedback, setFeedback] = useState("");

  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 86;
  const viewportHeight = 560;

  const initialByEnrollment = useMemo(
    () => new Map(props.rows.map((item) => [item.enrollmentId, `${item.status}|${item.remark}`])),
    [props.rows],
  );

  const counts = useMemo(() => {
    const summary = {
      students: rows.length,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      draft: 0,
      submitted: props.sessionLocked || props.sessionSubmitted ? 1 : 0,
    };

    for (const row of rows) {
      if (row.status === "PRESENT") summary.present += 1;
      if (row.status === "ABSENT") summary.absent += 1;
      if (row.status === "LATE") summary.late += 1;
      if (row.status === "ON_LEAVE") summary.leave += 1;

      const original = initialByEnrollment.get(row.enrollmentId);
      if (original && original !== `${row.status}|${row.remark}`) summary.draft += 1;
    }

    return summary;
  }, [rows, props.sessionLocked, props.sessionSubmitted, initialByEnrollment]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = rows.filter((item) => {
      const statusMatch = filterStatus === "ALL" || item.status === filterStatus;
      const queryMatch = !query
        || item.studentName.toLowerCase().includes(query)
        || (item.rollNumber ?? "").toLowerCase().includes(query);
      return statusMatch && queryMatch;
    });

    list.sort((a, b) => {
      if (sortMode === "NAME") return a.studentName.localeCompare(b.studentName);
      if (sortMode === "STATUS") return a.status.localeCompare(b.status) || a.studentName.localeCompare(b.studentName);
      const rollA = Number(a.rollNumber ?? "99999");
      const rollB = Number(b.rollNumber ?? "99999");
      if (Number.isFinite(rollA) && Number.isFinite(rollB) && rollA !== rollB) return rollA - rollB;
      return (a.rollNumber ?? "ZZZ").localeCompare(b.rollNumber ?? "ZZZ") || a.studentName.localeCompare(b.studentName);
    });

    return list;
  }, [rows, search, filterStatus, sortMode]);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const endIndex = Math.min(filtered.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 6);
  const virtualRows = filtered.slice(startIndex, endIndex);

  function applyRouteFilters() {
    const query = new URLSearchParams();
    query.set("subject", selectedSubjectId);
    query.set("date", date);
    query.set("sessionType", sessionType);
    if (period.trim()) query.set("period", period.trim());
    router.push(`${props.routeBase}?${query.toString()}`);
  }

  function updateRow(rowId: string, patch: Partial<AttendanceRow>) {
    setRows((current) => current.map((row) => (row.enrollmentId === rowId ? { ...row, ...patch } : row)));
  }

  function markAllPresent() {
    if (!props.editable) return;
    setRows((current) => current.map((row) => (row.leaveLocked ? row : { ...row, status: "PRESENT" })));
  }

  function clearDraft() {
    if (!props.editable) return;
    setRows((current) => current.map((row) => (row.leaveLocked ? row : { ...row, status: "PRESENT", remark: "", checkInTime: "" })));
  }

  function payloadRows() {
    return rows.map((row) => ({
      enrollmentId: row.enrollmentId,
      status: row.status,
      remark: row.remark,
      checkInTime: row.checkInTime,
    }));
  }

  function saveDraft() {
    if (!props.editable) return;
    startTransition(async () => {
      const result = await saveTeacherAttendanceDraftAction({
        sectionId: props.sectionId,
        date,
        period,
        sessionType,
        sectionSubjectId: selectedSubjectId,
        rowsJson: JSON.stringify(payloadRows()),
      });
      setFeedback(result.message);
      if (result.ok) router.refresh();
    });
  }

  function submitAttendance() {
    if (!props.editable) return;
    if (!window.confirm("Submit attendance now? This will lock the session for teacher edits.")) return;
    startTransition(async () => {
      const result = await submitTeacherAttendanceAction({
        sectionId: props.sectionId,
        date,
        period,
        sessionType,
        sectionSubjectId: selectedSubjectId,
        rowsJson: JSON.stringify(payloadRows()),
      });
      setFeedback(result.message);
      if (result.ok) router.refresh();
    });
  }

  function requestCorrection(attendanceRecordId: string) {
    if (!attendanceRecordId) return;
    startTransition(async () => {
      const result = await requestAttendanceCorrectionAction({
        sectionId: props.sectionId,
        attendanceRecordId,
        newStatus: correctionStatus,
        reason: correctionReason,
      });
      setFeedback(result.message);
      if (result.ok) {
        setCorrectionTarget(null);
        setCorrectionReason("");
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">Attendance</p>
          <h2 className="text-2xl font-bold text-slate-900">{props.className} · Section {props.sectionName}</h2>
          <p className="mt-1 text-sm text-slate-600">Teacher: {props.teacherName}</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${props.sessionLocked ? "bg-red-50 text-red-700" : props.sessionSubmitted ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
          {props.sessionLocked ? <Lock className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
          {props.sessionLocked ? "Locked" : props.sessionSubmitted ? "Submitted" : "Draft"}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-semibold text-slate-700">Subject
          <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 py-2 font-normal">
            {props.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Date
          <div className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full bg-transparent py-2 font-normal outline-none" />
          </div>
        </label>
        <label className="text-sm font-semibold text-slate-700">Session Type
          <select value={sessionType} onChange={(event) => setSessionType(event.target.value as Props["sessionType"])} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 py-2 font-normal">
            <option value={props.attendanceMode}>{props.attendanceMode}</option>
          </select>
        </label>
        {props.attendanceMode === "PERIOD" ? (
          <label className="text-sm font-semibold text-slate-700">Period
            <input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Optional" className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 py-2 font-normal" />
          </label>
        ) : (
          <div />
        )}
        <div className="flex items-end">
          <button type="button" onClick={applyRouteFilters} className="min-h-11 w-full rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700">Load Session</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Card label="Students" value={counts.students} tone="slate" />
        <Card label="Present" value={counts.present} tone="green" />
        <Card label="Absent" value={counts.absent} tone="red" />
        <Card label="Late" value={counts.late} tone="amber" />
        <Card label="Leave" value={counts.leave} tone="purple" />
        <Card label="Draft" value={counts.draft} tone="blue" />
        <Card label="Submitted" value={counts.submitted} tone="indigo" />
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 p-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or roll number" className="min-h-11 w-full rounded-xl border pl-9 pr-3" />
        </label>
        <label>
          <span className="sr-only">Filter status</span>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as UiStatus | "ALL")} className="min-h-11 rounded-xl border px-3">
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">Leave</option>
            <option value="EXCUSED">Excused</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort rows</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="min-h-11 rounded-xl border px-3">
            <option value="ROLL">Sort by Roll Number</option>
            <option value="NAME">Sort by Name</option>
            <option value="STATUS">Sort by Status</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="button" disabled={!props.editable || pending} onClick={markAllPresent} className="min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50">Mark All Present</button>
          <button type="button" disabled={!props.editable || pending} onClick={clearDraft} className="min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50">Clear</button>
        </div>
      </div>

      {feedback ? <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{feedback}</p> : null}

      <div className="hidden rounded-2xl border border-slate-200 md:block">
        <div className="grid grid-cols-[80px_1fr_170px_1fr_180px] gap-2 border-b bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          <p>Photo</p>
          <p>Name</p>
          <p>Roll</p>
          <p>Remark</p>
          <p>Status</p>
        </div>

        <div className="overflow-auto" style={{ maxHeight: viewportHeight }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
          <div style={{ height: filtered.length * rowHeight }}>
            <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
              {virtualRows.map((row) => (
                <div key={row.enrollmentId} className="border-b px-4 py-3" style={{ minHeight: rowHeight }}>
                  <div className="grid grid-cols-[80px_1fr_170px_1fr_180px] items-start gap-2">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{studentInitials(row.studentName)}</div>
                    <div>
                      <p className="font-semibold text-slate-900">{row.studentName}</p>
                      {row.leaveLocked ? <p className="text-xs font-semibold text-purple-700">Approved leave entry</p> : null}
                    </div>
                    <p className="pt-2 text-sm text-slate-600">{row.rollNumber ?? "-"}</p>
                    <input disabled={!props.editable} value={row.remark} onChange={(event) => updateRow(row.enrollmentId, { remark: event.target.value })} placeholder="Optional remark" className="min-h-10 rounded-lg border px-3 py-2 text-sm disabled:bg-slate-50" />
                    <div className="space-y-2">
                      <select disabled={!props.editable || row.leaveLocked} value={row.status} onChange={(event) => updateRow(row.enrollmentId, { status: event.target.value as UiStatus })} className="min-h-10 w-full rounded-lg border px-2 text-sm disabled:bg-slate-50">
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      {!props.editable && row.attendanceRecordId ? (
                        <button type="button" onClick={() => { setCorrectionTarget(row.attendanceRecordId); setCorrectionStatus(row.status); }} className="text-xs font-semibold text-blue-700">Request Correction</button>
                      ) : null}
                    </div>
                  </div>

                  {correctionTarget === row.attendanceRecordId ? (
                    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 lg:grid-cols-[180px_1fr_auto]">
                      <select value={correctionStatus} onChange={(event) => setCorrectionStatus(event.target.value as UiStatus)} className="min-h-10 rounded-lg border px-2 text-sm">
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Reason for correction" className="min-h-10 rounded-lg border px-3 text-sm" />
                      <button type="button" disabled={pending || correctionReason.trim().length < 5} onClick={() => row.attendanceRecordId && requestCorrection(row.attendanceRecordId)} className="min-h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50">Send</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((row) => (
          <article key={row.enrollmentId} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{row.studentName}</p>
                <p className="text-sm text-slate-600">Roll: {row.rollNumber ?? "-"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusOptions.find((item) => item.value === row.status)?.tone}`}>{statusLabel(row.status)}</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={!props.editable || row.leaveLocked}
                  onClick={() => updateRow(row.enrollmentId, { status: option.value })}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold ${row.status === option.value ? option.tone : "text-slate-600"} disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <input disabled={!props.editable} value={row.remark} onChange={(event) => updateRow(row.enrollmentId, { remark: event.target.value })} placeholder="Remark" className="mt-3 min-h-10 w-full rounded-xl border px-3 text-sm disabled:bg-slate-50" />
          </article>
        ))}
      </div>

      <div className="hidden flex-wrap gap-2 md:flex">
        <button type="button" disabled={!props.editable || pending} onClick={saveDraft} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"><FileDown className="mr-2 inline h-4 w-4" />Save Draft</button>
        <button type="button" disabled={!props.editable || pending} onClick={submitAttendance} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><FileUp className="mr-2 inline h-4 w-4" />Submit Attendance</button>
      </div>

      {props.editable ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-white p-3 md:hidden">
          <button type="button" disabled={pending} onClick={saveDraft} className="min-h-11 flex-1 rounded-xl border px-3 font-semibold text-slate-700 disabled:opacity-50">Save Draft</button>
          <button type="button" disabled={pending} onClick={submitAttendance} className="min-h-11 flex-1 rounded-xl bg-blue-600 px-3 font-semibold text-white disabled:opacity-50">Submit</button>
        </div>
      ) : null}

      {!props.editable ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Attendance locked. Use correction request for any changes.
        </p>
      ) : (
        <p className="text-xs text-slate-500">Attendance can be edited until submission. Lock hour reference: {props.lockHour}:00.</p>
      )}
    </section>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "green" | "red" | "amber" | "purple" | "blue" | "indigo";
}) {
  const map = {
    slate: "bg-slate-50 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    blue: "bg-blue-50 text-blue-700",
    indigo: "bg-indigo-50 text-indigo-700",
  } as const;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-lg font-bold ${map[tone]}`}>{value}</p>
    </article>
  );
}
