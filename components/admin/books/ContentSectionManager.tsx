"use client";

import { useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import {
  CONTENT_SECTION_AUDIENCES,
  CONTENT_SECTION_CONTEXTS,
  CONTENT_SECTION_ICONS,
  LINKED_ASSET_KINDS,
  contentSectionAudienceLabel,
  contentSectionContextLabel,
  linkedAssetKindLabel,
  type ContentSectionDefinitionSummary,
} from "@/lib/content-linked-asset-types";
import ContentReleasePanel from "@/components/admin/books/ContentReleasePanel";
import type { ReleaseSummary } from "@/lib/content-release";

type ReleaseAction =
  | "SUBMIT_REVIEW"
  | "RETURN_DRAFT"
  | "APPROVE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE"
  | "RESTORE";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const input =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-300";

export default function ContentSectionManager({
  sections,
  saveAction,
  archiveAction,
  moveAction,
  releaseSummaries = {},
  transitionReleaseAction,
  rollbackReleaseAction,
  previewBaseHref,
}: {
  sections: ContentSectionDefinitionSummary[];
  saveAction: (data: FormData) => Promise<void>;
  archiveAction: (id: string) => Promise<void>;
  moveAction: (id: string, direction: -1 | 1) => Promise<void>;
  releaseSummaries?: Record<string, ReleaseSummary>;
  transitionReleaseAction?: (sectionId: string, action: ReleaseAction, data: FormData) => Promise<void>;
  rollbackReleaseAction?: (sectionId: string, versionId: string, data: FormData) => Promise<void>;
  previewBaseHref?: string;
}) {
  const [status, setStatus] = useState<Record<string, SaveStatus>>({});
  const [message, setMessage] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function setRowStatus(key: string, next: SaveStatus, nextMessage = "") {
    setStatus((current) => ({ ...current, [key]: next }));
    setMessage((current) => ({ ...current, [key]: nextMessage }));
  }

  function submit(key: string, data: FormData) {
    setRowStatus(key, "saving", "Saving...");
    startTransition(async () => {
      try {
        await saveAction(data);
        setRowStatus(key, "saved", "Saved");
      } catch (cause) {
        setRowStatus(
          key,
          "error",
          cause instanceof Error ? cause.message : "Unable to save section.",
        );
      }
    });
  }

  function move(id: string, direction: -1 | 1) {
    setRowStatus(id, "saving", "Moving...");
    startTransition(async () => {
      try {
        await moveAction(id, direction);
        setRowStatus(id, "saved", "Moved");
      } catch (cause) {
        setRowStatus(id, "error", cause instanceof Error ? cause.message : "Unable to move section.");
      }
    });
  }

  function archive(id: string, label: string) {
    if (!window.confirm(`Archive "${label}"? Existing documents keep loading, but it cannot be selected for new assignments.`)) {
      return;
    }
    setRowStatus(id, "saving", "Archiving...");
    startTransition(async () => {
      try {
        await archiveAction(id);
        setRowStatus(id, "saved", "Archived");
      } catch (cause) {
        setRowStatus(id, "error", cause instanceof Error ? cause.message : "Unable to archive section.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <SectionForm
        disabled={isPending}
        status={status.new ?? "idle"}
        message={message.new}
        onSubmit={(data) => submit("new", data)}
      />

      <div className="space-y-3">
        {sections.map((section, index) => (
          <SectionForm
            key={section.id}
            section={section}
            disabled={isPending}
            status={status[section.id] ?? "idle"}
            message={message[section.id]}
            releaseSummary={releaseSummaries[section.id]}
            transitionReleaseAction={transitionReleaseAction}
            rollbackReleaseAction={rollbackReleaseAction}
            previewBaseHref={previewBaseHref}
            canMoveUp={index > 0}
            canMoveDown={index < sections.length - 1}
            onMove={(direction) => move(section.id, direction)}
            onArchive={() => archive(section.id, section.label)}
            onSubmit={(data) => submit(section.id, data)}
          />
        ))}
        {!sections.length ? (
          <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
            No content sections have been defined for this book yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SectionForm({
  section,
  disabled,
  status,
  message,
  canMoveUp = false,
  canMoveDown = false,
  onSubmit,
  onMove,
  onArchive,
  releaseSummary,
  transitionReleaseAction,
  rollbackReleaseAction,
  previewBaseHref,
}: {
  section?: ContentSectionDefinitionSummary;
  disabled: boolean;
  status: SaveStatus;
  message?: string;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSubmit: (data: FormData) => void;
  onMove?: (direction: -1 | 1) => void;
  onArchive?: () => void;
  releaseSummary?: ReleaseSummary;
  transitionReleaseAction?: (sectionId: string, action: ReleaseAction, data: FormData) => Promise<void>;
  rollbackReleaseAction?: (sectionId: string, versionId: string, data: FormData) => Promise<void>;
  previewBaseHref?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const isNew = !section;

  function submit() {
    if (!formRef.current) return;
    onSubmit(new FormData(formRef.current));
  }

  return (
    <>
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="rounded-[1.35rem] bg-slate-50 p-3 ring-1 ring-slate-200"
    >
      {section ? <input type="hidden" name="id" value={section.id} /> : null}
      <input type="hidden" name="sortOrder" value={section?.sortOrder ?? 0} />

      <div className="grid gap-2">
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          {isNew ? "New Section" : "Section"}
          <input
            name="label"
            required
            maxLength={160}
            defaultValue={section?.label ?? ""}
            placeholder="Videos, Worksheets, Teacher Notes"
            className={input}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Code
            <input
              name="code"
              maxLength={80}
              defaultValue={section?.code ?? ""}
              placeholder="auto-from-label"
              className={input}
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Icon
            <select name="icon" defaultValue={section?.icon ?? "layers"} className={input}>
              {CONTENT_SECTION_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Audience
          <select name="audience" defaultValue={section?.audience ?? "BOTH"} className={input}>
            {CONTENT_SECTION_AUDIENCES.map((audience) => (
              <option key={audience} value={audience}>
                {contentSectionAudienceLabel(audience)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CheckboxGroup title="Allowed Assets">
        {LINKED_ASSET_KINDS.map((kind) => (
          <label key={kind} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            <input
              type="checkbox"
              name="allowedAssetKinds"
              value={kind}
              defaultChecked={section?.allowedAssetKinds.includes(kind) ?? false}
            />
            {linkedAssetKindLabel(kind)}
          </label>
        ))}
      </CheckboxGroup>

      <CheckboxGroup title="Shown In">
        {CONTENT_SECTION_CONTEXTS.map((context) => (
          <label key={context} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            <input
              type="checkbox"
              name="visibleIn"
              value={context}
              defaultChecked={section ? section.visibleIn.includes(context) : context === "ADMIN"}
            />
            {contentSectionContextLabel(context)}
          </label>
        ))}
      </CheckboxGroup>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          <input type="checkbox" name="active" defaultChecked={section?.active ?? true} />
          Active
        </label>
        <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          <input type="checkbox" name="published" defaultChecked={section?.published ?? false} />
          Published
        </label>
        <button
          type="submit"
          disabled={disabled}
          className="ml-auto rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {isNew ? "Create" : "Save"}
        </button>
      </div>

      {section ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!canMoveUp || disabled} onClick={() => onMove?.(-1)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">
            Move Up
          </button>
          <button type="button" disabled={!canMoveDown || disabled} onClick={() => onMove?.(1)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">
            Move Down
          </button>
          <button type="button" disabled={disabled} onClick={onArchive} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-40">
            Archive
          </button>
        </div>
      ) : null}

      {message ? (
        <p className={`mt-2 text-xs font-semibold ${status === "error" ? "text-rose-700" : "text-slate-500"}`}>
          {message}
        </p>
      ) : null}
    </form>
    {section && releaseSummary && transitionReleaseAction && rollbackReleaseAction ? (
      <div className="rounded-[1.35rem] bg-white p-3 ring-1 ring-slate-200">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Release</p>
        <ContentReleasePanel
          summary={releaseSummary}
          transitionAction={transitionReleaseAction.bind(null, section.id)}
          rollbackAction={rollbackReleaseAction.bind(null, section.id)}
          previewBaseHref={previewBaseHref}
        />
      </div>
    ) : null}
    </>
  );
}

function CheckboxGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
