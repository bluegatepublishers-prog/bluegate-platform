"use client";

export type AcademicOptions = { classes: { id: string; name: string }[]; subjects: { id: string; name: string }[]; books: { id: string; title: string; classId: string; subjectId: string; series: { name: string } | null }[] };
export const questionTypes = ["MCQ", "Fill in the blanks", "True/False", "Very short answer", "Short answer", "Long answer", "Assertion-Reason", "Case Study", "Competency-Based", "HOTS", "Practical/Activity"];
export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span>{children}</label>; }
export const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500";
export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold text-slate-900">{title}</h2>{description && <p className="mt-2 text-sm text-slate-500">{description}</p>}<div className="mt-6">{children}</div></section>; }
