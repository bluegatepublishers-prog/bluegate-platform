import Link from "next/link";
import { AttendanceSessionType, AttendanceStatus } from "@prisma/client";
import { CalendarDays, ClipboardList, Filter, RefreshCw, ShieldAlert } from "lucide-react";

import TeacherAttendanceWorkspace from "@/components/classroom/TeacherAttendanceWorkspace";
import { getTeacherClasses } from "@/lib/classroom";
import { getTeacherAttendanceAccessState, getTeacherAttendanceWorkspace } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  view?: string;
  sectionId?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  sessionType?: string;
  subject?: string;
  period?: string;
}>;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parseDate(value: string | undefined, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function sessionStatus(session: {
  locked: boolean;
  submittedAt: Date | null;
  records: unknown[];
}) {
  if (session.locked) return "LOCKED";
  if (session.submittedAt) return "SUBMITTED";
  if (session.records.length) return "DRAFT";
  return "NOT_STARTED";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusTone(status: string) {
  if (status === "LOCKED") return "bg-emerald-50 text-emerald-700";
  if (status === "SUBMITTED") return "bg-blue-50 text-blue-700";
  if (status === "DRAFT") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function attendanceSummary(records: Array<{ attendanceStatus: AttendanceStatus }>) {
  return {
    total: records.length,
    present: records.filter((record) => record.attendanceStatus === AttendanceStatus.PRESENT).length,
    absent: records.filter((record) => record.attendanceStatus === AttendanceStatus.ABSENT).length,
    late: records.filter((record) => record.attendanceStatus === AttendanceStatus.LATE).length,
    leave: records.filter((record) => record.attendanceStatus === AttendanceStatus.ON_LEAVE).length,
  };
}

function periodValue(input: string | undefined, fallback: string) {
  return input?.trim() || fallback;
}

export default async function TeacherAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const access = await getTeacherAttendanceAccessState();
  const view = query.view === "mark" || query.view === "history" || query.view === "corrections" ? query.view : "today";

  if (access.status === "FEATURE_DISABLED" || access.status === "SUBSCRIPTION_BLOCKED" || access.status === "NO_ACADEMIC_YEAR") {
    return (
      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        <BlockedState title="Attendance unavailable" message={access.message} />
      </main>
    );
  }

  const classes = await getTeacherClasses();
  const selectedSectionId = query.sectionId && classes.some((item) => item.sectionId === query.sectionId)
    ? query.sectionId
    : classes[0]?.sectionId ?? "";
  const selectedAssignment = selectedSectionId ? classes.find((item) => item.sectionId === selectedSectionId) ?? null : null;
  const selectedSubjectId = selectedAssignment?.subjects[0]?.id ?? "";
  const markDate = query.date ?? todayKey();
  const markSessionType = access.attendanceMode;
  const currentDayBounds = dayBounds(new Date());
  const historyFrom = dayBounds(parseDate(query.from, new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))));
  const historyTo = dayBounds(parseDate(query.to, new Date()));

  const [todaySessions, historySessions, corrections, workspace] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: {
        schoolId: access.schoolId,
        academicYearId: access.academicYearId,
        teacherId: access.teacherId,
        date: { gte: currentDayBounds.start, lt: currentDayBounds.end },
      },
      include: {
        classSection: { include: { schoolClass: { select: { name: true } } } },
        sectionSubject: { include: { subject: { select: { name: true } } } },
        records: { select: { attendanceStatus: true } },
      },
      orderBy: [{ classSection: { schoolClass: { sortOrder: "asc" } } }, { classSection: { name: "asc" } }],
    }),
    prisma.attendanceSession.findMany({
      where: {
        schoolId: access.schoolId,
        academicYearId: access.academicYearId,
        teacherId: access.teacherId,
        date: {
          gte: historyFrom.start,
          lt: historyTo.end,
        },
        ...(query.sectionId ? { classSectionId: query.sectionId } : {}),
        ...(query.sessionType && Object.values(AttendanceSessionType).includes(query.sessionType as AttendanceSessionType)
          ? { sessionType: query.sessionType as AttendanceSessionType }
          : {}),
        OR: query.subject?.trim()
          ? [
              { sectionSubject: { subject: { name: { contains: query.subject.trim(), mode: "insensitive" } } } },
              { period: { contains: query.subject.trim(), mode: "insensitive" } },
            ]
          : undefined,
        ...((query.status === "LOCKED" || query.status === "SUBMITTED" || query.status === "DRAFT" || query.status === "NOT_STARTED")
          ? query.status === "NOT_STARTED"
            ? {}
            : query.status === "LOCKED"
              ? { locked: true }
              : query.status === "SUBMITTED"
                ? { submittedAt: { not: null } }
                : { locked: false, submittedAt: null, records: { some: {} } }
          : {}),
      },
      include: {
        classSection: { include: { schoolClass: { select: { name: true } } } },
        sectionSubject: { include: { subject: { select: { name: true } } } },
        records: { select: { attendanceStatus: true } },
      },
      orderBy: [{ date: "desc" }, { period: "asc" }],
      take: 100,
    }),
    prisma.attendanceCorrection.findMany({
      where: {
        createdBy: access.teacherUserId,
        attendanceRecord: {
          attendanceSession: {
            schoolId: access.schoolId,
            academicYearId: access.academicYearId,
          },
        },
      },
      include: {
        attendanceRecord: {
          include: {
            attendanceSession: {
              include: {
                classSection: { include: { schoolClass: { select: { name: true } } } },
                sectionSubject: { include: { subject: { select: { name: true } } } },
              },
            },
            studentEnrollment: {
              include: { student: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    selectedSectionId
      ? getTeacherAttendanceWorkspace({
          sectionId: selectedSectionId,
          date: markDate,
          sessionType: markSessionType,
          period: periodValue(query.period, access.attendanceMode === "PERIOD" ? "" : ""),
          sectionSubjectId: selectedSubjectId,
        })
      : Promise.resolve(null),
  ]);

  const todayBySection = new Map<string, typeof todaySessions[number][]>();
  for (const session of todaySessions) {
    const list = todayBySection.get(session.classSectionId) ?? [];
    list.push(session);
    todayBySection.set(session.classSectionId, list);
  }

  const historyRows = historySessions.map((session) => {
    const summary = attendanceSummary(session.records);
    return {
      id: session.id,
      date: session.date.toISOString().slice(0, 10),
      classLabel: `${session.classSection.schoolClass.name} - ${session.classSection.name}`,
      subjectLabel: session.sectionSubject?.subject.name ?? session.period ?? "General",
      status: sessionStatus(session),
      submittedAt: session.submittedAt,
      summary,
      viewHref: `/teacher-dashboard/attendance?view=mark&sectionId=${session.classSectionId}&date=${session.date.toISOString().slice(0, 10)}${session.sectionSubject?.id ? `&subject=${session.sectionSubject.id}` : ""}${session.period ? `&period=${encodeURIComponent(session.period)}` : ""}`,
    };
  });

  const attendanceVisible = access.status === "READY" || access.status === "NO_ASSIGNMENTS";

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Teacher Attendance</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Attendance</h1>
          <p className="mt-2 text-sm text-slate-600">
            Mark attendance for your assigned classes, review history, and manage correction requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabLink active={view === "today"} href="/teacher-dashboard/attendance" icon={CalendarDays}>Today</TabLink>
          <TabLink active={view === "mark"} href={selectedSectionId ? `/teacher-dashboard/attendance?view=mark&sectionId=${selectedSectionId}` : "/teacher-dashboard/attendance?view=mark"} icon={ClipboardList}>Mark Attendance</TabLink>
          <TabLink active={view === "history"} href="/teacher-dashboard/attendance?view=history" icon={Filter}>History</TabLink>
          <TabLink active={view === "corrections"} href="/teacher-dashboard/attendance?view=corrections" icon={RefreshCw}>Corrections</TabLink>
        </div>
      </header>
    
      {view === "today" ? (
        <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Today&apos;s assigned classes</h2>
              <p className="mt-1 text-sm text-slate-600">{access.policy.attendanceMode} attendance mode · {classes.length} active assignment(s)</p>
            </div>
          </div>

          {classes.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {classes.map((assignment) => {
                const sectionSessions = todayBySection.get(assignment.sectionId) ?? [];
                const derivedStatus = sectionSessions.some((session) => session.locked)
                  ? "LOCKED"
                  : sectionSessions.some((session) => session.submittedAt)
                    ? "SUBMITTED"
                    : sectionSessions.some((session) => session.records.length)
                      ? "DRAFT"
                      : "NOT_STARTED";
                const markedCount = sectionSessions.reduce((sum, session) => sum + session.records.length, 0);
                const absentCount = sectionSessions.reduce(
                  (sum, session) => sum + session.records.filter((record) => record.attendanceStatus === AttendanceStatus.ABSENT).length,
                  0,
                );
                const totalStudents = assignment.studentCount;

                return (
                  <article key={assignment.sectionId} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">{assignment.className} - {assignment.sectionName}</h3>
                        <p className="mt-1 text-sm text-slate-600">{assignment.subjects.map((item) => item.name).join(", ") || "General attendance"}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(derivedStatus)}`}>{statusLabel(derivedStatus)}</span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Stat label="Students" value={totalStudents} />
                      <Stat label="Marked" value={markedCount} />
                      <Stat label="Absent" value={absentCount} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/teacher-dashboard/attendance?view=mark&sectionId=${assignment.sectionId}${assignment.subjects[0]?.id ? `&subject=${assignment.subjects[0].id}` : ""}`}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {derivedStatus === "NOT_STARTED" ? "Mark Attendance" : derivedStatus === "DRAFT" ? "Continue" : "View"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No assigned classes" description="Attendance only appears once the school assigns you an active class or section." />
          )}
        </section>
      ) : null}

      {view === "mark" ? (
        <section className="space-y-4">
          {classes.length ? (
            <>
              <div className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Mark Attendance</h2>
                    <p className="mt-1 text-sm text-slate-600">Choose a class section and update the roster below.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-semibold">Selected section</p>
                    <p className="mt-1">{selectedAssignment ? `${selectedAssignment.className} - ${selectedAssignment.sectionName}` : "No section selected"}</p>
                  </div>
                </div>
              </div>

              {workspace ? (
                <TeacherAttendanceWorkspace
                  routeBase="/teacher-dashboard/attendance"
                  sectionId={selectedSectionId}
                  className={workspace.scope.schoolClass.name}
                  sectionName={workspace.scope.section.name}
                  teacherName={workspace.scope.teacher.user.name}
                  attendanceMode={workspace.policy.attendanceMode}
                  subjects={workspace.scope.sectionSubjects.map((item) => ({ id: item.id, name: item.subject.name }))}
                  selectedSubjectId={workspace.scope.sectionSubjects.some((item) => item.id === selectedSubjectId)
                    ? selectedSubjectId
                    : workspace.scope.sectionSubjects[0]?.id ?? ""}
                  date={workspace.session.date.toISOString()}
                  period={workspace.session.period ?? ""}
                  sessionType={workspace.session.sessionType}
                  editable={workspace.editable}
                  sessionLocked={workspace.session.locked}
                  sessionSubmitted={Boolean(workspace.session.submittedAt)}
                  lockHour={workspace.lockHour}
                  rows={workspace.roster}
                />
              ) : (
                <EmptyState title="Pick a section" description="Select a class from Today to load the attendance roster." />
              )}
            </>
          ) : (
            <EmptyState title="No assigned classes" description="You can start marking attendance once a school administrator assigns a class to you." />
          )}
        </section>
      ) : null}

      {view === "history" ? (
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">History</h2>
              <p className="mt-1 text-sm text-slate-600">Filter your attendance records by date, class, subject, and status.</p>
            </div>
            <form className="flex flex-wrap gap-2">
              <input type="hidden" name="view" value="history" />
              <input type="date" name="from" defaultValue={query.from ?? todayKey()} className="min-h-11 rounded-xl border px-3" />
              <input type="date" name="to" defaultValue={query.to ?? todayKey()} className="min-h-11 rounded-xl border px-3" />
              <select name="sectionId" defaultValue={query.sectionId ?? ""} className="min-h-11 rounded-xl border px-3">
                <option value="">All sections</option>
                {classes.map((assignment) => <option key={assignment.sectionId} value={assignment.sectionId}>{assignment.className} - {assignment.sectionName}</option>)}
              </select>
              <select name="status" defaultValue={query.status ?? ""} className="min-h-11 rounded-xl border px-3">
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="LOCKED">Locked</option>
              </select>
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Apply</button>
            </form>
          </div>

          <div className="mt-5 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Class / Section</th>
                  <th className="px-3 py-2">Subject / Period</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Present</th>
                  <th className="px-3 py-2">Absent</th>
                  <th className="px-3 py-2">Late / Leave</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length ? historyRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{new Date(`${row.date}T00:00:00.000Z`).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2">{row.classLabel}</td>
                    <td className="px-3 py-2">{row.subjectLabel}</td>
                    <td className="px-3 py-2">{row.summary.total}</td>
                    <td className="px-3 py-2">{row.summary.present}</td>
                    <td className="px-3 py-2">{row.summary.absent}</td>
                    <td className="px-3 py-2">{row.summary.late} / {row.summary.leave}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(row.status)}`}>{statusLabel(row.status)}</span></td>
                    <td className="px-3 py-2">{row.submittedAt ? row.submittedAt.toLocaleString("en-IN") : "-"}</td>
                    <td className="px-3 py-2"><Link href={row.viewHref} className="font-semibold text-blue-700">View</Link></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">No attendance history for this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "corrections" ? (
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Corrections</h2>
              <p className="mt-1 text-sm text-slate-600">Review your recent correction requests and open a session to request a new one.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {corrections.length ? corrections.map((correction) => (
              <article key={correction.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{correction.attendanceRecord.studentEnrollment.student.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {correction.attendanceRecord.attendanceSession.classSection.schoolClass.name} - {correction.attendanceRecord.attendanceSession.classSection.name}
                      {correction.attendanceRecord.attendanceSession.sectionSubject?.subject.name ? ` · ${correction.attendanceRecord.attendanceSession.sectionSubject.subject.name}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{correction.previousStatus} → {correction.newStatus}</p>
                    <p className="mt-2 text-sm text-slate-700">{correction.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{correction.decisionStatus}</p>
                    <p className="mt-1 text-xs text-slate-500">{correction.createdAt.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </article>
            )) : (
              <EmptyState title="No correction requests yet" description="Locked sessions can be corrected from the Mark Attendance tab once the school approves changes." />
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function TabLink({ active, href, icon: Icon, children }: { active: boolean; href: string; icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
        active ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function BlockedState({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-1 h-5 w-5" />
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-2 text-sm">{message}</p>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-slate-50 p-8 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
