import { GraduationCap } from "lucide-react";
import { requireTeacher } from "@/lib/teacher-dashboard";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function TrainingPage() { await requireTeacher(); return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8"><header><h1 className="text-3xl font-bold sm:text-4xl">Training</h1><p className="mt-2 text-slate-600">Professional learning opportunities from your school and publisher.</p></header><section className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm"><GraduationCap className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-xl font-bold">No training is available yet.</h2><p className="mt-2 text-slate-600">Training sessions and professional learning material will appear here when added.</p></section></div>; }
