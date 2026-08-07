"use client";

import { useState } from "react";
import {
  CircleAlert,
  PlayCircle,
} from "lucide-react";

import {
  linkedAssetAudienceLabel,
  type ContentSectionDefinitionSummary,
} from "@/lib/content-linked-asset-types";
import {
  MEDIA_DISPLAY_MODES,
  MEDIA_KINDS,
  type MediaBlock,
} from "@/lib/content-document";
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
  published?: boolean;
  audience?: string | null;
};

type MediaBlockEditorProps = {
  block: MediaBlock;
  mediaOptions: ContentStudioMediaOption[];
  resources: ResourceChoice[];
  sectionDefinitions: ContentSectionDefinitionSummary[];
  resolvedMedia: ResolvedMediaBlock | null;
  onUpdate: (patch: Partial<MediaBlock>) => void;
};

const darkField =
  "mt-2 w-full rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-white/25 focus:bg-white/15";

export default function MediaBlockEditor({
  block,
  mediaOptions,
  resources,
  sectionDefinitions,
  resolvedMedia,
  onUpdate,
}: MediaBlockEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(
    !block.targetId,
  );
  const [search, setSearch] = useState("");

  const validSections = sectionDefinitions.filter(
    (section) => {
      if (section.archived || !section.active) {
        return false;
      }

      if (!section.allowedAssetKinds.length) {
        return true;
      }

      return section.allowedAssetKinds.includes(
        block.mediaKind === "video"
          ? "video"
          : "resource",
      );
    },
  );

  const kindOptions = mediaOptions.filter(
    (option) =>
      option.mediaKind === block.mediaKind,
  );

  const filtered = kindOptions.filter((option) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      option.title.toLowerCase().includes(query) ||
      option.sourceBadge
        .toLowerCase()
        .includes(query) ||
      option.sourceDetail
        .toLowerCase()
        .includes(query) ||
      option.scopeLabel
        .toLowerCase()
        .includes(query)
    );
  });

  const activeMedia = resolveMediaForBlock(
    block,
    mediaOptions,
    resolvedMedia,
  );

  const audienceOptions =
    activeMedia?.audienceOptions ?? [
      "TEACHER",
      "STUDENT",
    ];

  const broken =
    Boolean(block.targetId) && !activeMedia;

  return (
    <div className="space-y-4 rounded-[1.5rem] bg-slate-950 p-4 text-white ring-1 ring-slate-900" onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-200 ring-1 ring-white/10">
          <PlayCircle className="h-4 w-4" />
          {mediaKindLabel(block.mediaKind)}
        </span>

        {activeMedia ? (
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
            {activeMedia.sourceBadge}
          </span>
        ) : null}

        {broken ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100">
            <CircleAlert className="h-3.5 w-3.5" />
            Broken media
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {MEDIA_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() =>
              onUpdate({
                mediaKind: kind,
                targetType:
                  kind === "video"
                    ? block.targetType
                    : "RESOURCE",
                targetId: "",
                label: mediaKindLabel(kind),
                audience: ["TEACHER", "STUDENT"],
                sectionDefinitionId: undefined,
              })
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              block.mediaKind === kind
                ? "bg-white text-slate-950"
                : "border border-white/15 bg-white/5 text-slate-200"
            }`}
          >
            {mediaKindLabel(kind)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-200 lg:col-span-2">
          Label
          <input
            data-block-id={block.id}
            value={block.label}
            onChange={(event) =>
              onUpdate({
                label: event.target.value,
              })
            }
            placeholder="Media label"
            className={darkField}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-200">
          Display
          <select
            value={block.displayMode}
            onChange={(event) =>
              onUpdate({
                displayMode:
                  event.target
                    .value as MediaBlock["displayMode"],
              })
            }
            className={darkField}
          >
            {MEDIA_DISPLAY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mediaDisplayModeLabel(mode)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-200 lg:col-span-2">
          Caption
          <input
            value={block.caption ?? ""}
            onChange={(event) =>
              onUpdate({
                caption:
                  event.target.value || undefined,
              })
            }
            placeholder="Optional caption"
            className={darkField}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-200">
          Section
          <select
            value={
              block.sectionDefinitionId ?? ""
            }
            onChange={(event) =>
              onUpdate({
                sectionDefinitionId:
                  event.target.value || undefined,
              })
            }
            className={darkField}
          >
            <option value="">
              No section label
            </option>

            {validSections.map((section) => (
              <option
                key={section.id}
                value={section.id}
              >
                {section.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-200">
          Poster Resource
          <select
            value={block.posterResourceId ?? ""}
            onChange={(event) =>
              onUpdate({
                posterResourceId:
                  event.target.value || undefined,
              })
            }
            className={darkField}
          >
            <option value="">
              Use source thumbnail
            </option>

            {resources.map((resource) => (
              <option
                key={resource.id}
                value={resource.id}
              >
                {resource.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/10">
          <input
            checked={block.controls}
            type="checkbox"
            onChange={(event) =>
              onUpdate({
                controls: event.target.checked,
              })
            }
          />
          Controls
        </label>

        <label className="flex items-center gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/10">
          <input
            checked={block.required}
            type="checkbox"
            onChange={(event) =>
              onUpdate({
                required: event.target.checked,
              })
            }
          />
          Required
        </label>
      </div>

      <div className="rounded-[1.25rem] bg-white/10 p-4 ring-1 ring-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Audience
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {audienceOptions.map((audience) => {
            const active =
              block.audience.includes(audience);

            return (
              <button
                key={audience}
                type="button"
                onClick={() => {
                  const next = active
                    ? block.audience.filter(
                        (entry) =>
                          entry !== audience,
                      )
                    : [
                        ...block.audience,
                        audience,
                      ];

                  onUpdate({
                    audience: next.length
                      ? next
                      : [audience],
                  });
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-white text-slate-950"
                    : "border border-white/15 text-slate-200"
                }`}
              >
                {linkedAssetAudienceLabel(
                  audience,
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.25rem] bg-white/10 p-4 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Source
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {activeMedia?.title ||
                "No media selected"}
            </p>

            <p className="mt-1 text-xs text-slate-300">
              {activeMedia
                ? `${activeMedia.sourceBadge} - ${activeMedia.sourceDetail} - ${activeMedia.scopeLabel}${
                    activeMedia.published
                      ? ""
                      : " - Draft"
                  }`
                : "Choose an existing publisher-owned media source for this manuscript position."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setPickerOpen(
                (current) => !current,
              )
            }
            className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100"
          >
            {pickerOpen
              ? "Hide picker"
              : "Choose media"}
          </button>
        </div>

        {pickerOpen ? (
          <div className="mt-4 space-y-3">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={`Search ${mediaKindLabel(
                block.mediaKind,
              ).toLowerCase()} sources`}
              className={darkField}
            />

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filtered.map((option) => (
                <button
                  key={mediaKey(
                    option.targetType,
                    option.targetId,
                  )}
                  type="button"
                  onClick={() => {
                    onUpdate({
                      mediaKind:
                        option.mediaKind,
                      targetType:
                        option.targetType,
                      targetId:
                        option.targetId,
                      label:
                        option.defaultLabel,
                      audience:
                        option.defaultAudience,
                    });

                    setPickerOpen(false);
                    setSearch("");
                  }}
                  className="w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {option.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-300">
                        {option.sourceBadge} -{" "}
                        {option.sourceDetail} -{" "}
                        {option.scopeLabel}
                      </p>
                    </div>

                    {!option.published ? (
                      <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-950">
                        Draft
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}

              {!filtered.length ? (
                <div className="rounded-[1.25rem] border border-dashed border-white/20 px-4 py-6 text-sm text-slate-300">
                  No matching media in the
                  current book scope.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function resolveMediaForBlock(
  block: MediaBlock,
  mediaOptions: ContentStudioMediaOption[],
  fallback: ResolvedMediaBlock | null,
) {
  const option =
    mediaOptions.find(
      (entry) =>
        entry.targetType ===
          block.targetType &&
        entry.targetId === block.targetId &&
        entry.mediaKind ===
          block.mediaKind,
    ) ?? null;

  if (!option) return fallback;

  return {
    mediaKind: block.mediaKind,
    targetType: block.targetType,
    targetId: block.targetId,
    title: option.title,
    label:
      block.label || option.defaultLabel,
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
    audienceOptions:
      option.audienceOptions,
    durationSeconds:
      option.durationSeconds,
    published: option.published,
    teacherOnly: option.teacherOnly,
    available: Boolean(option.route),
    offline: {
      contentVersion: 2,
      mediaKind: block.mediaKind,
      targetType: block.targetType,
      targetId: block.targetId,
      posterResourceId:
        block.posterResourceId ?? null,
    },
  } satisfies ResolvedMediaBlock;
}
