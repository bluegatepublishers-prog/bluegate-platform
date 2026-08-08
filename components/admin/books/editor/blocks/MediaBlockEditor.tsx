"use client";

import { useState } from "react";
import { CircleAlert, PlayCircle } from "lucide-react";
import { compactField, compactPanel } from "@/components/admin/books/compact-studio-styles";

import type { ContentSectionDefinitionSummary } from "@/lib/content-linked-asset-types";
import { MEDIA_DISPLAY_MODES, type MediaBlock } from "@/lib/content-document";
import {
  mediaDisplayModeLabel,
  mediaKey,
  mediaKindLabel,
  type ContentStudioMediaOption,
  type ResolvedMediaBlock,
} from "@/lib/content-media-types";

type ResourceChoice = {
  id: string;
  title: string;
  thumbnail: string | null;
  fileUrl: string | null;
  type?: string | null;
  mimeType?: string | null;
};

type MediaBlockEditorProps = {
  block: MediaBlock;
  mediaOptions: ContentStudioMediaOption[];
  resources: ResourceChoice[];
  sectionDefinitions: ContentSectionDefinitionSummary[];
  resolvedMedia: ResolvedMediaBlock | null;
  onUpdate: (patch: Partial<MediaBlock>) => void;
};

const lightField = compactField;

export default function MediaBlockEditor({
  block,
  mediaOptions,
  resources,
  sectionDefinitions,
  resolvedMedia,
  onUpdate,
}: MediaBlockEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(!block.targetId);
  const [search, setSearch] = useState("");
  const validSections = sectionDefinitions.filter((section) => !section.archived && section.active && (!section.allowedAssetKinds.length || section.allowedAssetKinds.includes(block.mediaKind === "video" ? "video" : "resource")));
  const options = mediaOptions.filter((option) => option.mediaKind === block.mediaKind);
  const filtered = options.filter((option) => {
    const query = search.trim().toLowerCase();
    return !query || option.title.toLowerCase().includes(query);
  });
  const activeMedia = resolveMediaForBlock(block, mediaOptions, resolvedMedia);
  const broken = Boolean(block.targetId) && !activeMedia;

  function chooseMedia(option: ContentStudioMediaOption) {
    onUpdate({ mediaKind: option.mediaKind, targetType: option.targetType, targetId: option.targetId, label: option.mediaKind === "video" ? "Watch Video" : option.defaultLabel, audience: option.defaultAudience });
    setPickerOpen(false);
    setSearch("");
  }

  return (
    <div className={`${compactPanel} space-y-3 text-slate-900`}>
      <div className="flex items-center gap-2" onPointerDown={(event) => event.stopPropagation()}>
        <PlayCircle className="h-4 w-4 text-blue-700" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{mediaKindLabel(block.mediaKind)}</span>
        {broken ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><CircleAlert className="h-3.5 w-3.5" />Unavailable</span> : null}
        <button type="button" className="ml-auto inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setPickerOpen((current) => !current)}>{pickerOpen ? "Close source picker" : "Change video"}</button>
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3" onPointerDown={(event) => event.stopPropagation()}>
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">Video properties <span className="float-right text-xs font-normal text-slate-400">label · player/button · caption</span></summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Button/player label<input data-block-id={block.id} value={block.label} onChange={(event) => onUpdate({ label: event.target.value })} placeholder="Watch Video" className={lightField} /></label>
          <label className="text-xs font-semibold text-slate-600">Display as<select aria-label="Display as" value={block.displayMode} onChange={(event) => onUpdate({ displayMode: event.target.value as MediaBlock["displayMode"] })} className={lightField}>{MEDIA_DISPLAY_MODES.filter((mode) => mode !== "fullWidth").map((mode) => <option key={mode} value={mode}>{mediaDisplayModeLabel(mode)}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Caption<input value={block.caption ?? ""} onChange={(event) => onUpdate({ caption: event.target.value || undefined })} placeholder="Optional caption" className={lightField} /></label>
          <label className="text-xs font-semibold text-slate-600">Section<select aria-label="Media section" value={block.sectionDefinitionId ?? ""} onChange={(event) => onUpdate({ sectionDefinitionId: event.target.value || undefined })} className={lightField}><option value="">No section label</option>{validSections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Poster<select aria-label="Poster resource" value={block.posterResourceId ?? ""} onChange={(event) => onUpdate({ posterResourceId: event.target.value || undefined })} className={lightField}><option value="">Use source thumbnail</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input checked={block.controls} type="checkbox" onChange={(event) => onUpdate({ controls: event.target.checked })} /> Player controls</label>
        </div>
      </details>

      {pickerOpen ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" onPointerDown={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Choose existing {mediaKindLabel(block.mediaKind).toLowerCase()}</p><span className="text-xs text-slate-400">Upload through Insert → Video</span></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${mediaKindLabel(block.mediaKind).toLowerCase()}`} className={lightField} />
          <div className="max-h-48 space-y-1 overflow-y-auto">{filtered.map((option) => <button key={mediaKey(option.targetType, option.targetId)} type="button" onClick={() => chooseMedia(option)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50">{option.title}</button>)}{!filtered.length ? <p className="px-2 py-3 text-sm text-slate-500">No matching video in this book.</p> : null}</div>
        </div>
      ) : null}
    </div>
  );
}

function resolveMediaForBlock(block: MediaBlock, mediaOptions: ContentStudioMediaOption[], fallback: ResolvedMediaBlock | null) {
  const option = mediaOptions.find((entry) => entry.targetType === block.targetType && entry.targetId === block.targetId && entry.mediaKind === block.mediaKind) ?? null;
  if (!option) return fallback;
  return {
    mediaKind: block.mediaKind,
    targetType: block.targetType,
    targetId: block.targetId,
    title: option.title,
    label: block.label || option.defaultLabel,
    caption: block.caption ?? null,
    sourceBadge: option.sourceBadge,
    sourceDetail: option.sourceDetail,
    scopeLabel: option.scopeLabel,
    route: option.route,
    posterRoute: option.posterRoute,
    displayMode: block.displayMode,
    autoplay: false,
    controls: block.controls !== false,
    required: block.required,
    audienceOptions: option.audienceOptions,
    durationSeconds: option.durationSeconds,
    published: option.published,
    teacherOnly: option.teacherOnly,
    available: Boolean(option.route),
    offline: { contentVersion: 2, mediaKind: block.mediaKind, targetType: block.targetType, targetId: block.targetId, posterResourceId: block.posterResourceId ?? null },
  } satisfies ResolvedMediaBlock;
}
