"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ClipboardList, Copy, Plus, Save, Trash2 } from "lucide-react";

import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import StudioWorkspaceShell from "@/components/admin/books/StudioWorkspaceShell";
import type { ReleaseSummary } from "@/lib/content-release";
import {
  ACTIVITY_AUDIENCES,
  ACTIVITY_DIFFICULTIES,
  ACTIVITY_TYPES,
  activityTypeLabel,
  type ActivityStudioRecord,
} from "@/lib/activity-studio-types";

type ResourceOption = {
  id: string;
  title: string;
  type: string;
  audience: string;
  published: boolean;
};

type ScopeOption = {
  id: string;
  title: string;
};

type TopicOption = ScopeOption & {
  moduleId: string | null;
};

type ReleaseAction =
  | "SUBMIT_REVIEW"
  | "RETURN_DRAFT"
  | "APPROVE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE"
  | "RESTORE";

const field =
  "mt-2 w-full rounded-[1.1rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-200";

export default function ActivityStudio({
  chapterId,
  activities,
  resources,
  modules,
  topics,
  saveAction,
  duplicateAction,
  archiveAction,
  moveAction,
  releaseSummaries = {},
  transitionReleaseAction,
  rollbackReleaseAction,
  previewBaseHref,
  initialSelectedId,
  onSaveComplete,
  defaultModuleId,
  defaultTopicId,
  bookTitle,
  chapterTitle,
  moduleTitle,
  topicTitle,
  currentScopeLabel,
}: {
  chapterId: string;
  activities: ActivityStudioRecord[];
  resources: ResourceOption[];
  modules: ScopeOption[];
  topics: TopicOption[];
  saveAction: (data: FormData) => Promise<string>;
  duplicateAction: (activityId: string) => Promise<void>;
  archiveAction: (activityId: string) => Promise<void>;
  moveAction: (activityId: string, direction: -1 | 1) => Promise<void>;
  releaseSummaries?: Record<string, ReleaseSummary>;
  transitionReleaseAction?: (activityId: string, action: ReleaseAction, data: FormData) => Promise<void>;
  rollbackReleaseAction?: (activityId: string, versionId: string, data: FormData) => Promise<void>;
  previewBaseHref?: string;
  initialSelectedId?: string;
  onSaveComplete?: (activityId: string) => void;
  defaultModuleId?: string | null;
  defaultTopicId?: string | null;
  bookTitle?: string;
  chapterTitle?: string;
  moduleTitle?: string | null;
  topicTitle?: string | null;
  currentScopeLabel?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? activities[0]?.id ?? "new");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = activities.find((activity) => activity.id === selectedId) ?? null;
  const draft = selected ?? createDraft(chapterId, activities.length, defaultModuleId ?? null, defaultTopicId ?? null);
  const relevant = relevantSections(draft.activityType);
  const formId = activityFormId(draft.id);

  function submit(formData: FormData) {
    setMessage("Saving activity...");
    setError("");
    startTransition(async () => {
      try {
        const activityId = await saveAction(formData);
        setSelectedId(activityId);
        setMessage("Activity saved");
        onSaveComplete?.(activityId);
      } catch (cause) {
        setMessage("");
        setError(cause instanceof Error ? cause.message : "Unable to save activity.");
      }
    });
  }

  const outline = (
    <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Activity Outline</p>
            <p className="mt-1 text-sm text-slate-500">{activities.length} reusable records</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId("new")}
            className="rounded-full bg-slate-950 p-2 text-white"
            aria-label="Add activity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => setSelectedId("new")}
            className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
              selectedId === "new" ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            New Activity
          </button>
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setSelectedId(activity.id)}
              className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                selectedId === activity.id ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              <span className="block text-xs font-bold uppercase tracking-[0.14em] opacity-70">
                {activityTypeLabel(activity.activityType)}
              </span>
              <span className="mt-1 block truncate text-sm font-bold">{activity.title}</span>
              <span className="mt-1 block text-xs opacity-70">
                {activity.published ? "Published" : "Draft"} - {activity.audience}
              </span>
            </button>
          ))}
        </div>
    </div>
  );

  const canvas = (
      <form key={draft.id} id={formId} action={submit} className="min-w-0 space-y-6">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <input type="hidden" name="sortOrder" value={draft.sortOrder} />
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-[#fffdf7] p-6 shadow-sm ring-1 ring-slate-200 sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
              <ClipboardList className="h-4 w-4" />
              Activity Manuscript
            </span>
            {!draft.active ? <Badge label="Inactive" /> : null}
            {!draft.published ? <Badge label="Draft" /> : null}
          </div>

          <input
            name="title"
            required
            defaultValue={draft.title}
            placeholder="Activity title"
            className="mt-6 w-full border-none bg-transparent text-4xl font-bold tracking-tight text-slate-950 outline-none placeholder:text-slate-300"
          />
          <textarea
            name="shortDescription"
            defaultValue={draft.shortDescription ?? ""}
            placeholder="Short description"
            rows={2}
            className="mt-3 w-full resize-none border-none bg-transparent text-lg leading-8 text-slate-600 outline-none placeholder:text-slate-300"
          />

          <ManuscriptSection label="Objective">
            <textarea name="objective" required defaultValue={draft.objective} rows={4} className={plainArea} />
          </ManuscriptSection>

          {relevant.materials ? (
            <ManuscriptSection label="Materials Required">
              <textarea name="materials" defaultValue={draft.materials ?? ""} rows={4} className={plainArea} />
            </ManuscriptSection>
          ) : null}

          {relevant.preparation ? (
            <ManuscriptSection label="Preparation">
              <textarea name="preparation" defaultValue={draft.preparation ?? ""} rows={3} className={plainArea} />
            </ManuscriptSection>
          ) : null}

          <ManuscriptSection label={relevant.stepLabel}>
            <textarea
              name="instructions"
              required
              defaultValue={draft.instructions}
              rows={5}
              className={plainArea}
            />
            <textarea
              name="steps"
              defaultValue={draft.steps.join("\n")}
              rows={5}
              placeholder="Optional ordered steps, one per line"
              className={`${plainArea} mt-4 rounded-2xl bg-slate-50 px-4 py-3`}
            />
          </ManuscriptSection>

          {relevant.observation ? (
            <ManuscriptSection label="Observation">
              <textarea name="observationPrompts" defaultValue={draft.observationPrompts.join("\n")} rows={4} className={plainArea} />
            </ManuscriptSection>
          ) : null}

          {relevant.outcome ? (
            <ManuscriptSection label={relevant.outcomeLabel}>
              <textarea name="expectedLearning" defaultValue={draft.expectedLearning ?? ""} rows={4} className={plainArea} />
            </ManuscriptSection>
          ) : null}

          {relevant.reflection ? (
            <ManuscriptSection label="Reflection">
              <textarea name="reflectionPrompts" defaultValue={draft.reflectionPrompts.join("\n")} rows={4} className={plainArea} />
            </ManuscriptSection>
          ) : null}

          <ManuscriptSection label="Student Instructions">
            <textarea name="studentInstructions" defaultValue={draft.studentInstructions ?? ""} rows={4} className={plainArea} />
          </ManuscriptSection>

          {relevant.teacher ? (
            <ManuscriptSection label="Teacher Guidance">
              <textarea name="teacherGuidance" defaultValue={draft.teacherGuidance ?? ""} rows={4} className={plainArea} />
            </ManuscriptSection>
          ) : null}

          {relevant.safety ? (
            <ManuscriptSection label="Safety Notes">
              <textarea name="safetyNotes" defaultValue={draft.safetyNotes ?? ""} rows={4} className={plainArea} />
            </ManuscriptSection>
          ) : null}
        </div>

        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <button disabled={isPending} type="submit" className="inline-flex rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Saving..." : "Save activity"}
          </button>
          <p className="text-sm text-slate-500">
            Insert this activity from the manuscript slash menu as a linked asset. The manuscript stores only the activity reference.
          </p>
        </div>
        {message ? <p className="mx-auto max-w-3xl text-sm font-semibold text-slate-500">{message}</p> : null}
        {error ? <p className="mx-auto max-w-3xl rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      </form>
  );

  const inspector = (
        <div className="space-y-4">
          <Inspector title="Scope">
            <dl className="space-y-3 text-sm text-slate-600">
              <Summary label="Book" value={bookTitle ?? "Current book"} />
              <Summary label="Chapter" value={chapterTitle ?? "Current chapter"} />
              <Summary label="Module" value={moduleTitle ?? "Chapter level"} />
              <Summary label="Topic" value={topicTitle ?? "Not narrowed"} />
              <Summary label="Current Scope" value={currentScopeLabel ?? "Chapter scope"} />
              <Summary label="Audience" value={draft.audience} />
              <Summary label="Publication" value={draft.published ? "Published" : "Draft"} />
              <Summary label="Where Used" value={selected ? "Current content scope" : "New record"} />
            </dl>
          </Inspector>
          <ActivityInspector
            key={draft.id}
            draft={draft}
            resources={resources}
            modules={modules}
            topics={topics}
          />
          {selected ? (
            <>
            <Inspector title="Lifecycle">
              <div className="grid grid-cols-2 gap-2">
                <ActionForm action={moveAction.bind(null, selected.id, -1)} label="Move up" icon={<ArrowUp className="h-4 w-4" />} />
                <ActionForm action={moveAction.bind(null, selected.id, 1)} label="Move down" icon={<ArrowDown className="h-4 w-4" />} />
                <ActionForm action={duplicateAction.bind(null, selected.id)} label="Duplicate" icon={<Copy className="h-4 w-4" />} />
                <ActionForm
                  action={archiveAction.bind(null, selected.id)}
                  label="Archive"
                  icon={<Trash2 className="h-4 w-4" />}
                  confirmText="Archive this activity?"
                  danger
                />
              </div>
            </Inspector>
            {releaseSummaries[selected.id] && transitionReleaseAction && rollbackReleaseAction ? (
              <Inspector title="Release">
                <ContentReleasePanel
                  summary={releaseSummaries[selected.id]}
                  transitionAction={transitionReleaseAction.bind(null, selected.id)}
                  rollbackAction={rollbackReleaseAction.bind(null, selected.id)}
                  previewBaseHref={previewBaseHref}
                />
              </Inspector>
            ) : null}
            </>
          ) : null}
          <Inspector title="Manuscript Link">
            <p className="text-sm leading-6 text-slate-600">
              Use a `linkedAsset` block with kind Activity to reuse this canonical record anywhere the activity scope permits.
            </p>
            <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 font-mono text-xs text-slate-600">
              {selected ? `CHAPTER_ACTIVITY:${selected.id}` : "Save first"}
            </p>
          </Inspector>
        </div>
  );

  return (
    <StudioWorkspaceShell
      storageKey={`bluegate:activity-studio:${chapterId}`}
      title="Activity Studio"
      leftLabel="Outline"
      leftTitle="Activity Outline"
      left={outline}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <button form={formId} disabled={isPending} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save"}
          </button>
          {selected && previewBaseHref ? (
            <Link href={`${previewBaseHref}/${selected.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              Preview
            </Link>
          ) : null}
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {activityTypeLabel(draft.activityType)}
          </span>
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {draft.published ? "Published" : "Draft"}
          </span>
        </div>
      }
      canvas={canvas}
      statusBar={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{currentScopeLabel ?? "Chapter scope"}</span>
          <span>{message || (error ? "Error" : "Ready")}</span>
        </div>
      }
      rightLabel="Inspector"
      rightTitle="Activity Inspector"
      right={inspector}
    />
  );
}

function ActivityInspector({
  draft,
  resources,
  modules,
  topics,
}: {
  draft: ActivityStudioRecord;
  resources: ResourceOption[];
  modules: ScopeOption[];
  topics: TopicOption[];
}) {
  return (
    <>
      <Inspector title="Context">
        <label className="block text-sm font-semibold text-slate-700">
          Type
          <select name="activityType" form={activityFormId(draft.id)} defaultValue={draft.activityType} className={field}>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>{activityTypeLabel(type)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Module scope
          <select name="moduleId" form={activityFormId(draft.id)} defaultValue={draft.moduleId ?? ""} className={field}>
            <option value="">Whole chapter</option>
            {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Topic scope
          <select name="topicId" form={activityFormId(draft.id)} defaultValue={draft.topicId ?? ""} className={field}>
            <option value="">No topic scope</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
        </label>
      </Inspector>
      <Inspector title="Publishing">
        <label className="block text-sm font-semibold text-slate-700">
          Estimated time
          <input name="durationMinutes" form={activityFormId(draft.id)} type="number" min="1" defaultValue={draft.durationMinutes ?? ""} className={field} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Difficulty
          <select name="difficulty" form={activityFormId(draft.id)} defaultValue={draft.difficulty ?? ""} className={field}>
            <option value="">Not set</option>
            {ACTIVITY_DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Audience
          <select name="audience" form={activityFormId(draft.id)} defaultValue={draft.audience} className={field}>
            {ACTIVITY_AUDIENCES.map((audience) => <option key={audience} value={audience}>{audience}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-[1.25rem] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <input name="active" form={activityFormId(draft.id)} type="checkbox" defaultChecked={draft.active} />
          Active
        </label>
        <label className="flex items-center gap-3 rounded-[1.25rem] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <input name="published" form={activityFormId(draft.id)} type="checkbox" defaultChecked={draft.published} />
          Published
        </label>
      </Inspector>
      <Inspector title="Attachments">
        <label className="block text-sm font-semibold text-slate-700">
          Group type
          <input name="groupType" form={activityFormId(draft.id)} defaultValue={draft.groupType ?? ""} className={field} />
        </label>
        <ResourceSelect name="imageResourceId" label="Image" draft={draft} resources={resources} value={draft.imageResourceId} />
        <ResourceSelect name="videoResourceId" label="Video" draft={draft} resources={resources} value={draft.videoResourceId} />
        <ResourceSelect name="diagramResourceId" label="Diagram" draft={draft} resources={resources} value={draft.diagramResourceId} />
        <div className="space-y-2 rounded-[1.25rem] bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Resource attachments</p>
          {resources.slice(0, 40).map((resource) => (
            <label key={resource.id} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
              <input
                name="attachmentResourceIds"
                form={activityFormId(draft.id)}
                type="checkbox"
                value={resource.id}
                defaultChecked={draft.attachmentResourceIds.includes(resource.id)}
                className="mt-0.5"
              />
              <span>{resource.title} <span className="text-slate-400">({resource.type}{resource.published ? "" : ", draft"})</span></span>
            </label>
          ))}
        </div>
      </Inspector>
    </>
  );
}

function ResourceSelect({
  name,
  label,
  draft,
  resources,
  value,
}: {
  name: string;
  label: string;
  draft: ActivityStudioRecord;
  resources: ResourceOption[];
  value: string | null;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select name={name} form={activityFormId(draft.id)} defaultValue={value ?? ""} className={field}>
        <option value="">None</option>
        {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}
      </select>
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function ActionForm({
  action,
  label,
  icon,
  confirmText,
  danger = false,
}: {
  action: () => Promise<void>;
  label: string;
  icon: ReactNode;
  confirmText?: string;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(event) => {
          if (confirmText && !window.confirm(confirmText)) event.preventDefault();
        }}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
          danger ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
        }`}
      >
        {icon}
        {label}
      </button>
    </form>
  );
}

function ManuscriptSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Inspector({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-800">{label}</span>;
}

const plainArea =
  "w-full resize-none border-none bg-transparent text-[1.05rem] leading-8 text-slate-800 outline-none placeholder:text-slate-300";

function createDraft(
  chapterId: string,
  count: number,
  defaultModuleId: string | null,
  defaultTopicId: string | null,
): ActivityStudioRecord {
  return {
    id: "new",
    chapterId,
    moduleId: defaultModuleId,
    topicId: defaultTopicId,
    title: "",
    activityType: "CLASSROOM_ACTIVITY",
    shortDescription: null,
    objective: "",
    materials: null,
    durationMinutes: null,
    groupType: null,
    preparation: null,
    instructions: "",
    steps: [],
    observationPrompts: [],
    reflectionPrompts: [],
    expectedLearning: null,
    assessment: null,
    safetyNotes: null,
    teacherGuidance: null,
    studentInstructions: null,
    attachmentResourceIds: [],
    imageResourceId: null,
    videoResourceId: null,
    diagramResourceId: null,
    audience: "BOTH",
    difficulty: null,
    active: true,
    published: false,
    archived: false,
    sortOrder: count,
    updatedAt: new Date(0).toISOString(),
  };
}

function activityFormId(id: string) {
  return `activity-form-${id}`;
}

function relevantSections(type: ActivityStudioRecord["activityType"]) {
  if (type === "EXPERIMENT" || type === "LAB_ACTIVITY" || type === "OBSERVATION") {
    return { materials: true, preparation: true, observation: true, outcome: true, outcomeLabel: "Conclusion", reflection: true, teacher: true, safety: true, stepLabel: "Procedure" };
  }
  if (type === "PAIR_WORK" || type === "THINK_AND_DISCUSS" || type === "ROLE_PLAY") {
    return { materials: false, preparation: false, observation: false, outcome: true, outcomeLabel: "Expected Output", reflection: true, teacher: true, safety: false, stepLabel: "Discussion Steps" };
  }
  if (type === "PROJECT" || type === "RESEARCH" || type === "CREATIVE_TASK") {
    return { materials: true, preparation: true, observation: false, outcome: true, outcomeLabel: "Deliverables", reflection: true, teacher: true, safety: false, stepLabel: "Work Plan" };
  }
  return { materials: true, preparation: false, observation: false, outcome: true, outcomeLabel: "Expected Outcome", reflection: true, teacher: true, safety: false, stepLabel: "Instructions" };
}
