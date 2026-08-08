"use client";

import { useState } from "react";
import type { ContentBlock, ActivityBlock } from "@/lib/content-document";
import { compactField } from "@/components/admin/books/compact-studio-styles";
import {
  ACTIVITY_FIELD_DEFINITIONS,
  activityFieldEditorKind,
  activityFieldLabel,
  defaultActivityFieldVisibility,
  type ActivityField,
  type ActivityFieldType,
} from "@/lib/activity-object";

type ResourceOption = {
  id: string;
  title: string;
  type?: string | null;
  mimeType?: string | null;
};

type Props = {
  block: ActivityBlock;
  resources: ResourceOption[];
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;
};

const field = compactField.replace("focus:border-blue-400", "focus:border-emerald-400").replace("focus:ring-blue-100", "focus:ring-emerald-100");
const control = "rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export default function ActivityBlockEditor({ block, resources, onUpdatePatch }: Props) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  function updateFields(fields: ActivityField[]) {
    onUpdatePatch({ fields });
  }

  function updateField(fieldId: string, patch: Partial<ActivityField>) {
    updateFields(block.fields.map((entry) => entry.id === fieldId ? { ...entry, ...patch } : entry));
  }

  function addField(type: ActivityFieldType) {
    updateFields([...block.fields, { id: createId(), type, visibility: defaultActivityFieldVisibility(type) }]);
    setAddMenuOpen(false);
  }

  function removeField(fieldId: string) {
    updateFields(block.fields.filter((entry) => entry.id !== fieldId));
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    const fields = [...block.fields];
    const index = fields.findIndex((entry) => entry.id === fieldId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= fields.length) return;
    [fields[index], fields[next]] = [fields[next], fields[index]];
    updateFields(fields);
  }

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3" onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
        <span>Activity</span>
        <span className="text-emerald-500">Optional fields</span>
      </div>

      <input value={block.title ?? ""} onChange={(event) => onUpdatePatch({ title: event.target.value || undefined })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400" placeholder="Activity title (optional)" />

      {block.fields.map((entry, index) => (
        <ActivityFieldEditor
          key={entry.id}
          activityField={entry}
          index={index}
          total={block.fields.length}
          resources={resources}
          onUpdate={(patch) => updateField(entry.id, patch)}
          onRemove={() => removeField(entry.id)}
          onMove={(direction) => moveField(entry.id, direction)}
        />
      ))}

      <div className="relative">
        <button type="button" className="inline-flex h-9 items-center rounded-lg border border-dashed border-emerald-400 bg-white px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50" onClick={() => setAddMenuOpen((current) => !current)}>+ Add field</button>
        {addMenuOpen ? (
          <div className="absolute left-0 top-full z-30 mt-2 grid w-[min(34rem,calc(100vw-3rem))] grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:grid-cols-3">
            {ACTIVITY_FIELD_DEFINITIONS.filter(([type]) => type !== "custom").map(([type, label]) => <button key={type} type="button" className="rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50" onClick={() => addField(type)}>{label}</button>)}
          </div>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">Every activity field is optional. Empty fields remain editable but do not appear in previews.</p>
    </div>
  );
}

function ActivityFieldEditor({ activityField, index, total, resources, onUpdate, onRemove, onMove }: { activityField: ActivityField; index: number; total: number; resources: ResourceOption[]; onUpdate: (patch: Partial<ActivityField>) => void; onRemove: () => void; onMove: (direction: -1 | 1) => void }) {
  const editorKind = activityFieldEditorKind(activityField.type);
  const label = activityFieldLabel(activityField);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
        <div className="ml-auto flex gap-1">
          <button type="button" className={control} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}>↑</button>
          <button type="button" className={control} disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}>↓</button>
          <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50" onClick={onRemove}>Remove</button>
        </div>
      </div>
      {activityField.type === "custom" ? <input value={activityField.label ?? ""} onChange={(event) => onUpdate({ label: event.target.value || undefined })} className={field} placeholder="Field label" /> : null}
      {editorKind === "resource" ? (
        <select value={activityField.resourceId ?? ""} onChange={(event) => onUpdate({ resourceId: event.target.value || undefined })} className={field}>
          <option value="">Choose an existing resource (optional)</option>
          {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}{resource.type ? ` · ${resource.type}` : ""}</option>)}
        </select>
      ) : (
        <textarea value={activityField.text ?? ""} onChange={(event) => onUpdate({ text: event.target.value || undefined })} rows={activityField.type === "instructions" ? 4 : 3} className={field} placeholder={`${label} (optional)`} />
      )}
      {activityField.type === "teacherNote" ? <p className="mt-2 text-xs font-semibold text-amber-700">Teacher-only: hidden from Student rendering.</p> : null}
    </section>
  );
}

function createId() {
  return `activity_field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
