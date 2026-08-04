import type { ReactNode } from "react";

import LinkedAssetView from "@/components/content/LinkedAssetView";
import KnowledgeReferenceView from "@/components/content/KnowledgeReferenceView";
import ActivityRenderer from "@/components/content/ActivityRenderer";
import WorksheetRenderer from "@/components/content/WorksheetRenderer";
import type { ContentRenderMode } from "@/lib/content-audience";
import type {
  BlockAlignment,
  BlockBackgroundStyle,
  BlockBorderStyle,
  ContentBlock,
  ContentDocument,
  InfoBoxVariant,
} from "@/lib/content-document";
import {
  blockLabel,
  isImageBlock,
  isImageGalleryBlock,
  isInfoBoxBlock,
  isLinkedAssetBlock,
  isListBlock,
  isMediaBlock,
  isObservationBoxBlock,
  isPlaceholderBlock,
  isSequenceBlock,
  isTableBlock,
  isTextBlock,
  sanitizeUrl,
} from "@/lib/content-document";
import type {
  KnowledgeDefinitionSummary,
  KnowledgeReference,
} from "@/lib/content-knowledge-types";
import type {
  ContentSectionDefinitionSummary,
  ResolvedLinkedAsset,
} from "@/lib/content-linked-asset-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";
import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";

export default function StructuredContentRenderer({
  document,
  mode,
  className = "",
  linkedAssets = {},
  activities = {},
  worksheets = {},
  media = {},
  sectionDefinitions = [],
  knowledgeDefinitions = {},
}: {
  document: ContentDocument;
  mode: ContentRenderMode;
  className?: string;
  linkedAssets?: Record<string, ResolvedLinkedAsset | null>;
  activities?: Record<string, ResolvedActivityBlock>;
  worksheets?: Record<string, ResolvedWorksheetBlock>;
  media?: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions?: ContentSectionDefinitionSummary[];
  knowledgeDefinitions?: Record<string, KnowledgeDefinitionSummary | null>;
}) {
  const sectionsById = new Map(sectionDefinitions.map((section) => [section.id, section]));
  return (
    <div className={`space-y-5 ${className}`}>
      {document.blocks.map((block) => (
        <RenderedBlock
          key={block.id}
          block={block}
          mode={mode}
          linkedAsset={linkedAssets[block.id] ?? null}
          activity={activities[block.id] ?? null}
          worksheet={worksheets[block.id] ?? null}
          media={media[block.id] ?? null}
          sectionLabel={
            (isLinkedAssetBlock(block) || isMediaBlock(block)) && block.sectionDefinitionId
              ? sectionsById.get(block.sectionDefinitionId)?.label ?? null
              : null
          }
          knowledgeDefinitions={knowledgeDefinitions}
        />
      ))}
    </div>
  );
}

function RenderedBlock({
  block,
  mode,
  linkedAsset,
  activity,
  worksheet,
  media,
  sectionLabel,
  knowledgeDefinitions,
}: {
  block: ContentBlock;
  mode: ContentRenderMode;
  linkedAsset: ResolvedLinkedAsset | null;
  activity: ResolvedActivityBlock;
  worksheet: ResolvedWorksheetBlock;
  media: ResolvedMediaBlock | null;
  sectionLabel: string | null;
  knowledgeDefinitions: Record<string, KnowledgeDefinitionSummary | null>;
}) {
  if (block.hidden) return null;
  const content = renderBlockBody(block, mode, linkedAsset, activity, worksheet, media, sectionLabel, knowledgeDefinitions);
  if (!content) return null;
  const wrapped = block.collapsed ? (
    <details className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        {block.icon ? `${block.icon} ` : ""}
        {block.title || blockLabel(block.type)}
      </summary>
      <div className="mt-4">{content}</div>
    </details>
  ) : (
    content
  );
  return (
    <section className={blockShellClass(block)}>
      {block.title && !block.collapsed ? (
        <div className="mb-3 flex items-center gap-2">
          {block.icon ? (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm ring-1 ring-slate-200">
              {block.icon}
            </span>
          ) : null}
          <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            {block.title}
          </h4>
        </div>
      ) : null}
      {!block.title && block.icon && !block.collapsed ? (
        <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm ring-1 ring-slate-200">
          {block.icon}
        </div>
      ) : null}
      {wrapped}
    </section>
  );
}

function renderBlockBody(
  block: ContentBlock,
  mode: ContentRenderMode,
  linkedAsset: ResolvedLinkedAsset | null,
  activity: ResolvedActivityBlock,
  worksheet: ResolvedWorksheetBlock,
  media: ResolvedMediaBlock | null,
  sectionLabel: string | null,
  knowledgeDefinitions: Record<string, KnowledgeDefinitionSummary | null>,
) {
  if (isTextBlock(block)) {
    const text = <MarkedText block={block} definitions={knowledgeDefinitions} />;
    switch (block.type) {
      case "heading":
        return <h2 className={textAlign(block.align, "text-4xl font-bold tracking-tight text-slate-950")}>{text}</h2>;
      case "subheading":
        return <h3 className={textAlign(block.align, "text-2xl font-semibold tracking-tight text-slate-900")}>{text}</h3>;
      case "caption":
        return <p className={textAlign(block.align, "whitespace-pre-wrap text-sm leading-6 text-slate-500")}>{text}</p>;
      case "quote":
        return (
          <blockquote className={`border-l-4 border-slate-300 pl-5 ${alignmentWrapper(block.align)}`}>
            <p className="whitespace-pre-wrap text-[1.05rem] italic leading-8 text-slate-700">{text}</p>
            {block.attribution ? (
              <footer className="mt-2 text-sm font-semibold text-slate-500">{block.attribution}</footer>
            ) : null}
          </blockquote>
        );
      case "callout":
        return (
          <aside className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-[1.05rem] leading-8 text-slate-800">
            <p className={textAlign(block.align, "whitespace-pre-wrap")}>{text}</p>
            {block.attribution ? (
              <p className="mt-2 text-sm font-semibold text-blue-900">{block.attribution}</p>
            ) : null}
          </aside>
        );
      case "paragraph":
      default:
        return <p className={textAlign(block.align, "whitespace-pre-wrap text-[1.05rem] leading-8 text-slate-800")}>{text}</p>;
    }
  }

  if (isListBlock(block)) {
    const items = block.items.map((item, index) => (
      <li key={`${block.id}-${index}`} className="whitespace-pre-wrap">
        {item}
      </li>
    ));
    return block.type === "numberedList" ? (
      <ol className={`${alignmentWrapper(block.align)} list-decimal space-y-2 pl-6 text-[1.05rem] leading-8 text-slate-800`}>
        {items}
      </ol>
    ) : (
      <ul className={`${alignmentWrapper(block.align)} list-disc space-y-2 pl-6 text-[1.05rem] leading-8 text-slate-800`}>
        {items}
      </ul>
    );
  }

  if (isImageBlock(block)) {
    const src = sanitizeUrl(block.url);
    return (
      <figure className={alignmentWrapper(block.align)}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={block.alt || "Illustration"}
            className={`${imageWidthClass(block.width)} ${imageFloatClass(block.float)} rounded-3xl object-contain`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Image unavailable
          </div>
        )}
        {block.caption ? (
          <figcaption className="mt-3 text-sm leading-6 text-slate-500">{block.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (isImageGalleryBlock(block)) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {block.images.map((image) => {
          const src = sanitizeUrl(image.url);
          return (
            <figure key={image.id} className="space-y-2">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={image.alt || "Gallery image"}
                  className="w-full rounded-3xl object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex min-h-48 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                  Image unavailable
                </div>
              )}
              {image.caption ? (
                <figcaption className="text-sm leading-6 text-slate-500">{image.caption}</figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
    );
  }

  if (isTableBlock(block)) {
    return (
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={row.id} className={rowIndex === 0 && block.headerRow ? "bg-slate-50" : ""}>
                {row.cells.map((cell) => (
                  <td
                    key={cell.id}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    className={`border-b border-slate-200 px-4 py-3 align-top ${
                      rowIndex === 0 && block.headerRow ? "font-bold text-slate-900" : ""
                    }`}
                  >
                    {cell.text || <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "formula") {
    const expression = block.expression || "x = ?";
    return block.displayMode === "inline" ? (
      <p className={textAlign(block.align, "text-[1.05rem] leading-8 text-slate-800")}>
        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-900">{expression}</code>
      </p>
    ) : (
      <div className={`${alignmentWrapper(block.align)} rounded-2xl bg-slate-950 px-5 py-4 font-mono text-lg text-white`}>
        {expression}
      </div>
    );
  }

  if (block.type === "divider") return <hr className="border-slate-200" />;

  if (isLinkedAssetBlock(block)) {
    if (block.targetType === "CHAPTER_ACTIVITY") {
      const rendered = <ActivityRenderer resolved={activity} mode={mode} />;
      if (activity) return rendered;
    }
    if (block.targetType === "PUBLISHER_WORKSHEET") {
      const rendered = <WorksheetRenderer resolved={worksheet} mode={mode} />;
      if (worksheet) return rendered;
    }
    return <LinkedAssetView block={block} linkedAsset={linkedAsset} sectionLabel={sectionLabel} mode={mode} />;
  }

  if (isMediaBlock(block)) {
    return <MediaBlockView media={media} sectionLabel={sectionLabel} />;
  }

  if (isInfoBoxBlock(block)) {
    return (
      <aside className={`${infoBoxClass(block.variant)} rounded-3xl px-5 py-4`}>
        <p className={textAlign(block.align, "whitespace-pre-wrap text-[1.02rem] leading-8")}>{block.text}</p>
      </aside>
    );
  }

  if (isSequenceBlock(block)) {
    return (
      <div className={`grid gap-4 ${block.type === "timeline" ? "" : "md:grid-cols-2"}`}>
        {block.items.map((item, index) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                {item.icon || index + 1}
              </span>
              <div className="min-w-0">
                <h5 className="font-bold text-slate-900">{item.title || `${blockLabel(block.type)} ${index + 1}`}</h5>
                {item.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.description}</p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (isObservationBoxBlock(block)) {
    return (
      <aside className="rounded-3xl border border-teal-200 bg-teal-50 px-5 py-4">
        <p className={textAlign(block.align, "whitespace-pre-wrap text-[1.02rem] leading-8 text-slate-800")}>{block.text}</p>
      </aside>
    );
  }

  if (isPlaceholderBlock(block)) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-slate-600">
        <p className="font-bold text-slate-900">{block.title || blockLabel(block.type)}</p>
        <p className="mt-2 text-sm leading-7">
          This component is renderer-ready for future lesson authoring and delivery expansion.
        </p>
      </div>
    );
  }

  return null;
}

function MediaBlockView({
  media,
  sectionLabel,
}: {
  media: ResolvedMediaBlock | null;
  sectionLabel: string | null;
}) {
  if (!media?.available || !media.route) {
    return (
      <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 px-5 py-5 text-sm text-amber-900">
        Media source unavailable or not permitted for this context.
      </div>
    );
  }
  const label = media.label || media.title;
  const caption = media.caption;
  const poster = media.posterRoute?.href;
  const fullWidth = media.displayMode === "fullWidth";
  if (media.displayMode === "button") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {sectionLabel ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{sectionLabel}</p> : null}
        <a
          href={media.route.href}
          className="mt-2 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white"
        >
          Open {label}
        </a>
        {caption ? <p className="mt-3 text-sm leading-6 text-slate-500">{caption}</p> : null}
      </div>
    );
  }
  return (
    <figure className={fullWidth ? "w-full" : "mx-auto max-w-3xl"}>
      {sectionLabel ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{sectionLabel}</p> : null}
      {media.mediaKind === "video" ? (
        <video
          src={media.route.href}
          poster={poster}
          controls={media.controls}
          preload="metadata"
          playsInline
          className="w-full rounded-3xl bg-slate-950"
        />
      ) : null}
      {media.mediaKind === "audio" ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-900">{label}</p>
          <audio src={media.route.href} controls={media.controls} preload="metadata" className="w-full" />
        </div>
      ) : null}
      {media.mediaKind === "animation" || media.mediaKind === "html5" || media.mediaKind === "simulation" ? (
        <iframe
          title={label}
          src={media.route.href}
          loading="lazy"
          sandbox="allow-scripts allow-forms allow-pointer-lock"
          referrerPolicy="no-referrer"
          className="min-h-[28rem] w-full rounded-3xl border border-slate-200 bg-white"
        />
      ) : null}
      {caption ? <figcaption className="mt-3 text-sm leading-6 text-slate-500">{caption}</figcaption> : null}
      {!caption && media.durationSeconds ? (
        <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {Math.floor(media.durationSeconds / 60)} min {media.durationSeconds % 60} sec
        </figcaption>
      ) : null}
    </figure>
  );
}

function MarkedText({
  block,
  definitions,
}: {
  block: { text: string; knowledgeReferences?: KnowledgeReference[] };
  definitions: Record<string, KnowledgeDefinitionSummary | null>;
}) {
  const references = (block.knowledgeReferences ?? [])
    .filter((reference) => reference.end <= block.text.length && reference.end > reference.start)
    .sort((a, b) => a.start - b.start);
  if (!references.length) return <>{block.text}</>;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const reference of references) {
    if (reference.start < cursor) continue;
    if (reference.start > cursor) nodes.push(block.text.slice(cursor, reference.start));
    const text = block.text.slice(reference.start, reference.end);
    nodes.push(
      <KnowledgeReferenceView
        key={reference.id}
        reference={reference}
        definition={definitions[knowledgeMapKey(reference.type, reference.targetId)] ?? null}
        text={text}
      />,
    );
    cursor = reference.end;
  }
  if (cursor < block.text.length) nodes.push(block.text.slice(cursor));
  return <>{nodes}</>;
}

function knowledgeMapKey(type: KnowledgeReference["type"], id: string) {
  return `${type}:${id}`;
}

function blockShellClass(block: ContentBlock) {
  return `${backgroundClass(block.backgroundStyle)} ${borderClass(block.borderStyle)}`;
}

function textAlign(align: BlockAlignment | undefined, base: string) {
  return `${alignmentWrapper(align)} ${base}`;
}

function alignmentWrapper(align: BlockAlignment | undefined) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function backgroundClass(style: BlockBackgroundStyle | undefined) {
  switch (style) {
    case "subtle":
      return "rounded-3xl bg-slate-50 px-4 py-4";
    case "accent":
      return "rounded-3xl bg-[#f7f4ed] px-4 py-4";
    case "emphasis":
      return "rounded-3xl bg-slate-950 px-4 py-4 text-white";
    case "none":
    default:
      return "";
  }
}

function borderClass(style: BlockBorderStyle | undefined) {
  switch (style) {
    case "subtle":
      return "ring-1 ring-slate-200";
    case "strong":
      return "ring-2 ring-slate-300";
    case "none":
    default:
      return "";
  }
}

function imageWidthClass(width: string | undefined) {
  switch (width) {
    case "medium":
      return "max-w-xl";
    case "wide":
      return "max-w-4xl";
    case "full":
    default:
      return "w-full";
  }
}

function imageFloatClass(float: string | undefined) {
  switch (float) {
    case "left":
      return "mr-auto";
    case "right":
      return "ml-auto";
    default:
      return "mx-auto";
  }
}

function infoBoxClass(variant: InfoBoxVariant) {
  switch (variant) {
    case "example":
      return "border border-emerald-200 bg-emerald-50 text-emerald-950";
    case "remember":
      return "border border-sky-200 bg-sky-50 text-sky-950";
    case "important":
      return "border border-amber-200 bg-amber-50 text-amber-950";
    case "tip":
      return "border border-lime-200 bg-lime-50 text-lime-950";
    case "warning":
      return "border border-rose-200 bg-rose-50 text-rose-950";
    case "didYouKnow":
      return "border border-indigo-200 bg-indigo-50 text-indigo-950";
    case "summary":
      return "border border-slate-200 bg-slate-100 text-slate-900";
  }
}
