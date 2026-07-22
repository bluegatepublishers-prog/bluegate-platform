import Link from "next/link";
import { FolderOpen, Search, X } from "lucide-react";
import { ResourceType } from "@prisma/client";
import SchoolDownloadButton from "@/components/school/SchoolDownloadButton";
import { getSchoolResources } from "@/lib/school-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchoolResourcesPage({ searchParams }: { searchParams: Promise<{ query?: string; class?: string; subject?: string; type?: string }> }) {
  const params = await searchParams;
  const type = Object.values(ResourceType).includes(params.type as ResourceType) ? params.type as ResourceType : undefined;
  const data = await getSchoolResources({ query: params.query?.trim(), classLevel: params.class, subject: params.subject, type });
  const filtered = Boolean(params.query || params.class || params.subject || type);

  return <main className="space-y-8 p-4 sm:p-6 lg:p-8"><header><h1 className="text-3xl font-bold">Resources</h1><p className="mt-2 text-slate-600">Published educational resources available through your school’s entitlement scope.</p></header>
    <form className="grid gap-4 rounded-3xl border bg-white p-6 shadow-sm lg:grid-cols-5"><label className="relative lg:col-span-2"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"/><input name="query" defaultValue={params.query} placeholder="Search resources" className="w-full rounded-xl border py-3 pl-12 pr-4"/></label><select aria-label="Class" name="class" defaultValue={params.class ?? ""} className="rounded-xl border px-4"><option value="">All classes</option>{data.classes.map((item) => <option key={item.classLevel}>{item.classLevel}</option>)}</select><select aria-label="Subject" name="subject" defaultValue={params.subject ?? ""} className="rounded-xl border px-4"><option value="">All subjects</option>{data.subjects.map((item) => <option key={item.subject}>{item.subject}</option>)}</select><select aria-label="Resource type" name="type" defaultValue={type ?? ""} className="rounded-xl border px-4"><option value="">All types</option>{Object.values(ResourceType).map((item) => <option key={item}>{item}</option>)}</select><div className="flex gap-3 lg:col-span-5"><button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Apply filters</button>{filtered ? <Link href="/school-dashboard/resources" className="inline-flex items-center rounded-xl border px-5"><X className="mr-2 h-4 w-4"/>Clear</Link> : null}</div></form>
    {data.total > 100 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Showing the newest 100 of {data.total} matching resources. Refine the filters to narrow the list.</p> : <p className="text-sm font-semibold text-slate-600">{data.total} matching resource{data.total === 1 ? "" : "s"}</p>}
    {data.resources.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.resources.map((resource) => <article key={resource.id} className="rounded-3xl border bg-white p-7 shadow-sm"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{resource.type}</span><h2 className="mt-5 text-xl font-bold">{resource.title}</h2><p className="mt-3 line-clamp-3 text-sm text-slate-600">{resource.description}</p><p className="mt-4 text-sm text-slate-500">{resource.classLevel} · {resource.subject}</p><p className="mt-1 text-sm text-slate-500">{resource.book ? `Book: ${resource.book.title}` : "General school resource"}</p><div className="mt-6"><SchoolDownloadButton resourceId={resource.id}/></div></article>)}</div> : <div className="rounded-3xl border bg-white p-14 text-center"><FolderOpen className="mx-auto h-12 w-12 text-slate-300"/><h2 className="mt-4 text-xl font-bold">{filtered ? "No matching resources" : "No resources available"}</h2><p className="mt-2 text-slate-500">{filtered ? "Try changing or clearing the filters." : "No published resources are currently available in your school scope."}</p></div>}
  </main>;
}
