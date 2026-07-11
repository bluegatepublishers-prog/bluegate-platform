import Link from "next/link";
import { QuestionPaperWizard } from "@/components/dashboard/question-paper-wizard";
import { getQuestionPaperWizardOptions } from "@/lib/ai-studio";
export const dynamic="force-dynamic"; export const revalidate=0; export const metadata={title:"Question Paper Generator | Bluegate AI Studio"};
export default async function Page(){const options=await getQuestionPaperWizardOptions();return <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8"><div><Link href="/teacher-dashboard/ai" className="text-sm font-semibold text-blue-700">← AI Studio</Link><p className="mt-5 text-sm font-bold uppercase tracking-wider text-blue-700">Bluegate AI</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Question Paper Generator</h1><p className="mt-2 text-slate-600">Create a classroom-ready paper from approved Bluegate book content in five simple steps.</p></div><QuestionPaperWizard options={options}/></div>}
