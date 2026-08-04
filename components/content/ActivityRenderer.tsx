import Link from "next/link";

import type { ContentRenderMode } from "@/lib/content-audience";
import {
  activityTypeLabel,
  type ResolvedActivityBlock,
} from "@/lib/activity-studio-types";

export default function ActivityRenderer({
  resolved,
  mode,
}: {
  resolved: ResolvedActivityBlock;
  mode: ContentRenderMode;
}) {
  if (!resolved) return null;
  const { activity, attachments } = resolved;
  if (mode === "STUDENT" && (!activity.active || !activity.published)) return null;
  const showTeacher = mode === "ADMIN_PREVIEW" || mode === "TEACHER";
  return (
    <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50/70 p-5 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            {activityTypeLabel(activity.activityType)}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">{activity.title}</h3>
          {activity.shortDescription ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{activity.shortDescription}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "ADMIN_PREVIEW" && !activity.published ? <Badge label="Draft" tone="amber" /> : null}
          {mode === "ADMIN_PREVIEW" ? <Badge label={activity.audience} /> : null}
          {activity.durationMinutes ? <Badge label={`${activity.durationMinutes} min`} /> : null}
          {activity.difficulty ? <Badge label={activity.difficulty} /> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <TextPanel label="Objective" value={activity.objective} />
        <TextPanel label="Materials" value={activity.materials} />
        <TextPanel label="Preparation" value={activity.preparation} />
        <TextPanel label="Instructions" value={activity.studentInstructions || activity.instructions} />
        <ListPanel label="Steps" values={activity.steps} ordered />
        <ListPanel label="Observation Prompts" values={activity.observationPrompts} />
        <TextPanel label="Expected Outcome" value={activity.expectedLearning} />
        <ListPanel label="Reflection Prompts" values={activity.reflectionPrompts} />
        {showTeacher ? <TextPanel label="Teacher Guidance" value={activity.teacherGuidance} /> : null}
        {showTeacher ? <TextPanel label="Safety Notes" value={activity.safetyNotes} tone="rose" /> : null}
        {showTeacher ? <TextPanel label="Evaluation Guidance" value={activity.assessment} /> : null}
      </div>

      {attachments.length ? (
        <div className="mt-5 rounded-2xl bg-white/80 p-4 ring-1 ring-emerald-100">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Attachments</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <Link
                key={attachment.id}
                href={attachment.route.href}
                className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white"
              >
                {attachment.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function TextPanel({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | null;
  tone?: "slate" | "rose";
}) {
  if (!value?.trim()) return null;
  return (
    <section className={`rounded-2xl px-4 py-3 ${tone === "rose" ? "bg-rose-50 text-rose-900" : "bg-white/80"}`}>
      <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{value}</p>
    </section>
  );
}

function ListPanel({
  label,
  values,
  ordered = false,
}: {
  label: string;
  values: string[];
  ordered?: boolean;
}) {
  if (!values.length) return null;
  const ListTag = ordered ? "ol" : "ul";
  return (
    <section className="rounded-2xl bg-white/80 px-4 py-3">
      <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</h4>
      <ListTag className={`mt-2 space-y-1 pl-5 text-sm leading-7 ${ordered ? "list-decimal" : "list-disc"}`}>
        {values.map((value, index) => <li key={`${label}-${index}`}>{value}</li>)}
      </ListTag>
    </section>
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
