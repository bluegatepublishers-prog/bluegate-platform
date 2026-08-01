import Link from "next/link";

import { getParentChildPortalData } from "@/lib/parent-dashboard";

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not available";
}

export default async function ParentChildOverviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getParentChildPortalData(studentId);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,.95fr)]">
      <section className="space-y-6">
        <Card title="Child Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <KeyValue label="Child" value={data.student.name} />
            <KeyValue label="Class and section" value={`${data.enrollment.schoolClass.name} ${data.enrollment.section.name}`} />
            <KeyValue label="School" value={data.student.school.schoolName} />
            <KeyValue label="Class teacher" value={data.classTeacher ?? "Not assigned yet"} />
          </div>
        </Card>

        <Card title="Attendance Summary">
          <p className="text-slate-600">Attendance data is not available yet.</p>
        </Card>

        <Card title="Current Learning Status">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{data.overallStatus}</span>
            <p className="text-slate-600">Based on published learning activity, subject progress and school-approved records.</p>
          </div>
        </Card>

        <Card title="Upcoming Work">
          <div className="grid gap-4 md:grid-cols-2">
            <ListColumn title="Assignments" items={data.upcomingAssignments.map((item) => `${item.title} · Due ${formatDate(item.dueAt)}`)} emptyLabel="No upcoming assignments" />
            <ListColumn title="Assessments" items={data.upcomingAssessments.map((item) => `${item.title} · ${item.released ? "Result published" : `Opens ${formatDate(item.opensAt)}`}`)} emptyLabel="No upcoming assessments" />
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <Card title="Published Teacher Remarks">
          {data.latestFeedback ? <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-blue-700">{data.latestFeedback.title}</p><p className="mt-2 text-slate-700">{data.latestFeedback.feedback}</p></div> : <p className="text-sm text-slate-500">No released remarks yet.</p>}
        </Card>

        <Card title="Latest Result">
          {data.latestPublishedResult ? <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-emerald-700">{data.latestPublishedResult.title}</p><p className="mt-2 text-slate-700">{data.latestPublishedResult.score == null ? "Result published" : `Score ${Math.round(data.latestPublishedResult.score)}%`}</p></div> : <p className="text-sm text-slate-500">No published result yet.</p>}
        </Card>

        <Card title="Latest Notice">
          {data.latestNotice ? <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-blue-700">{data.latestNotice.type}</p><p className="mt-2 font-semibold text-slate-950">{data.latestNotice.title}</p><p className="mt-1 text-sm text-slate-600">{data.latestNotice.description ?? "Published by the school."}</p></div> : <p className="text-sm text-slate-500">No applicable notice is available yet.</p>}
        </Card>

        <Card title="Learning Support Summary">
          {data.gaps.length ? <div className="space-y-3">{data.gaps.slice(0, 4).map((gap) => <div key={gap.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{gap.message}</div>)}</div> : <p className="text-sm text-slate-500">No support items are visible right now.</p>}
        </Card>

        <Card title="School Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <KeyValue label="Academic year" value={data.enrollment.academicYear.name} />
            <KeyValue label="Relationship" value={data.relationship.relationshipType.toLowerCase()} />
          </div>
          <div className="mt-4"><Link href={`/parent-dashboard/children/${data.student.id}/reports`} className="font-semibold text-blue-700">Open reports</Link></div>
        </Card>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">{title}</h2><div className="mt-5">{children}</div></section>;
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>;
}

function ListColumn({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return <div><h3 className="font-semibold text-slate-950">{title}</h3><div className="mt-3 space-y-3">{items.length ? items.map((item) => <div key={item} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">{item}</div>) : <p className="text-sm text-slate-500">{emptyLabel}</p>}</div></div>;
}