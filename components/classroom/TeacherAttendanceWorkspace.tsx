"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileDown, FileUp, Lock, Search } from "lucide-react";

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


export default function TeacherAttendanceWorkspace(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [selectedSubjectId, setSelectedSubjectId] = useState(props.selectedSubjectId);
  const [date, setDate] = useState(toDateInput(props.date));
  const [period, setPeriod] = useState(props.period);
  const [sessionType, setSessionType] = useState<Props["sessionType"]>(props.attendanceMode);

  const [rows, setRows] = useState<AttendanceRow[]>(props.rows);
  const [search, setSearch] = useState("");
  const [detailsTarget, setDetailsTarget] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState<UiStatus>("PRESENT");
  const [feedback, setFeedback] = useState("");

  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 48;
  const viewportHeight = 640;


  const counts = useMemo(() => {
    const summary = { students: rows.length, present: 0, absent: 0, other: 0 };
    for (const row of rows) {
      if (row.status === "PRESENT") summary.present += 1;
      else if (row.status === "ABSENT") summary.absent += 1;
      else summary.other += 1;
    }
    return summary;
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((item) => !query
      || item.studentName.toLowerCase().includes(query)
      || (item.rollNumber ?? "").toLowerCase().includes(query));
  }, [rows, search]);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const endIndex = Math.min(filtered.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 6);
  const virtualRows = filtered.slice(startIndex, endIndex);

  function applyRouteFilters() {
    const query = new URLSearchParams();
    query.set("sectionId", props.sectionId);
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
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Attendance</p>
          <h2 className="mt-0.5 truncate text-lg font-bold text-slate-950 sm:text-xl">{props.className} · Section {props.sectionName}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            <span aria-hidden="true">·</span>
            <span>{props.subjects.find((subject) => subject.id === selectedSubjectId)?.name ?? "General"}</span>
            <span aria-hidden="true">·</span>
            <span>{sessionType}</span>
            <span aria-hidden="true">·</span>
            <span className={`font-semibold ${props.sessionLocked ? "text-red-700" : props.sessionSubmitted ? "text-emerald-700" : "text-amber-700"}`}>
              {props.sessionLocked ? "Locked" : props.sessionSubmitted ? "Submitted" : "Draft"}
            </span>
          </div>
        </div>
        {!props.editable ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            <Lock className="h-3.5 w-3.5" /> Read only
          </span>
        ) : null}
      </header>

      <div className="grid gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(130px,0.9fr)_minmax(120px,0.75fr)_auto] sm:items-end" aria-label="Attendance session controls">
        <label className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Subject</span>
          <select aria-label="Attendance subject" value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500">
            {props.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</span>
          <span className="mt-1 flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input aria-label="Attendance date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" />
          </span>
        </label>
        <label className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Session</span>
          <select aria-label="Attendance session type" value={sessionType} onChange={(event) => setSessionType(event.target.value as Props["sessionType"])} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500">
            <option value={props.attendanceMode}>{props.attendanceMode}</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          {props.attendanceMode === "PERIOD" ? (
            <label className="min-w-0 flex-1 sm:w-24 sm:flex-none">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Period</span>
              <input aria-label="Attendance period" value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Optional" className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500" />
            </label>
          ) : null}
          <button type="button" onClick={applyRouteFilters} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">Load Session</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
          <span>Students: <strong className="text-slate-950">{counts.students}</strong></span>
          <span className="text-emerald-700">Present: <strong>{counts.present}</strong></span>
          <span className="text-red-700">Absent: <strong>{counts.absent}</strong></span>
          {counts.other ? <span className="text-slate-500">Other: <strong>{counts.other}</strong></span> : null}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search students</span>
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="h-8 w-28 rounded-lg border border-slate-200 pl-7 pr-2 text-xs outline-none focus:border-blue-500 sm:w-36" />
          </label>
          <button type="button" disabled={!props.editable || pending} onClick={markAllPresent} className="h-8 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Mark All Present</button>
        </div>
      </div>

      {feedback ? <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700" role="status">{feedback}</p> : null}

      {filtered.length ? (
        <div className="rounded-xl border border-slate-200">
          <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] gap-2 border-b bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[64px_minmax(0,1fr)_minmax(210px,auto)]">
            <p># / Roll</p>
            <p>Student Name</p>
            <p className="text-right">Status</p>
          </div>
          <div className="overflow-auto" style={{ maxHeight: viewportHeight }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
            <div style={{ height: filtered.length * rowHeight }}>
              <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
                {virtualRows.map((row, index) => {
                  const currentStatus = statusOptions.find((option) => option.value === row.status);
                  const showDetails = detailsTarget === row.enrollmentId;
                  return (
                    <div key={row.enrollmentId} className="relative grid min-h-[48px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0 sm:grid-cols-[64px_minmax(0,1fr)_minmax(210px,auto)]">
                      <p className="text-xs tabular-nums text-slate-500">{row.rollNumber ?? String(startIndex + index + 1).padStart(2, "0")}</p>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{row.studentName}</p>
                        {row.leaveLocked ? <p className="text-[11px] font-semibold text-purple-700">Approved leave</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button type="button" disabled={!props.editable || row.leaveLocked || pending} onClick={() => updateRow(row.enrollmentId, { status: "PRESENT" })} aria-label={`Mark ${row.studentName} present`} className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition ${row.status === "PRESENT" ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"} disabled:cursor-not-allowed disabled:opacity-50`}>P</button>
                        <button type="button" disabled={!props.editable || row.leaveLocked || pending} onClick={() => updateRow(row.enrollmentId, { status: "ABSENT" })} aria-label={`Mark ${row.studentName} absent`} className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition ${row.status === "ABSENT" ? "border-red-600 bg-red-600 text-white" : "border-red-200 text-red-700 hover:bg-red-50"} disabled:cursor-not-allowed disabled:opacity-50`}>A</button>
                        {row.status !== "PRESENT" && row.status !== "ABSENT" ? <span className={`hidden rounded-md px-2 py-1 text-[11px] font-semibold sm:inline-flex ${currentStatus?.tone ?? "bg-slate-100 text-slate-600"}`}>{currentStatus?.label ?? row.status}</span> : null}
                        <button type="button" onClick={() => setDetailsTarget(showDetails ? null : row.enrollmentId)} aria-expanded={showDetails} aria-label={`${showDetails ? "Hide" : "Show"} more options for ${row.studentName}`} className="h-8 rounded-md border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">More</button>
                      </div>
                      {showDetails ? (
                        <div className="absolute left-2 right-2 top-full z-20 grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                          <label className="text-[11px] font-semibold text-slate-500">
                            Status
                            <select disabled={!props.editable || row.leaveLocked || pending} value={row.status} onChange={(event) => updateRow(row.enrollmentId, { status: event.target.value as UiStatus })} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs font-normal text-slate-700 disabled:bg-slate-50">
                              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <label className="text-[11px] font-semibold text-slate-500">
                            Remark
                            <input disabled={!props.editable} value={row.remark} onChange={(event) => updateRow(row.enrollmentId, { remark: event.target.value })} placeholder="Optional" className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs font-normal text-slate-700 disabled:bg-slate-50" />
                          </label>
                          {!props.editable && row.attendanceRecordId ? (
                            <button type="button" onClick={() => { setCorrectionTarget(row.attendanceRecordId); setCorrectionStatus(row.status); }} className="self-end h-8 rounded-md px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Request Correction</button>
                          ) : null}
                          {correctionTarget === row.attendanceRecordId ? (
                            <div className="grid gap-2 sm:col-span-3 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                              <select value={correctionStatus} onChange={(event) => setCorrectionStatus(event.target.value as UiStatus)} className="h-8 rounded-md border border-slate-200 px-2 text-xs">
                                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                              <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Reason for correction" className="h-8 rounded-md border border-slate-200 px-2 text-xs" />
                              <button type="button" disabled={pending || correctionReason.trim().length < 5} onClick={() => row.attendanceRecordId && requestCorrection(row.attendanceRecordId)} className="h-8 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white disabled:opacity-50">Send</button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {rows.length ? "No students match this search." : "No students are enrolled in this section."}
        </div>
      )}

      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span>Total: <strong className="text-slate-950">{counts.students}</strong></span>
          <span className="text-emerald-700">Present: <strong>{counts.present}</strong></span>
          <span className="text-red-700">Absent: <strong>{counts.absent}</strong></span>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={!props.editable || pending} onClick={saveDraft} className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"><FileDown className="mr-1 inline h-3.5 w-3.5" />Save Draft</button>
          <button type="button" disabled={!props.editable || pending} onClick={submitAttendance} className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white disabled:opacity-50"><FileUp className="mr-1 inline h-3.5 w-3.5" />Submit Attendance</button>
        </div>
      </div>

      {!props.editable ? <p className="text-xs font-semibold text-amber-800">Attendance is read-only. Use More → Request Correction for changes.</p> : <p className="text-[11px] text-slate-400">Editable until submission · lock hour {props.lockHour}:00</p>}
    </section>
  );
}
