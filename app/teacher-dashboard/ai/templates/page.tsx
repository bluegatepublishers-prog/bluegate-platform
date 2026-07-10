import Link from "next/link";
import PromptTemplateManager from "@/components/dashboard/PromptTemplateManager";
import { getPromptTemplates } from "@/lib/ai-studio";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Prompt Templates | Bluegate Teacher Dashboard" };

export default async function AiTemplatesPage() {
  const templates = await getPromptTemplates();
  return <div className="space-y-8 p-4 sm:p-6 lg:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-wider text-blue-700">AI Studio</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Prompt templates</h1><p className="mt-2 text-slate-600">Create reusable instructions for your teaching workflows.</p></div><Link href="/teacher-dashboard/ai" className="rounded-xl border bg-white px-5 py-3 font-semibold text-slate-700">Back to studio</Link></div><PromptTemplateManager templates={templates.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))}/></div>;
}
