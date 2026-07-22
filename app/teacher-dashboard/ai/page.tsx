import Link from "next/link";
import { ClipboardList, FileText, History, Sparkles } from "lucide-react";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getTeacherAiEntitlement } from "@/lib/ai/quota";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "AI Studio | Bluegate Teacher Dashboard" };

const tools = [
	{ title: "Question paper", description: "Choose a class, subject, book, chapters, difficulty, and questions for a classroom-ready paper.", icon: ClipboardList, href: "/teacher-dashboard/ai/question-paper" },
	{ title: "Worksheet", description: "Prepare a practice or assessment worksheet and save it as a draft.", icon: FileText, href: "/teacher-dashboard/ai/worksheet" },
];

export default async function Page() {
	const teacher = await requireTeacher();
	const entitlement = await getTeacherAiEntitlement(teacher.id);
	return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
		<header className="border-b border-slate-200 pb-7"><div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><Sparkles className="h-4 w-4" aria-hidden="true" />AI teaching studio</div><h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Create teaching materials</h1><p className="mt-2 max-w-2xl text-slate-600">Use approved book content to prepare editable classroom materials.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/teacher-dashboard/ai/templates" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700">Templates</Link><Link href="/teacher-dashboard/ai/history" className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700"><History className="mr-2 h-4 w-4" />History</Link></div></header>
		<section className="grid gap-3 sm:grid-cols-3"><Quota label="Materials created today" value={`${entitlement.used} of ${entitlement.limit}`} /><Quota label="Available today" value={entitlement.remaining} /><Quota label="Available again" value={entitlement.resetAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })} /></section>
		{entitlement.message ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{entitlement.message} You can still prepare and save drafts.</div> : null}
		<section><h2 className="text-xl font-bold text-slate-900">Choose a starting point</h2><p className="mt-1 text-slate-600">Select a tool, then choose the class, subject, and approved book content you want to use.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{tools.map(({ title, description, icon: Icon, href }) => <article key={href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-6 w-6 text-blue-700" aria-hidden="true" /><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-slate-600">{description}</p><Link href={href} className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white">Start</Link></article>)}</div></section>
	</div>;
}

function Quota({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-xl font-bold text-slate-950">{value}</p></div>; }
