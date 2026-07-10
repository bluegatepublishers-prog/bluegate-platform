import Link from "next/link";
import { Clock3, Sparkles } from "lucide-react";
import AiHistoryActions from "@/components/dashboard/AiHistoryActions";
import { getAiGenerations } from "@/lib/ai-studio";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "AI History | Bluegate Teacher Dashboard" };

export default async function AiHistoryPage() {
  const generations = await getAiGenerations();
  return <div className="space-y-8 p-4 sm:p-6 lg:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-wider text-blue-700">AI Studio</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Generation history</h1><p className="mt-2 text-slate-600">Review and export your saved AI Studio work.</p></div><Link href="/teacher-dashboard/ai" className="rounded-xl border bg-white px-5 py-3 font-semibold text-slate-700">Back to studio</Link></div>{generations.length ? <div className="overflow-x-auto rounded-3xl border bg-white shadow-sm"><table className="w-full min-w-[850px]"><thead className="bg-slate-50 text-left"><tr><th className="p-5">Date</th><th>Tool</th><th>Title</th><th>Status</th><th className="pr-5">Export</th></tr></thead><tbody>{generations.map((item) => <tr key={item.id} className="border-t"><td className="p-5 text-slate-600">{item.createdAt.toLocaleString("en-IN")}</td><td>{item.tool}</td><td className="font-semibold">{item.title}</td><td><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{item.status}</span></td><td className="pr-5"><AiHistoryActions generation={{ ...item, createdAt: item.createdAt.toISOString() }}/></td></tr>)}</tbody></table></div> : <div className="rounded-3xl border bg-white p-14 text-center shadow-sm"><Clock3 className="mx-auto h-12 w-12 text-slate-300"/><h2 className="mt-5 text-xl font-bold">No generations yet</h2><p className="mx-auto mt-2 max-w-lg text-slate-500">Your generated lessons, worksheets, quizzes, and other teaching materials will appear here after AI integration is enabled.</p><Link href="/teacher-dashboard/ai" className="mt-6 inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"><Sparkles className="mr-2 h-4 w-4"/>Explore AI Studio</Link></div>}</div>;
}
