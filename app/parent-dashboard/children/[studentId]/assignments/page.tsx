import { getParentChildPortalData } from "@/lib/parent-dashboard";

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not scheduled";
}

export default async function ParentChildAssignmentsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getParentChildPortalData(studentId);
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">Assignments</h2><div className="mt-5 space-y-4">{data.upcomingAssignments.length ? data.upcomingAssignments.map((assignment) => <article key={assignment.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-blue-700">{assignment.subject ?? "Assignment"}</p><h3 className="mt-1 font-bold text-slate-950">{assignment.title}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{assignment.status.toLowerCase()}</span></div><p className="mt-3 text-sm text-slate-600">Due {formatDate(assignment.dueAt)}</p><p className="mt-1 text-sm text-slate-600">{assignment.isLate ? "Late" : "On time or not yet submitted"}</p>{assignment.teacherFeedback ? <p className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">{assignment.teacherFeedback}</p> : null}</article>) : <p className="text-sm text-slate-500">No upcoming assignments are available.</p>}</div></section>;
}