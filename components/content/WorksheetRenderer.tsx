import Link from "next/link";

import type { ContentRenderMode } from "@/lib/content-audience";
import {
  type ResolvedWorksheetBlock,
  worksheetTypeLabel,
} from "@/lib/worksheet-studio-types";

export default function WorksheetRenderer({
  resolved,
  mode,
}: {
  resolved: ResolvedWorksheetBlock;
  mode: ContentRenderMode;
}) {
  if (!resolved) return null;
  const { worksheet, exercise, printableResource, answerKeyResource, supportingResources } = resolved;
  if (mode === "STUDENT" && (!worksheet.active || !worksheet.published)) return null;
  return (
    <article className="rounded-[2rem] border border-blue-200 bg-blue-50/75 p-5 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            {worksheetTypeLabel(worksheet.type)} Worksheet
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">{worksheet.title}</h3>
          {worksheet.instructions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{worksheet.instructions}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "ADMIN_PREVIEW" && !worksheet.published ? <Badge label="Draft" tone="amber" /> : null}
          {mode === "ADMIN_PREVIEW" ? <Badge label={worksheet.audience} /> : null}
          {worksheet.estimatedMinutes ? <Badge label={`${worksheet.estimatedMinutes} min`} /> : null}
          {worksheet.totalMarks ? <Badge label={`${worksheet.totalMarks} marks`} /> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {exercise && worksheet.allowOnlineAttempt ? (
          <Link href={exercise.route?.href ?? "#"} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            {mode === "STUDENT" ? "Start worksheet" : "Preview interactive"}
          </Link>
        ) : null}
        {printableResource && worksheet.allowPrint ? (
          <Link href={printableResource.route.href} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-800 ring-1 ring-blue-200">
            Open printable
          </Link>
        ) : null}
        {answerKeyResource && mode !== "STUDENT" ? (
          <Link href={answerKeyResource.route.href} className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">
            Answer key
          </Link>
        ) : null}
      </div>

      {exercise ? (
        <div className="mt-5 rounded-2xl bg-white/80 p-4 ring-1 ring-blue-100">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Linked Exercise</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {exercise.title} - {exercise.questionCount} questions{exercise.marks ? ` - ${exercise.marks} marks` : ""}
          </p>
        </div>
      ) : null}

      {supportingResources.length ? (
        <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-blue-100">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Supporting Material</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {supportingResources.map((resource) => (
              <Link key={resource.id} href={resource.route.href} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {resource.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Badge({ label, tone = "slate" }: { label: string; tone?: "slate" | "amber" }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
      tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600"
    }`}>
      {label}
    </span>
  );
}
