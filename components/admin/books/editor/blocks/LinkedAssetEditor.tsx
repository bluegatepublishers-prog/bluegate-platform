"use client";

import { useState } from "react";
import {
  BookOpenCheck,
  CircleAlert,
  ClipboardList,
  FileDown,
  FileText,
  PlayCircle,
} from "lucide-react";

import {
  filterSectionsForAssetKind,
  type LinkedAssetBlock,
} from "@/lib/content-document";
import {
  linkedAssetAudienceLabel,
  linkedAssetDisplayStyleLabel,
  linkedAssetKey,
  linkedAssetKindLabel,
  linkedAssetOpenModeLabel,
  type ContentSectionDefinitionSummary,
  type ContentStudioAssetOption,
  type LinkedAssetKind,
  type ResolvedLinkedAsset,
} from "@/lib/content-linked-asset-types";

type LinkedAssetEditorProps = {
  block: LinkedAssetBlock;
  assetOptions: ContentStudioAssetOption[];
  sectionDefinitions: ContentSectionDefinitionSummary[];
  resolvedAsset: ResolvedLinkedAsset | null;
  onUpdate: (patch: Partial<LinkedAssetBlock>) => void;
};

const field =
  "mt-2 w-full rounded-[1.25rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-200";

const linkedAssetKinds: LinkedAssetKind[] = [
  "video",
  "worksheet",
  "activity",
  "exercise",
  "resource",
  "learningOutcome",
];

export default function LinkedAssetEditor({
  block,
  assetOptions,
  sectionDefinitions,
  resolvedAsset,
  onUpdate,
}: LinkedAssetEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(
    !block.targetId,
  );
  const [search, setSearch] = useState("");

  const validSections = filterSectionsForAssetKind(
    sectionDefinitions,
    block.assetKind,
  );

  const activeSection =
    sectionDefinitions.find(
      (section) =>
        section.id === block.sectionDefinitionId,
    ) ?? null;

  const kindOptions = assetOptions.filter((option) => {
    if (option.assetKind !== block.assetKind) {
      return false;
    }

    if (!activeSection?.allowedAssetKinds.length) {
      return true;
    }

    return activeSection.allowedAssetKinds.includes(
      option.assetKind,
    );
  });

  const filtered = kindOptions.filter((option) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      option.title.toLowerCase().includes(query) ||
      option.sourceBadge
        .toLowerCase()
        .includes(query) ||
      option.scopeLabel
        .toLowerCase()
        .includes(query)
    );
  });

  const activeAsset = resolveAssetForBlock(
    block,
    assetOptions,
    resolvedAsset,
  );

  const audienceOptions =
    activeAsset?.audienceOptions ?? [
      "TEACHER",
      "STUDENT",
    ];

  const openModes =
    activeAsset?.openModes ?? ["route"];

  const broken =
    Boolean(block.targetId) && !activeAsset;

  return (
    <div className="space-y-4 rounded-[1.5rem] bg-[#faf7f0] p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
          {renderAssetIcon(block.assetKind)}
          {linkedAssetKindLabel(block.assetKind)}
        </span>

        {activeAsset ? (
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {activeAsset.sourceBadge}
          </span>
        ) : null}

        {broken ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
            <CircleAlert className="h-3.5 w-3.5" />
            Broken link
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {linkedAssetKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() =>
              onUpdate({
                assetKind: kind,
                targetType:
                  defaultTargetTypeForKind(kind),
                targetId: "",
                label: linkedAssetKindLabel(kind),
                audience: ["TEACHER", "STUDENT"],
                openMode: "route",
                sectionDefinitionId: undefined,
              } as Partial<LinkedAssetBlock>)
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              block.assetKind === kind
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {linkedAssetKindLabel(kind)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Label
          <input
            data-block-id={block.id}
            value={block.label}
            onChange={(event) =>
              onUpdate({
                label: event.target.value,
              })
            }
            placeholder="Asset label"
            className={field}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Display style
          <select
            value={block.displayStyle}
            onChange={(event) =>
              onUpdate({
                displayStyle:
                  event.target
                    .value as LinkedAssetBlock["displayStyle"],
              })
            }
            className={field}
          >
            {["button", "inline", "callout"].map(
              (style) => (
                <option key={style} value={style}>
                  {linkedAssetDisplayStyleLabel(
                    style as LinkedAssetBlock["displayStyle"],
                  )}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
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
            className={field}
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
        <label className="block text-sm font-semibold text-slate-700">
          Open mode
          <select
            value={block.openMode}
            onChange={(event) =>
              onUpdate({
                openMode:
                  event.target
                    .value as LinkedAssetBlock["openMode"],
              })
            }
            className={field}
          >
            {openModes.map((mode) => (
              <option key={mode} value={mode}>
                {linkedAssetOpenModeLabel(mode)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
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

        <div className="rounded-[1.25rem] bg-white px-4 py-3 ring-1 ring-slate-200">
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
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 text-slate-700"
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
      </div>

      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Source
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {activeAsset?.title ||
                "No asset selected"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {activeAsset
                ? `${activeAsset.sourceBadge} · ${activeAsset.scopeLabel}${
                    activeAsset.teacherOnly
                      ? " · Teacher only"
                      : ""
                  }`
                : "Choose an existing publisher-owned asset for this position."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setPickerOpen(
                (current) => !current,
              )
            }
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {pickerOpen
              ? "Hide picker"
              : "Choose asset"}
          </button>
        </div>

        {pickerOpen ? (
          <div className="mt-4 space-y-3">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={`Search ${linkedAssetKindLabel(
                block.assetKind,
              ).toLowerCase()} sources`}
              className={field}
            />

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filtered.map((option) => (
                <button
                  key={linkedAssetKey(
                    option.targetType,
                    option.targetId,
                  )}
                  type="button"
                  onClick={() => {
                    onUpdate({
                      assetKind:
                        option.assetKind,
                      targetType:
                        option.targetType,
                      targetId:
                        option.targetId,
                      label:
                        option.defaultLabel,
                      audience:
                        option.defaultAudience,
                      displayStyle:
                        block.displayStyle,
                      openMode:
                        option.openModes.includes(
                          block.openMode,
                        )
                          ? block.openMode
                          : option.openModes[0],
                    });

                    setPickerOpen(false);
                    setSearch("");
                  }}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {option.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {option.sourceBadge} ·{" "}
                        {option.sourceDetail} ·{" "}
                        {option.scopeLabel}
                      </p>
                    </div>

                    {option.teacherOnly ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                        Teacher
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}

              {!filtered.length ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  No matching assets for this
                  kind in the current book scope.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function resolveAssetForBlock(
  block: LinkedAssetBlock,
  assetOptions: ContentStudioAssetOption[],
  fallback: ResolvedLinkedAsset | null,
) {
  const option =
    assetOptions.find(
      (entry) =>
        entry.targetType ===
          block.targetType &&
        entry.targetId === block.targetId &&
        entry.assetKind === block.assetKind,
    ) ?? null;

  if (!option) return fallback;

 return {
  assetKind: block.assetKind,
  targetType: block.targetType,
  targetId: block.targetId,
  title: option.title,
  label: block.label || option.defaultLabel,
  sourceBadge: option.sourceBadge,
  sourceDetail: option.sourceDetail,
  scopeLabel: option.scopeLabel,
  audienceOptions: option.audienceOptions,
  openModes: option.openModes,
  teacherOnly: option.teacherOnly,
  route: option.route,
  available: Boolean(option.route),
} satisfies ResolvedLinkedAsset;
}

function renderAssetIcon(
  kind: LinkedAssetKind,
) {
  switch (kind) {
    case "video":
      return (
        <PlayCircle className="h-4 w-4" />
      );

    case "worksheet":
      return <FileDown className="h-4 w-4" />;

    case "activity":
      return (
        <ClipboardList className="h-4 w-4" />
      );

    case "exercise":
    case "learningOutcome":
      return (
        <BookOpenCheck className="h-4 w-4" />
      );

    case "resource":
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function defaultTargetTypeForKind(
  kind: LinkedAssetKind,
) {
  switch (kind) {
    case "video":
      return "VIDEO_LESSON";

    case "activity":
      return "CHAPTER_ACTIVITY";

    case "worksheet":
      return "PUBLISHER_WORKSHEET";

    case "exercise":
      return "BOOK_EXERCISE";

    case "learningOutcome":
      return "LEARNING_OUTCOME";

    case "resource":
    default:
      return "RESOURCE";
  }
}