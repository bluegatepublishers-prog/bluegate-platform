import Link from "next/link";

import { ResourceType } from "@prisma/client";

import { getMentorDashboard } from "@/lib/mentor-dashboard";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  q?: string;
  subject?: string;
  classLevel?: string;
  type?: string;
  source?: string;
}>;

export default async function MentorResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const dashboard = await getMentorDashboard();

  const publisherId = dashboard.mentor.publisherId;
  const schoolIds = [...new Set(dashboard.assignments.map((item) => item.assignment.schoolId))];
  const sectionIds = [...new Set(dashboard.assignments.map((item) => item.enrollment.sectionId))];

  const sectionSubjects = sectionIds.length
    ? await prisma.sectionSubject.findMany({ where: { sectionId: { in: sectionIds }, active: true }, select: { id: true } })
    : [];

  let resources = sectionSubjects.length
    ? await prisma.resource.findMany({
        where: {
          publisherId,
          published: true,
          archived: false,
          audience: { in: ["TEACHER_ONLY", "BOTH"] },
          schoolEntitlements: { some: { schoolId: { in: schoolIds }, status: "ACTIVE" } },
          sectionSubjects: { some: { id: { in: sectionSubjects.map((item) => item.id) } } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  if (params.q) {
    const query = params.q.toLowerCase();
    resources = resources.filter((resource) => resource.title.toLowerCase().includes(query) || resource.description.toLowerCase().includes(query));
  }
  if (params.subject) resources = resources.filter((resource) => resource.subject.toLowerCase() === params.subject!.toLowerCase());
  if (params.classLevel) resources = resources.filter((resource) => resource.classLevel.toLowerCase() === params.classLevel!.toLowerCase());
  if (params.type) resources = resources.filter((resource) => resource.type === params.type);
  if (params.source) {
    resources = resources.filter((resource) => {
      if (params.source === "publisher") return Boolean(resource.publisherId);
      if (params.source === "school") return !resource.publisherId;
      return true;
    });
  }

  const subjectOptions = [...new Set(resources.map((resource) => resource.subject))];
  const classOptions = [...new Set(resources.map((resource) => resource.classLevel))];

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Resources</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Resources</h1>
        <p className="mt-2 text-slate-600">Authorized publisher and school resources only.</p>
      </header>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-6" method="get">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search resource" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
        <select name="subject" defaultValue={params.subject ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Subjects</option>
          {subjectOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select name="classLevel" defaultValue={params.classLevel ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Classes</option>
          {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select name="type" defaultValue={params.type ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Types</option>
          {Object.values(ResourceType).map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select name="source" defaultValue={params.source ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Sources</option>
          <option value="publisher">Publisher Resources</option>
          <option value="school">School-shared Resources</option>
        </select>
        <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>

      {resources.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <article key={resource.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{resource.type}</p>
              <h2 className="mt-2 text-lg font-bold text-slate-950">{resource.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{resource.subject} · {resource.classLevel}</p>
              <p className="mt-3 text-sm text-slate-600">{resource.description.slice(0, 120)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/api/resources/${resource.id}/download`} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Open Resource</Link>
                <Link href={`/api/resources/${resource.id}/download`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Download</Link>
                <Link href="/mentor-dashboard/students" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Link to Support Plan</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">No authorized resources match your filters.</section>
      )}
    </main>
  );
}
