import Link from "next/link";
import { FolderOpen, Search, X } from "lucide-react";
import { ResourceType } from "@prisma/client";

import ResourceActions from "@/components/dashboard/ResourceActions";
import { getResources } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Resources | Bluegate Teacher Dashboard" };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ query?: string; class?: string; subject?: string; type?: string }> }) {
  const params = await searchParams;
  const type = Object.values(ResourceType).includes(params.type as ResourceType) ? params.type as ResourceType : undefined;
  const data = await getResources({ query: params.query?.trim(), classLevel: params.class, subject: params.subject, type });
  const filtered = Boolean(params.query || params.class || params.subject || type);

  return <div className="space-y-8 p-4 sm:p-6 lg:p-8">
    <div><h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Resources</h1><p className="mt-2 text-slate-600">Browse, bookmark, and download teaching resources.</p></div>
    <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-5">
      <label className="relative lg:col-span-2"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><input name="query" defaultValue={params.query} placeholder="Search resources" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4" /></label>
      <select name="class" defaultValue={params.class ?? ""} className="rounded-xl border border-slate-300 px-4"><option value="">All classes</option>{data.classes.map(({ classLevel }) => <option key={classLevel}>{classLevel}</option>)}</select>
      <select name="subject" defaultValue={params.subject ?? ""} className="rounded-xl border border-slate-300 px-4"><option value="">All subjects</option>{data.subjects.map(({ subject }) => <option key={subject}>{subject}</option>)}</select>
      <select name="type" defaultValue={type ?? ""} className="rounded-xl border border-slate-300 px-4"><option value="">All types</option>{Object.values(ResourceType).map((value) => <option key={value}>{value}</option>)}</select>
      <div className="flex gap-3 lg:col-span-5"><button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Apply filters</button>{filtered ? <Link href="/teacher-dashboard/resources" className="inline-flex items-center rounded-xl border px-5"><X className="mr-2 h-4 w-4" />Clear</Link> : null}</div>
    </form>
    {data.resources.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.resources.map((resource) => <article key={resource.id} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{resource.type}</span><h2 className="mt-5 text-xl font-bold">{resource.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{resource.description}</p><div className="mt-4 flex gap-2 text-sm"><span className="rounded-full bg-slate-100 px-3 py-1">{resource.classLevel}</span><span className="rounded-full bg-slate-100 px-3 py-1">{resource.subject}</span></div><ResourceActions resourceId={resource.id} bookmarked={data.bookmarkedIds.has(resource.id)} /></article>)}</div> : <div className="rounded-3xl border bg-white p-14 text-center"><FolderOpen className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-bold">{filtered ? "No matching resources" : "No resources available"}</h2></div>}
  </div>;
}
