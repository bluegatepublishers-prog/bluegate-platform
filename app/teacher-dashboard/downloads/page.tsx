import { Download, Search } from "lucide-react";
import ResourceActions from "@/components/dashboard/ResourceActions";
import { getDownloads } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Downloads | Bluegate Teacher Dashboard" };

export default async function DownloadsPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const { query } = await searchParams;
  const downloads = await getDownloads(query?.trim());
  return <div className="space-y-8 p-4 sm:p-6 lg:p-8"><div><h1 className="text-3xl font-bold sm:text-4xl">My Downloads</h1><p className="mt-2 text-slate-600">Your complete resource download history.</p></div><form className="rounded-3xl border bg-white p-6 shadow-sm"><label className="relative block max-w-xl"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><input name="query" defaultValue={query} placeholder="Search downloads" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4" /></label></form>{downloads.length ? <div className="overflow-x-auto rounded-3xl border bg-white shadow-sm"><table className="w-full min-w-[850px]"><thead className="bg-slate-50 text-left"><tr><th className="p-5">Resource</th><th>Subject</th><th>Class</th><th>Type</th><th>Downloaded</th><th className="pr-5">Action</th></tr></thead><tbody>{downloads.map((item) => <tr key={item.id} className="border-t"><td className="p-5 font-semibold">{item.resource.title}</td><td>{item.resource.subject}</td><td>{item.resource.classLevel}</td><td>{item.resource.type}</td><td>{item.downloadedAt.toLocaleString("en-IN")}</td><td className="w-64 pr-5"><ResourceActions resourceId={item.resourceId} /></td></tr>)}</tbody></table></div> : <Empty icon={Download} title={query ? "No matching downloads" : "No downloads yet"} />}</div>;
}
function Empty({ icon: Icon, title }: { icon: typeof Download; title: string }) { return <div className="rounded-3xl border bg-white p-14 text-center"><Icon className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-2 text-slate-500">Downloaded resources will appear here.</p></div>; }
