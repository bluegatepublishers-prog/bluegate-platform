import { Bookmark, Search } from "lucide-react";
import ResourceActions from "@/components/dashboard/ResourceActions";
import { getBookmarks } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Bookmarks | Bluegate Teacher Dashboard" };

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const { query } = await searchParams;
  const bookmarks = await getBookmarks(query?.trim());
  return <div className="space-y-8 p-4 sm:p-6 lg:p-8"><div><h1 className="text-3xl font-bold sm:text-4xl">My Bookmarks</h1><p className="mt-2 text-slate-600">Your saved teaching resources.</p></div><form className="rounded-3xl border bg-white p-6 shadow-sm"><label className="relative block max-w-xl"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><input name="query" defaultValue={query} placeholder="Search bookmarks" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4" /></label></form>{bookmarks.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{bookmarks.map(({ resource }) => <article key={resource.id} className="rounded-3xl border bg-white p-7 shadow-sm"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{resource.type}</span><h2 className="mt-5 text-xl font-bold">{resource.title}</h2><p className="mt-3 text-sm text-slate-600">{resource.classLevel} · {resource.subject}</p><ResourceActions resourceId={resource.id} bookmarked /></article>)}</div> : <div className="rounded-3xl border bg-white p-14 text-center"><Bookmark className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-bold">{query ? "No matching bookmarks" : "No bookmarks yet"}</h2></div>}</div>;
}
