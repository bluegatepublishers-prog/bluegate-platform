import { prisma } from "@/lib/prisma";
import { getParentChildren } from "@/lib/parent-dashboard";

export default async function ParentHelpPage() {
  const { children } = await getParentChildren();
  const schoolIds = [...new Set(children.map((child) => child.student.schoolId))];
  const schools = schoolIds.length ? await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: {
      id: true,
      schoolName: true,
      city: true,
      state: true,
      publisher: { select: { name: true, supportEmail: true, supportPhone: true, websiteUrl: true } },
    },
  }) : [];

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Contact School Office</h2>
        <p className="mt-2 text-slate-600">For account verification, linked children and parent access support, contact the school office below.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {schools.map((school) => <article key={school.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">{school.schoolName}</p><h3 className="mt-2 text-xl font-bold text-slate-950">{school.publisher?.name ?? "School office"}</h3><p className="mt-2 text-slate-600">{school.city}, {school.state}</p><div className="mt-4 space-y-2 text-sm text-slate-700">{school.publisher?.supportEmail ? <p>Email: {school.publisher.supportEmail}</p> : null}{school.publisher?.supportPhone ? <p>Phone: {school.publisher.supportPhone}</p> : null}{school.publisher?.websiteUrl ? <p>Website: {school.publisher.websiteUrl}</p> : null}</div></article>)}
        {!schools.length ? <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-slate-600">No linked school office contact is available yet.</p></article> : null}
      </section>
    </main>
  );
}