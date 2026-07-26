import { getTeacherClassAnalytics } from "@/lib/classroom";

export default async function TeacherClassAnalyticsPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const data = await getTeacherClassAnalytics(sectionId);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Fact label="Enrolled" value={String(data.summary.enrolled)} />
        <Fact label="Participating" value={String(data.summary.participating)} />
        <Fact label="Reading" value={percent(data.summary.reading)} />
        <Fact label="Practice" value={percent(data.summary.practice)} />
        <Fact label="Assessment" value={percent(data.summary.assessment)} />
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Subject learning</h2>
        <p className="mt-2 text-slate-600">Stored factual analytics for students currently enrolled in this class.</p>
        <div className="mt-6 space-y-3">
          {data.subjects.map((subject) => <article key={subject.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_repeat(3,minmax(0,120px))] sm:items-center"><h3 className="font-bold">{subject.name}</h3><FactInline label="Participation" value={String(subject.participating)} /><FactInline label="Practice" value={percent(subject.practice)} /><FactInline label="Assessment" value={percent(subject.assessment)} /></article>)}
        </div>
      </section>
    </div>
  );
}
function percent(value: number | null) { return value === null ? "—" : `${value}%`; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-600">{label}</p></div>; }
function FactInline({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="font-bold">{value}</p></div>; }
