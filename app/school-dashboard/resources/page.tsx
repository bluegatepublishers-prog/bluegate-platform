import Link from "next/link";
import { FolderOpen, Search, X } from "lucide-react";
import { ResourceType } from "@prisma/client";

import SchoolDownloadButton from "@/components/school/SchoolDownloadButton";
import { getSchoolResources } from "@/lib/school-dashboard";

export default async function SchoolResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; class?: string; subject?: string; type?: string }>;
}) {
  const params = await searchParams;
  const type = Object.values(ResourceType).includes(params.type as ResourceType)
    ? params.type as ResourceType
    : undefined;
  const data = await getSchoolResources({
    query: params.query?.trim(),
    classLevel: params.class,
    subject: params.subject,
    type,
  });
  const filtered = Boolean(params.query || params.class || params.subject || type);

  return (
    <main className="space-y-8 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold">School Resources</h1>
        <p className="mt-2 text-slate-600">
          Browse publisher resources and manage the resources assigned through
          current class sections and subjects.
        </p>
      </header>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Publisher Resources</h2>
            <p className="text-sm text-slate-500">
              Published content remains owned by the publisher.
            </p>
          </div>
          <span className="text-sm font-semibold">{data.catalog.length} resources</span>
        </div>
        {data.catalog.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.catalog.slice(0, 24).map((resource) => (
              <article key={resource.id} className="min-w-0 rounded-2xl border bg-white p-5">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {resource.type}
                </span>
                <h3 className="mt-4 break-words font-bold">{resource.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {resource.classLevel} · {resource.subject} · {resource.audience}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border bg-white p-8 text-slate-500">
            No published resources.
          </p>
        )}
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold">Assign Resources</h2>
        <p className="mt-2 text-slate-600">
          Resource assignments belong to a class section and subject. Open a
          current class to select its resources. Teacher-only resources remain
          hidden from students automatically.
        </p>
        {data.schoolClasses.length ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {data.schoolClasses.map((schoolClass) => (
              <Link
                key={schoolClass.id}
                href={`/school-dashboard/classes/${schoolClass.id}`}
                className="rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700"
              >
                Assign for {schoolClass.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-700">
            Create a current academic session, class, section, and subject first.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold">Assigned Resources</h2>
        <form className="mt-4 grid gap-4 rounded-3xl border bg-white p-6 shadow-sm lg:grid-cols-5">
          <label className="relative lg:col-span-2">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input name="query" defaultValue={params.query} placeholder="Search assigned resources" className="w-full rounded-xl border py-3 pl-12 pr-4" />
          </label>
          <select name="class" defaultValue={params.class ?? ""} className="min-w-0 rounded-xl border px-4">
            <option value="">All classes</option>
            {data.classes.map((item) => <option key={item.classLevel}>{item.classLevel}</option>)}
          </select>
          <select name="subject" defaultValue={params.subject ?? ""} className="min-w-0 rounded-xl border px-4">
            <option value="">All subjects</option>
            {data.subjects.map((item) => <option key={item.subject}>{item.subject}</option>)}
          </select>
          <select name="type" defaultValue={type ?? ""} className="min-w-0 rounded-xl border px-4">
            <option value="">All types</option>
            {Object.values(ResourceType).map((value) => <option key={value}>{value}</option>)}
          </select>
          <div className="flex flex-wrap gap-3 lg:col-span-5">
            <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Apply</button>
            {filtered ? (
              <Link href="/school-dashboard/resources" className="inline-flex items-center rounded-xl border px-5">
                <X className="mr-2 h-4 w-4" /> Clear
              </Link>
            ) : null}
          </div>
        </form>

        {data.resources.length ? (
          <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.resources.map((resource) => (
              <article key={resource.id} className="min-w-0 rounded-3xl border bg-white p-7 shadow-sm">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {resource.type}
                </span>
                <h3 className="mt-5 break-words text-xl font-bold">{resource.title}</h3>
                <p className="mt-3 break-words text-sm text-slate-600">{resource.description}</p>
                <p className="mt-4 text-sm text-slate-500">
                  {resource.classLevel} · {resource.subject} · {resource.audience}
                </p>
                <div className="mt-6"><SchoolDownloadButton resourceId={resource.id} /></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border bg-white p-14 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-xl font-bold">
              {filtered ? "No matching assigned resources" : "No resources assigned"}
            </h3>
          </div>
        )}
      </section>
    </main>
  );
}
