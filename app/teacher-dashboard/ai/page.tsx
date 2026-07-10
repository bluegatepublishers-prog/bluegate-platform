import Link from "next/link";
import { BookOpenCheck, ClipboardList, FileQuestion, FileText, History, MessageSquareText, Presentation, Sparkles, WandSparkles } from "lucide-react";
import { requireTeacher } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "AI Studio | Bluegate Teacher Dashboard" };

const tools = [
  { title: "Lesson Plan Builder", description: "Structure learning objectives, activities, differentiation, and assessment for a lesson.", icon: ClipboardList },
  { title: "Worksheet Creator", description: "Design classroom-ready practice questions around a topic and class level.", icon: FileText },
  { title: "Quiz Generator", description: "Prepare balanced question sets with configurable difficulty and formats.", icon: FileQuestion },
  { title: "Presentation Outline", description: "Turn a teaching topic into a clear, sequenced slide outline.", icon: Presentation },
  { title: "Reading Companion", description: "Draft vocabulary, comprehension prompts, and discussion activities.", icon: BookOpenCheck },
  { title: "Feedback Assistant", description: "Create constructive feedback frameworks for common student needs.", icon: MessageSquareText },
];

export default async function AiStudioPage() {
  await requireTeacher();
  return <div className="space-y-8 p-4 sm:p-6 lg:p-8"><header className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 p-7 text-white shadow-sm sm:p-10"><div className="flex items-center gap-3 text-blue-100"><Sparkles className="h-5 w-5"/><span className="text-sm font-bold uppercase tracking-[0.2em]">Phase 6.1 framework</span></div><h1 className="mt-4 text-3xl font-bold sm:text-4xl">AI Studio</h1><p className="mt-3 max-w-3xl leading-7 text-blue-100">Prepare teaching workflows and reusable prompts in one secure workspace. AI generation will be enabled in a later phase.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/teacher-dashboard/ai/templates" className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-700">Manage templates</Link><Link href="/teacher-dashboard/ai/history" className="inline-flex items-center rounded-xl border border-white/30 px-5 py-3 font-semibold"><History className="mr-2 h-4 w-4"/>View history</Link></div></header><section><div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold">Teaching tools</h2><p className="mt-2 text-slate-600">Provider-ready interfaces for upcoming assisted workflows.</p></div><WandSparkles className="hidden h-8 w-8 text-blue-600 sm:block"/></div><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{tools.map(({ title, description, icon: Icon }) => <article key={title} className="flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon className="h-6 w-6"/></div><h3 className="mt-6 text-xl font-bold">{title}</h3><p className="mt-3 flex-1 leading-6 text-slate-600">{description}</p><button disabled className="mt-6 w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-500">Coming in the AI integration phase</button></article>)}</div></section></div>;
}
