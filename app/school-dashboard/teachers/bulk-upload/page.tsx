import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";

import TeacherBulkUploadClient from "@/components/school/TeacherBulkUploadClient";
import { requireSchool } from "@/lib/school-dashboard";

export const dynamic = "force-dynamic";

export default async function TeacherBulkUploadPage() {
  const school = await requireSchool();
  return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><header><Link href="/school-dashboard/teachers" className="text-sm font-semibold text-blue-700">← Teachers</Link><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">People / Teachers</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Teacher Bulk Upload</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Prepare a spreadsheet for {school.schoolName}, review the server preview, then explicitly import it when ready.</p></header><section className="grid gap-4 md:grid-cols-3"><Step number="1" title="Download the template" description="Use the current four-sheet Bluegate Teacher format." icon={<FileSpreadsheet className="h-5 w-5" />} /><Step number="2" title="Complete the spreadsheet" description="Keep the headings unchanged and delete sample rows." icon={<FileSpreadsheet className="h-5 w-5" />} /><Step number="3" title="Upload, review, and import" description="Review Teachers and Assignments, then confirm the import only when ready." icon={<Upload className="h-5 w-5" />} /></section><TeacherBulkUploadClient /><section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">Download the current Excel template</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">The workbook contains Teachers, Assignments, Instructions, and a school-scoped Reference sheet. Preview is zero-write; only the explicit import action creates identities, memberships, assignments, and activation invitations.</p><Link href="/school-dashboard/teachers/bulk-upload/template" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"><FileSpreadsheet className="h-4 w-4" />Download Teacher Excel Template</Link></section></main>;
}

function Step({ number, title, description, icon }: { number: string; title: string; description: string; icon: React.ReactNode }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{number}</span><span className="text-blue-700">{icon}</span></div><h2 className="mt-4 font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></article>; }
