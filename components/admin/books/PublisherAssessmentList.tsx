"use client";

import Link from "next/link";
import { Archive, Eye, Pencil, Plus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import AssignmentsWorkspaceNav from "@/components/admin/books/AssignmentsWorkspaceNav";

export type PublisherAssessmentSummary = {
  id: string;
  heading: string;
  kind: string;
  scope: string;
  questionCount: number;
  totalMarks: number;
  deliveryMode: "INTERACTIVE" | "PRINT" | "BOTH";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
};

type Mutation = (assessmentId: string) => Promise<{ ok: boolean; message?: string }>;

export default function PublisherAssessmentList({ bookId, assessments, publishAction, archiveAction, restoreAction }: {
  bookId: string;
  assessments: PublisherAssessmentSummary[];
  publishAction: Mutation;
  archiveAction: Mutation;
  restoreAction: Mutation;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const base = `/admin/books/${bookId}/content/assignments/assessments`;

  function mutate(action: Mutation, assessmentId: string) {
    startTransition(async () => {
      const result = await action(assessmentId);
      if (!result.ok) setMessage(result.message ?? "Unable to update assessment.");
      else router.refresh();
    });
  }

  return <main className="space-y-4 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Content Studio / Assignments</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Assessments</h1><p className="mt-1 text-sm text-slate-600">Create chapter tests, unit tests, term tests, exams and diagnostic assessments from the publisher question bank.</p></div>
      <Link href={`${base}/new`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create Assessment</Link>
    </header>
    <AssignmentsWorkspaceNav bookId={bookId} active="assessments" />
    {message ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{message}</div> : null}
    {assessments.length ? <section className="divide-y rounded-lg border border-slate-200 bg-white">{assessments.map((assessment) => {
      const href = `${base}/${assessment.id}`;
      return <article key={assessment.id} className="flex flex-wrap items-center gap-3 p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-bold text-slate-900">{assessment.heading}</h2><Status value={assessment.status} /></div><p className="mt-1 text-xs text-slate-500">{friendlyKind(assessment.kind)} · {assessment.scope} · Questions: {assessment.questionCount} · Total Marks: {assessment.totalMarks} · {friendlyMode(assessment.deliveryMode)} · Updated {new Date(assessment.updatedAt).toLocaleDateString("en-IN")}</p></div><div className="flex flex-wrap gap-1"><Link href={`${href}?preview=1`} className="rounded-md border px-2 py-1 text-xs font-bold"><Eye className="mr-1 inline h-3.5 w-3.5" />Preview</Link>{assessment.status === "DRAFT" ? <><Link href={href} className="rounded-md border px-2 py-1 text-xs font-bold text-indigo-700"><Pencil className="mr-1 inline h-3.5 w-3.5" />Edit</Link><button type="button" disabled={pending} onClick={() => mutate(publishAction, assessment.id)} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-60">Publish</button><button type="button" disabled={pending} onClick={() => mutate(archiveAction, assessment.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700"><Archive className="mr-1 inline h-3.5 w-3.5" />Archive</button></> : assessment.status === "PUBLISHED" ? <button type="button" disabled={pending} onClick={() => mutate(archiveAction, assessment.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700"><Archive className="mr-1 inline h-3.5 w-3.5" />Archive</button> : <button type="button" disabled={pending} onClick={() => mutate(restoreAction, assessment.id)} className="rounded-md border px-2 py-1 text-xs font-bold"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Restore</button>}</div></article>;
    })}</section> : <section className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-bold text-slate-800">No assessments yet</h2><p className="mt-1 text-sm text-slate-500">Create a draft assessment to select a scope and ordered publisher questions.</p></section>}
  </main>;
}

function Status({ value }: { value: PublisherAssessmentSummary["status"] }) {
  const tone = value === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : value === "ARCHIVED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{value}</span>;
}

function friendlyKind(kind: string) { return kind.split("_").map((word) => word[0] + word.slice(1).toLowerCase()).join(" "); }
function friendlyMode(mode: PublisherAssessmentSummary["deliveryMode"]) { return mode === "INTERACTIVE" ? "Interactive" : mode === "PRINT" ? "Printable" : "Both"; }
