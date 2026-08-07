import type { ContentBlock, ContentDocument } from "@/lib/content-document";
import {
  isImageBlock,
  isImageGalleryBlock,
  isInfoBoxBlock,
  isLinkedAssetBlock,
  isListBlock,
  isMediaBlock,
  isObservationBoxBlock,
  isSequenceBlock,
  isTableBlock,
  isTextBlock,
  isWorksheetBlock,
  isExerciseBlock,
} from "@/lib/content-document";
import type { KnowledgeDefinitionSummary } from "@/lib/content-knowledge-types";
import type { ContentSectionDefinitionSummary, ResolvedLinkedAsset } from "@/lib/content-linked-asset-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";

export const CONTENT_RENDER_MODES = ["ADMIN_PREVIEW", "TEACHER", "STUDENT"] as const;

export type ContentRenderMode = (typeof CONTENT_RENDER_MODES)[number];

export function canShowLinkedAsset(
  mode: ContentRenderMode,
  block: Extract<ContentBlock, { type: "linkedAsset" }>,
  section: ContentSectionDefinitionSummary | null,
) {
  if (mode === "ADMIN_PREVIEW") return true;
  if (mode === "TEACHER" && !block.audience.includes("TEACHER")) return false;
  if (mode === "STUDENT" && !block.audience.includes("STUDENT")) return false;
  if (!section) return true;
  if (!section.active || !section.published || section.archived) return false;
  if (!section.visibleIn.includes(mode === "TEACHER" ? "TEACHER" : "STUDENT")) return false;
  if (section.audience !== "BOTH" && section.audience !== mode) return false;
  return !section.allowedAssetKinds.length || section.allowedAssetKinds.includes(block.assetKind);
}

export function canShowMediaBlock(
  mode: ContentRenderMode,
  block: Extract<ContentBlock, { type: "media" }>,
  section: ContentSectionDefinitionSummary | null,
) {
  if (mode === "ADMIN_PREVIEW") return true;
  if (mode === "TEACHER" && !block.audience.includes("TEACHER")) return false;
  if (mode === "STUDENT" && !block.audience.includes("STUDENT")) return false;
  if (!section) return true;
  if (!section.active || !section.published || section.archived) return false;
  if (!section.visibleIn.includes(mode === "TEACHER" ? "TEACHER" : "STUDENT")) return false;
  if (section.audience !== "BOTH" && section.audience !== mode) return false;
  if (!section.allowedAssetKinds.length) return true;
  return section.allowedAssetKinds.includes(block.mediaKind === "video" ? "video" : "resource");
}

export function filterDocumentForMode(
  document: ContentDocument,
  mode: ContentRenderMode,
  sections: ContentSectionDefinitionSummary[],
) {
  if (mode === "ADMIN_PREVIEW") return document;
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  return {
    ...document,
    blocks: document.blocks.filter((block) => {
      if (block.hidden) return false;
      if (isMediaBlock(block)) {
        return canShowMediaBlock(
          mode,
          block,
          block.sectionDefinitionId ? sectionsById.get(block.sectionDefinitionId) ?? null : null,
        );
      }
      if (!isLinkedAssetBlock(block)) return true;
      return canShowLinkedAsset(
        mode,
        block,
        block.sectionDefinitionId ? sectionsById.get(block.sectionDefinitionId) ?? null : null,
      );
    }),
  };
}

export function filterResolvedKnowledgeForMode(
  resolved: Record<string, KnowledgeDefinitionSummary | null>,
  mode: ContentRenderMode,
) {
  if (mode === "ADMIN_PREVIEW") return resolved;
  return Object.fromEntries(
    Object.entries(resolved).map(([key, value]) => [
      key,
      value?.active && value.published ? value : null,
    ]),
  );
}

export function filterResolvedAssetsForMode(
  document: ContentDocument,
  resolved: Record<string, ResolvedLinkedAsset | null>,
  mode: ContentRenderMode,
) {
  if (mode === "ADMIN_PREVIEW" || mode === "TEACHER") return resolved;
  const next: Record<string, ResolvedLinkedAsset | null> = {};
  for (const block of document.blocks) {
    if (!isLinkedAssetBlock(block)) continue;
    const asset = resolved[block.id] ?? null;
    next[block.id] = asset && !asset.teacherOnly ? asset : null;
  }
  return next;
}

export function filterResolvedMediaForMode(
  document: ContentDocument,
  resolved: Record<string, ResolvedMediaBlock | null>,
  mode: ContentRenderMode,
) {
  if (mode === "ADMIN_PREVIEW" || mode === "TEACHER") return resolved;
  const next: Record<string, ResolvedMediaBlock | null> = {};
  for (const block of document.blocks) {
    if (!isMediaBlock(block)) continue;
    const media = resolved[block.id] ?? null;
    next[block.id] = media && !media.teacherOnly && media.published ? media : null;
  }
  return next;
}

export function documentHasRenderableContent(document: ContentDocument) {
  return document.blocks.some((block) => {
    if (block.hidden) return false;
    if (isTextBlock(block)) return Boolean(block.text.trim());
    if (isImageBlock(block)) return Boolean(block.url);
    if (isImageGalleryBlock(block)) return block.images.some((image) => Boolean(image.url));
    if (block.type === "linkedAsset") return Boolean(block.targetId);
    if (block.type === "media") return Boolean(block.targetId);
    if (block.type === "divider") return true;
    if (isListBlock(block)) return block.items.some((item) => item.trim());
    if (isInfoBoxBlock(block) || isObservationBoxBlock(block)) return Boolean(block.text.trim());
    if (isTableBlock(block)) return block.rows.some((row) => row.cells.some((cell) => cell.text.trim()));
    if (isWorksheetBlock(block)) return block.questions.length > 0 || Boolean(block.title?.trim() || block.instructions?.trim());
    if (isExerciseBlock(block)) return block.questions.length > 0 || block.groups.some((group) => group.questions.length > 0) || Boolean(block.title?.trim() || block.instructions?.trim() || block.introduction?.trim());
    if (isSequenceBlock(block)) return block.items.some((item) => item.title.trim() || item.description?.trim());
    if (block.type === "formula") return Boolean(block.expression.trim());
    return Boolean(block.title?.trim());
  });
}
