import { getParentChildPortalData } from "@/lib/parent-dashboard";

function statusLabel(value: number) {
  if (value <= 0) return "Not Started";
  if (value >= 85) return "Excellent";
  if (value >= 70) return "On Track";
  if (value >= 50) return "Needs Practice";
  return "Needs Support";
}

export default async function ParentChildLearningPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getParentChildPortalData(studentId);

  return <section className="space-y-6"><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">Subject-wise learning status</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.subjects.map((subject) => <article key={subject.subjectId} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-blue-700">{subject.subject.name}</p><p className="mt-2 font-bold text-slate-950">{statusLabel(subject.completionPercent)}</p><p className="mt-2 text-sm text-slate-600">Recent learning activity and chapter progress are shown only when published by the school.</p></article>)}</div></div><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold text-slate-950">Recent learning activity</h3><div className="mt-4 space-y-3">{data.timeline.length ? data.timeline.map((item) => <div key={`${item.title}-${item.occurredAt.toISOString()}`} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.activityType.toLowerCase()} · {item.completed ? "Completed" : "In progress"}</p></div>) : <p className="text-sm text-slate-500">No recent learning activity yet.</p>}</div></div><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold text-slate-950">Areas needing support</h3><div className="mt-4 space-y-3">{data.gaps.length ? data.gaps.map((gap) => <div key={gap.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{gap.message}</div>) : <p className="text-sm text-slate-500">No support items are visible right now.</p>}</div></div></div></section>;
}