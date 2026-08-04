import {
  LINKED_ASSET_AUDIENCES,
  LINKED_ASSET_DISPLAY_STYLES,
  LINKED_ASSET_KINDS,
  LINKED_ASSET_OPEN_MODES,
  LINKED_ASSET_TARGET_TYPES,
  type ContentSectionDefinitionSummary,
  type LinkedAssetAudience,
  type LinkedAssetDisplayStyle,
  type LinkedAssetKind,
  type LinkedAssetOpenMode,
  type LinkedAssetTargetType,
} from "@/lib/content-linked-asset-types";
import {
  KNOWLEDGE_REFERENCE_TYPES,
  type KnowledgeReference,
} from "@/lib/content-knowledge-types";

export const CONTENT_DOCUMENT_VERSION = 2 as const;

export const BLOCK_ALIGNMENTS = ["left", "center", "right"] as const;
export const BLOCK_BACKGROUND_STYLES = ["none", "subtle", "accent", "emphasis"] as const;
export const BLOCK_BORDER_STYLES = ["none", "subtle", "strong"] as const;
export const INFO_BOX_VARIANTS = [
  "example",
  "remember",
  "important",
  "tip",
  "warning",
  "didYouKnow",
  "summary",
] as const;
export const FORMULA_DISPLAY_MODES = ["inline", "block"] as const;
export const IMAGE_WIDTHS = ["full", "wide", "medium"] as const;
export const IMAGE_FLOATS = ["none", "left", "right"] as const;
export const MEDIA_KINDS = ["video", "audio", "animation", "html5", "simulation"] as const;
export const MEDIA_TARGET_TYPES = ["RESOURCE", "VIDEO_LESSON"] as const;
export const MEDIA_DISPLAY_MODES = ["inline", "button", "fullWidth"] as const;
export const PLACEHOLDER_BLOCK_TYPES = ["mindMap", "flowChart"] as const;

export type BlockAlignment = (typeof BLOCK_ALIGNMENTS)[number];
export type BlockBackgroundStyle = (typeof BLOCK_BACKGROUND_STYLES)[number];
export type BlockBorderStyle = (typeof BLOCK_BORDER_STYLES)[number];
export type InfoBoxVariant = (typeof INFO_BOX_VARIANTS)[number];
export type FormulaDisplayMode = (typeof FORMULA_DISPLAY_MODES)[number];
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];
export type ImageFloat = (typeof IMAGE_FLOATS)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];
export type MediaTargetType = (typeof MEDIA_TARGET_TYPES)[number];
export type MediaDisplayMode = (typeof MEDIA_DISPLAY_MODES)[number];
export type PlaceholderBlockType = (typeof PLACEHOLDER_BLOCK_TYPES)[number];

export type ContentBlockType =
  | "heading"
  | "subheading"
  | "paragraph"
  | "caption"
  | "bulletList"
  | "numberedList"
  | "quote"
  | "callout"
  | "image"
  | "imageGallery"
  | "diagram"
  | "table"
  | "formula"
  | "divider"
  | "linkedAsset"
  | "media"
  | "infoBox"
  | "timeline"
  | "comparisonTable"
  | "processFlow"
  | "stepList"
  | "observationBox"
  | PlaceholderBlockType;

type BaseBlock = {
  id: string;
  type: ContentBlockType;
  title?: string;
  icon?: string;
  align?: BlockAlignment;
  backgroundStyle?: BlockBackgroundStyle;
  borderStyle?: BlockBorderStyle;
  hidden?: boolean;
  collapsed?: boolean;
};

type ImageLike = {
  resourceId?: string;
  url: string;
  alt: string;
  caption?: string;
};

type TableCell = {
  id: string;
  text: string;
  colSpan?: number;
  rowSpan?: number;
};

type TableRow = {
  id: string;
  cells: TableCell[];
};

type SequenceItem = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
};

export type TextBlock = BaseBlock & {
  type: "heading" | "subheading" | "paragraph" | "caption" | "quote" | "callout";
  text: string;
  attribution?: string;
  knowledgeReferences?: KnowledgeReference[];
};

export type ListBlock = BaseBlock & {
  type: "bulletList" | "numberedList";
  items: string[];
};

export type ImageBlock = BaseBlock & {
  type: "image" | "diagram";
} & ImageLike & {
    width?: ImageWidth;
    float?: ImageFloat;
  };

export type ImageGalleryBlock = BaseBlock & {
  type: "imageGallery";
  images: (ImageLike & { id: string; width?: ImageWidth })[];
};

export type TableBlock = BaseBlock & {
  type: "table" | "comparisonTable";
  headerRow?: boolean;
  rows: TableRow[];
};

export type FormulaBlock = BaseBlock & {
  type: "formula";
  expression: string;
  displayMode?: FormulaDisplayMode;
};

export type DividerBlock = BaseBlock & {
  type: "divider";
};

export type LinkedAssetBlock = BaseBlock & {
  type: "linkedAsset";
  assetKind: LinkedAssetKind;
  label: string;
  targetType: LinkedAssetTargetType;
  targetId: string;
  audience: LinkedAssetAudience[];
  displayStyle: LinkedAssetDisplayStyle;
  openMode: LinkedAssetOpenMode;
  required: boolean;
  sectionDefinitionId?: string;
};

export type MediaBlock = BaseBlock & {
  type: "media";
  mediaKind: MediaKind;
  targetType: MediaTargetType;
  targetId: string;
  label: string;
  caption?: string;
  posterResourceId?: string;
  displayMode: MediaDisplayMode;
  autoplay: false;
  controls: boolean;
  required: boolean;
  audience: LinkedAssetAudience[];
  sectionDefinitionId?: string;
};

export type InfoBoxBlock = BaseBlock & {
  type: "infoBox";
  variant: InfoBoxVariant;
  text: string;
};

export type SequenceBlock = BaseBlock & {
  type: "timeline" | "processFlow" | "stepList";
  items: SequenceItem[];
};

export type ObservationBoxBlock = BaseBlock & {
  type: "observationBox";
  text: string;
};

export type PlaceholderBlock = BaseBlock & {
  type: PlaceholderBlockType;
};

export type ContentBlock =
  | TextBlock
  | ListBlock
  | ImageBlock
  | ImageGalleryBlock
  | TableBlock
  | FormulaBlock
  | DividerBlock
  | LinkedAssetBlock
  | MediaBlock
  | InfoBoxBlock
  | SequenceBlock
  | ObservationBoxBlock
  | PlaceholderBlock;

export type ContentDocument = {
  version: typeof CONTENT_DOCUMENT_VERSION;
  blocks: ContentBlock[];
};

const supportedTypes = new Set<ContentBlockType>([
  "heading",
  "subheading",
  "paragraph",
  "caption",
  "bulletList",
  "numberedList",
  "quote",
  "callout",
  "image",
  "imageGallery",
  "diagram",
  "table",
  "formula",
  "divider",
  "linkedAsset",
  "media",
  "infoBox",
  "timeline",
  "comparisonTable",
  "processFlow",
  "stepList",
  "observationBox",
  "mindMap",
  "flowChart",
]);

const fallbackParagraph = (): ContentDocument => ({
  version: CONTENT_DOCUMENT_VERSION,
  blocks: [createTextBlock("paragraph", "")],
});

export function createContentDocument(blocks: ContentBlock[] = []): ContentDocument {
  return {
    version: CONTENT_DOCUMENT_VERSION,
    blocks: blocks.length ? blocks : [createTextBlock("paragraph", "")],
  };
}

export function createTextBlock(
  type: "heading" | "subheading" | "paragraph" | "caption" | "quote" | "callout",
  text = "",
): TextBlock {
  return { id: createStableId(), type, text };
}

export function createListBlock(
  type: "bulletList" | "numberedList",
  items: string[] = [""],
): ListBlock {
  return {
    id: createStableId(),
    type,
    items: items.length ? items : [""],
  };
}

export function createImageBlock(
  type: "image" | "diagram" = "image",
  partial?: Partial<ImageBlock>,
): ImageBlock {
  return {
    id: createStableId(),
    type,
    url: partial?.url ? sanitizeUrl(partial.url) : "",
    alt: normalizeText(partial?.alt ?? ""),
    caption: normalizeOptionalText(partial?.caption),
    resourceId: normalizeOptionalText(partial?.resourceId),
    width: normalizeImageWidth(partial?.width),
    float: normalizeImageFloat(partial?.float),
  };
}

export function createImageGalleryBlock(
  partial?: Partial<ImageGalleryBlock>,
): ImageGalleryBlock {
  return {
    id: createStableId(),
    type: "imageGallery",
    images:
      partial?.images?.length
        ? partial.images.map((image) => normalizeGalleryImage(image))
        : [createGalleryImage()],
  };
}

export function createTableBlock(
  type: "table" | "comparisonTable" = "table",
  partial?: Partial<TableBlock>,
): TableBlock {
  return {
    id: createStableId(),
    type,
    headerRow: partial?.headerRow ?? true,
    rows:
      partial?.rows?.length
        ? partial.rows.map((row) => normalizeTableRow(row))
        : [
            createTableRow(2),
            createTableRow(2),
          ],
  };
}

export function createFormulaBlock(partial?: Partial<FormulaBlock>): FormulaBlock {
  return {
    id: createStableId(),
    type: "formula",
    expression: normalizeText(partial?.expression ?? ""),
    displayMode: normalizeFormulaDisplayMode(partial?.displayMode),
  };
}

export function createDividerBlock(): DividerBlock {
  return { id: createStableId(), type: "divider" };
}

export function createLinkedAssetBlock(partial?: Partial<LinkedAssetBlock>): LinkedAssetBlock {
  return {
    id: createStableId(),
    type: "linkedAsset",
    assetKind: normalizeAssetKind(partial?.assetKind) ?? "resource",
    label: normalizeText(partial?.label) || "Linked asset",
    targetType: normalizeTargetType(partial?.targetType) ?? "RESOURCE",
    targetId: normalizeText(partial?.targetId),
    audience: normalizeAudienceList(partial?.audience),
    displayStyle: normalizeDisplayStyle(partial?.displayStyle) ?? "button",
    openMode: normalizeOpenMode(partial?.openMode) ?? "route",
    required: Boolean(partial?.required),
    sectionDefinitionId: normalizeOptionalText(partial?.sectionDefinitionId),
  };
}

export function createMediaBlock(partial?: Partial<MediaBlock>): MediaBlock {
  return {
    id: createStableId(),
    type: "media",
    mediaKind: normalizeMediaKind(partial?.mediaKind) ?? "video",
    targetType: normalizeMediaTargetType(partial?.targetType) ?? "RESOURCE",
    targetId: normalizeText(partial?.targetId),
    label: normalizeText(partial?.label) || "Media",
    caption: normalizeOptionalText(partial?.caption),
    posterResourceId: normalizeOptionalText(partial?.posterResourceId),
    displayMode: normalizeMediaDisplayMode(partial?.displayMode) ?? "inline",
    autoplay: false,
    controls: partial?.controls === false ? false : true,
    required: Boolean(partial?.required),
    audience: normalizeAudienceList(partial?.audience),
    sectionDefinitionId: normalizeOptionalText(partial?.sectionDefinitionId),
  };
}

export function createInfoBoxBlock(
  variant: InfoBoxVariant = "important",
  partial?: Partial<InfoBoxBlock>,
): InfoBoxBlock {
  return {
    id: createStableId(),
    type: "infoBox",
    variant: normalizeInfoBoxVariant(partial?.variant) ?? variant,
    text: normalizeText(partial?.text ?? ""),
    title: normalizeOptionalText(partial?.title) ?? infoBoxDefaultTitle(variant),
  };
}

export function createSequenceBlock(
  type: "timeline" | "processFlow" | "stepList",
  partial?: Partial<SequenceBlock>,
): SequenceBlock {
  return {
    id: createStableId(),
    type,
    items:
      partial?.items?.length
        ? partial.items.map((item) => normalizeSequenceItem(item))
        : [createSequenceItem(), createSequenceItem()],
  };
}

export function createObservationBoxBlock(
  partial?: Partial<ObservationBoxBlock>,
): ObservationBoxBlock {
  return {
    id: createStableId(),
    type: "observationBox",
    text: normalizeText(partial?.text ?? ""),
    title: normalizeOptionalText(partial?.title) ?? "Observation",
  };
}

export function createPlaceholderBlock(type: PlaceholderBlockType): PlaceholderBlock {
  return {
    id: createStableId(),
    type,
    title: placeholderBlockTitle(type),
    collapsed: true,
  };
}

export function createBlockByType(type: ContentBlockType): ContentBlock {
  switch (type) {
    case "heading":
    case "subheading":
    case "paragraph":
    case "caption":
    case "quote":
    case "callout":
      return createTextBlock(type, "");
    case "bulletList":
    case "numberedList":
      return createListBlock(type);
    case "image":
    case "diagram":
      return createImageBlock(type);
    case "imageGallery":
      return createImageGalleryBlock();
    case "table":
    case "comparisonTable":
      return createTableBlock(type);
    case "formula":
      return createFormulaBlock();
    case "divider":
      return createDividerBlock();
    case "linkedAsset":
      return createLinkedAssetBlock();
    case "media":
      return createMediaBlock();
    case "infoBox":
      return createInfoBoxBlock("important");
    case "timeline":
    case "processFlow":
    case "stepList":
      return createSequenceBlock(type);
    case "observationBox":
      return createObservationBoxBlock();
    case "mindMap":
    case "flowChart":
      return createPlaceholderBlock(type);
  }
}

export function convertBlockType(block: ContentBlock, type: ContentBlockType): ContentBlock {
  if (block.type === type) return block;
  const shared = sharedPresentationProps(block);
  const id = block.id;
  const textValue = extractBlockText(block);
  if (
    type === "heading" ||
    type === "subheading" ||
    type === "paragraph" ||
    type === "caption" ||
    type === "quote" ||
    type === "callout"
  ) {
    return {
      ...createTextBlock(type, textValue),
      ...shared,
      id,
      attribution: block.type === "quote" || block.type === "callout" ? block.attribution : undefined,
      knowledgeReferences: isTextBlock(block) ? block.knowledgeReferences : undefined,
    };
  }
  if (type === "bulletList" || type === "numberedList") {
    return {
      ...createListBlock(type, extractBlockItems(block)),
      ...shared,
      id,
    };
  }
  if (type === "image" || type === "diagram") {
    const source = isImageLikeBlock(block) ? block : null;
    return {
      ...createImageBlock(type, source ? source : undefined),
      ...shared,
      id,
    };
  }
  if (type === "imageGallery") {
    const images = isImageLikeBlock(block)
      ? [normalizeGalleryImage({ ...block, id: createStableId() })]
      : "images" in block && Array.isArray((block as ImageGalleryBlock).images)
        ? (block as ImageGalleryBlock).images.map((image) => normalizeGalleryImage(image))
        : [createGalleryImage()];
    return { ...createImageGalleryBlock({ images }), ...shared, id };
  }
  if (type === "table" || type === "comparisonTable") {
    const rows =
      block.type === "table" || block.type === "comparisonTable"
        ? block.rows
        : rowsFromItems(extractBlockItems(block));
    return { ...createTableBlock(type, { rows }), ...shared, id };
  }
  if (type === "formula") {
    return {
      ...createFormulaBlock({ expression: textValue }),
      ...shared,
      id,
    };
  }
  if (type === "divider") {
    return { ...createDividerBlock(), ...shared, id };
  }
  if (type === "linkedAsset") {
    return { ...createLinkedAssetBlock(), ...shared, id };
  }
  if (type === "media") {
    return { ...createMediaBlock({ label: textValue || "Media" }), ...shared, id };
  }
  if (type === "infoBox") {
    return {
      ...createInfoBoxBlock("important", { text: textValue, title: block.title }),
      ...shared,
      id,
    };
  }
  if (type === "timeline" || type === "processFlow" || type === "stepList") {
    const items =
      block.type === "timeline" || block.type === "processFlow" || block.type === "stepList"
        ? block.items
        : extractBlockItems(block).map((item) => normalizeSequenceItem({ title: item }));
    return { ...createSequenceBlock(type, { items }), ...shared, id };
  }
  if (type === "observationBox") {
    return {
      ...createObservationBoxBlock({ text: textValue, title: block.title }),
      ...shared,
      id,
    };
  }
  return { ...createPlaceholderBlock(type), ...shared, id };
}

export function filterSectionsForAssetKind(
  sections: ContentSectionDefinitionSummary[],
  kind: LinkedAssetKind,
) {
  return sections.filter(
    (section) =>
      !section.archived &&
      section.active &&
      (section.allowedAssetKinds.length === 0 || section.allowedAssetKinds.includes(kind)),
  );
}

export function normalizeContentDocument(value: unknown): ContentDocument {
  if (value === null || value === undefined) return fallbackParagraph();

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallbackParagraph();
    try {
      return normalizeContentDocument(JSON.parse(trimmed));
    } catch {
      return legacyTextToDocument(trimmed);
    }
  }

  if (Array.isArray(value)) {
    return normalizeContentDocument({ version: CONTENT_DOCUMENT_VERSION, blocks: value });
  }

  if (!isRecord(value)) return fallbackParagraph();

  if (Array.isArray(value.blocks)) {
    const blocks = value.blocks
      .map((block) => normalizeBlock(block))
      .filter((block): block is ContentBlock => Boolean(block));
    return {
      version: CONTENT_DOCUMENT_VERSION,
      blocks: blocks.length ? blocks : [createTextBlock("paragraph", "")],
    };
  }

  if (isSupportedType(value.type)) {
    const block = normalizeBlock(value);
    return {
      version: CONTENT_DOCUMENT_VERSION,
      blocks: block ? [block] : [createTextBlock("paragraph", "")],
    };
  }

  const content = readFirstText(value, ["content", "text", "body", "summary", "description"]);
  if (content) return legacyTextToDocument(content);

  const segments = extractLegacySegments(value);
  if (segments.length) {
    return {
      version: CONTENT_DOCUMENT_VERSION,
      blocks: segmentsToBlocks(segments),
    };
  }

  return fallbackParagraph();
}

export function serializeContentDocument(value: unknown) {
  return JSON.stringify(normalizeContentDocument(value));
}

export function insertBlockAfter(
  document: ContentDocument,
  afterId: string | null,
  block: ContentBlock,
) {
  const blocks = [...document.blocks];
  if (!afterId) {
    blocks.unshift(block);
    return createContentDocument(blocks);
  }
  const index = blocks.findIndex((entry) => entry.id === afterId);
  if (index < 0) {
    blocks.push(block);
    return createContentDocument(blocks);
  }
  blocks.splice(index + 1, 0, block);
  return createContentDocument(blocks);
}

export function insertBlockBefore(
  document: ContentDocument,
  beforeId: string | null,
  block: ContentBlock,
) {
  const blocks = [...document.blocks];
  if (!beforeId) {
    blocks.push(block);
    return createContentDocument(blocks);
  }
  const index = blocks.findIndex((entry) => entry.id === beforeId);
  if (index < 0) {
    blocks.push(block);
    return createContentDocument(blocks);
  }
  blocks.splice(index, 0, block);
  return createContentDocument(blocks);
}

export function updateBlock(
  document: ContentDocument,
  blockId: string,
  updater: (block: ContentBlock) => ContentBlock,
) {
  const blocks = document.blocks.map((block) => (block.id === blockId ? updater(block) : block));
  return createContentDocument(blocks);
}

export function removeBlock(document: ContentDocument, blockId: string) {
  const blocks = document.blocks.filter((block) => block.id !== blockId);
  return createContentDocument(blocks);
}

export function moveBlock(document: ContentDocument, blockId: string, direction: -1 | 1) {
  const blocks = [...document.blocks];
  const index = blocks.findIndex((block) => block.id === blockId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= blocks.length) return document;
  [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
  return createContentDocument(blocks);
}

export function duplicateBlock(document: ContentDocument, blockId: string) {
  const index = document.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return document;
  const source = document.blocks[index];
  const copy = normalizeBlock({ ...source, id: createStableId() });
  if (!copy) return document;
  const blocks = [...document.blocks];
  blocks.splice(index + 1, 0, copy);
  return createContentDocument(blocks);
}

export function blockLabel(type: ContentBlockType) {
  switch (type) {
    case "heading":
      return "Heading";
    case "subheading":
      return "Subheading";
    case "paragraph":
      return "Paragraph";
    case "caption":
      return "Caption";
    case "bulletList":
      return "Bullet List";
    case "numberedList":
      return "Numbered List";
    case "quote":
      return "Quote";
    case "callout":
      return "Callout";
    case "image":
      return "Image";
    case "imageGallery":
      return "Image Gallery";
    case "diagram":
      return "Diagram";
    case "table":
      return "Table";
    case "formula":
      return "Formula";
    case "divider":
      return "Divider";
    case "linkedAsset":
      return "Link Asset";
    case "media":
      return "Media";
    case "infoBox":
      return "Teaching Box";
    case "timeline":
      return "Timeline";
    case "comparisonTable":
      return "Comparison Table";
    case "processFlow":
      return "Process Flow";
    case "stepList":
      return "Step List";
    case "observationBox":
      return "Observation Box";
    case "mindMap":
      return "Mind Map";
    case "flowChart":
      return "Flow Chart";
  }
}

export function defaultNextBlockType(type: ContentBlockType) {
  switch (type) {
    case "bulletList":
      return "bulletList";
    case "numberedList":
      return "numberedList";
    case "timeline":
    case "processFlow":
    case "stepList":
    case "image":
    case "imageGallery":
    case "diagram":
    case "table":
    case "formula":
    case "divider":
    case "linkedAsset":
    case "media":
    case "infoBox":
    case "comparisonTable":
    case "observationBox":
    case "mindMap":
    case "flowChart":
    case "heading":
    case "subheading":
    case "caption":
    case "quote":
    case "callout":
      return "paragraph";
    case "paragraph":
    default:
      return "paragraph";
  }
}

export function isTextBlock(block: ContentBlock): block is TextBlock {
  return ["heading", "subheading", "paragraph", "caption", "quote", "callout"].includes(block.type);
}

export function isListBlock(block: ContentBlock): block is ListBlock {
  return block.type === "bulletList" || block.type === "numberedList";
}

export function isImageBlock(block: ContentBlock): block is ImageBlock {
  return block.type === "image" || block.type === "diagram";
}

export function isImageGalleryBlock(block: ContentBlock): block is ImageGalleryBlock {
  return block.type === "imageGallery";
}

export function isTableBlock(block: ContentBlock): block is TableBlock {
  return block.type === "table" || block.type === "comparisonTable";
}

export function isFormulaBlock(block: ContentBlock): block is FormulaBlock {
  return block.type === "formula";
}

export function isLinkedAssetBlock(block: ContentBlock): block is LinkedAssetBlock {
  return block.type === "linkedAsset";
}

export function isMediaBlock(block: ContentBlock): block is MediaBlock {
  return block.type === "media";
}

export function isInfoBoxBlock(block: ContentBlock): block is InfoBoxBlock {
  return block.type === "infoBox";
}

export function isSequenceBlock(block: ContentBlock): block is SequenceBlock {
  return block.type === "timeline" || block.type === "processFlow" || block.type === "stepList";
}

export function isObservationBoxBlock(block: ContentBlock): block is ObservationBoxBlock {
  return block.type === "observationBox";
}

export function isPlaceholderBlock(block: ContentBlock): block is PlaceholderBlock {
  return block.type === "mindMap" || block.type === "flowChart";
}

export function sanitizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? "" : trimmed;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeBlock(value: unknown): ContentBlock | null {
  if (typeof value === "string") {
    const text = normalizeText(value);
    return text ? createTextBlock("paragraph", text) : null;
  }

  if (!isRecord(value)) return null;

  const type = isSupportedType(value.type) ? value.type : null;
  const id = normalizeId(typeof value.id === "string" ? value.id : "");
  const shared = normalizeSharedProps(value);

  if (type === "divider") return { id, type, ...shared };

  if (type === "linkedAsset") {
    const assetKind = normalizeAssetKind(value.assetKind);
    const targetType = normalizeTargetType(value.targetType);
    const targetId = normalizeText(typeof value.targetId === "string" ? value.targetId : "");
    if (!assetKind || !targetType) return null;
    return {
      id,
      type: "linkedAsset",
      ...shared,
      assetKind,
      label: normalizeText(typeof value.label === "string" ? value.label : "") || "Linked asset",
      targetType,
      targetId,
      audience: normalizeAudienceList(value.audience),
      displayStyle: normalizeDisplayStyle(value.displayStyle) ?? "button",
      openMode: normalizeOpenMode(value.openMode) ?? "route",
      required: Boolean(value.required),
      sectionDefinitionId: normalizeOptionalText(
        typeof value.sectionDefinitionId === "string" ? value.sectionDefinitionId : "",
      ),
    };
  }

  if (type === "media") {
    const mediaKind = normalizeMediaKind(value.mediaKind);
    const targetType = normalizeMediaTargetType(value.targetType);
    if (!mediaKind || !targetType) return null;
    return {
      id,
      type: "media",
      ...shared,
      mediaKind,
      targetType,
      targetId: normalizeText(typeof value.targetId === "string" ? value.targetId : ""),
      label: normalizeText(typeof value.label === "string" ? value.label : "") || "Media",
      caption: normalizeOptionalText(readFirstText(value, ["caption", "description"])),
      posterResourceId: normalizeOptionalText(
        typeof value.posterResourceId === "string" ? value.posterResourceId : "",
      ),
      displayMode: normalizeMediaDisplayMode(value.displayMode) ?? "inline",
      autoplay: false,
      controls: value.controls === false ? false : true,
      required: Boolean(value.required),
      audience: normalizeAudienceList(value.audience),
      sectionDefinitionId: normalizeOptionalText(
        typeof value.sectionDefinitionId === "string" ? value.sectionDefinitionId : "",
      ),
    };
  }

  if (type === "image" || type === "diagram") {
    const url = sanitizeUrl(readFirstText(value, ["url", "src", "href", "fileUrl"]));
    return {
      id,
      type,
      ...shared,
      url,
      alt: normalizeText(readFirstText(value, ["alt", "title", "caption"])),
      caption: normalizeOptionalText(readFirstText(value, ["caption", "description"])),
      resourceId: normalizeOptionalText(readFirstText(value, ["resourceId"])),
      width: normalizeImageWidth(value.width),
      float: normalizeImageFloat(value.float),
    };
  }

  if (type === "imageGallery") {
    const images = Array.isArray(value.images)
      ? value.images.map((image) => normalizeGalleryImage(image)).filter(Boolean)
      : [];
    return {
      id,
      type,
      ...shared,
      images: images.length ? images : [createGalleryImage()],
    };
  }

  if (type === "table" || type === "comparisonTable") {
    const rows = Array.isArray(value.rows)
      ? value.rows.map((row) => normalizeTableRow(row)).filter(Boolean)
      : [];
    return {
      id,
      type,
      ...shared,
      headerRow: value.headerRow === false ? false : true,
      rows: rows.length ? rows : [createTableRow(2), createTableRow(2)],
    };
  }

  if (type === "formula") {
    return {
      id,
      type,
      ...shared,
      expression: normalizeText(readFirstText(value, ["expression", "text", "content"])),
      displayMode: normalizeFormulaDisplayMode(value.displayMode),
    };
  }

  if (type === "timeline" || type === "processFlow" || type === "stepList") {
    const items = Array.isArray(value.items)
      ? value.items.map((item) => normalizeSequenceItem(item)).filter(Boolean)
      : [];
    return {
      id,
      type,
      ...shared,
      items: items.length ? items : [createSequenceItem(), createSequenceItem()],
    };
  }

  if (type === "infoBox") {
    return {
      id,
      type,
      ...shared,
      variant: normalizeInfoBoxVariant(value.variant) ?? "important",
      text: normalizeText(readFirstText(value, ["text", "content", "body", "description"])),
      title:
        normalizeOptionalText(readFirstText(value, ["title"])) ??
        infoBoxDefaultTitle(normalizeInfoBoxVariant(value.variant) ?? "important"),
    };
  }

  if (type === "observationBox") {
    return {
      id,
      type,
      ...shared,
      text: normalizeText(readFirstText(value, ["text", "content", "body", "description"])),
      title: normalizeOptionalText(readFirstText(value, ["title"])) ?? "Observation",
    };
  }

  if (type === "mindMap" || type === "flowChart") {
    return {
      id,
      type,
      ...shared,
      title: normalizeOptionalText(readFirstText(value, ["title"])) ?? placeholderBlockTitle(type),
    };
  }

  if (type === "bulletList" || type === "numberedList") {
    const items = normalizeStringList(value.items);
    return {
      id,
      type,
      ...shared,
      items: items.length ? items : [""],
    };
  }

  if (
    type === "quote" ||
    type === "callout" ||
    type === "heading" ||
    type === "subheading" ||
    type === "paragraph" ||
    type === "caption"
  ) {
    const text =
      normalizeText(readFirstText(value, ["text", "content", "body", "value", "title", "caption"])) ||
      normalizeText(typeof value === "string" ? value : "");
    return {
      id,
      type,
      ...shared,
      text,
      attribution: normalizeOptionalText(readFirstText(value, ["attribution", "source"])),
      knowledgeReferences: normalizeKnowledgeReferences(value.knowledgeReferences, text),
    };
  }

  if (isRecord(value.content) || Array.isArray(value.content) || typeof value.content === "string") {
    return normalizeBlock(value.content);
  }

  const segments = extractLegacySegments(value);
  if (segments.length === 1) return createTextBlock("paragraph", segments[0]);
  if (segments.length > 1) return createListBlock("bulletList", segments);
  return null;
}

function legacyTextToDocument(value: string): ContentDocument {
  const blocks = markdownishToBlocks(value);
  return {
    version: CONTENT_DOCUMENT_VERSION,
    blocks: blocks.length ? blocks : [createTextBlock("paragraph", value)],
  };
}

function markdownishToBlocks(value: string): ContentBlock[] {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let buffer: string[] = [];
  let listMode: "bulletList" | "numberedList" | null = null;
  let listItems: string[] = [];

  function flushBuffer() {
    const text = normalizeText(buffer.join("\n"));
    if (!text) return;
    blocks.push(createTextBlock("paragraph", text));
    buffer = [];
  }

  function flushList() {
    if (!listMode) return;
    blocks.push(createListBlock(listMode, listItems.length ? listItems : [""]));
    listMode = null;
    listItems = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBuffer();
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const quote = trimmed.match(/^>\s+(.+)$/);
    if (heading) {
      flushBuffer();
      flushList();
      blocks.push(createTextBlock(heading[1].length === 1 ? "heading" : "subheading", heading[2]));
      continue;
    }
    if (bullet || ordered) {
      flushBuffer();
      const mode: "bulletList" | "numberedList" = bullet ? "bulletList" : "numberedList";
      const item = normalizeText((bullet ?? ordered)?.[1] ?? "");
      if (listMode && listMode !== mode) flushList();
      listMode = mode;
      listItems.push(item);
      continue;
    }
    if (quote) {
      flushBuffer();
      flushList();
      blocks.push(createTextBlock("quote", quote[1]));
      continue;
    }
    if (/^[-_]{3,}$/.test(trimmed)) {
      flushBuffer();
      flushList();
      blocks.push(createDividerBlock());
      continue;
    }
    if (listMode) flushList();
    buffer.push(line);
  }

  flushBuffer();
  flushList();
  return blocks;
}

function extractLegacySegments(value: Record<string, unknown>): string[] {
  const result: string[] = [];
  const keys = [
    "title",
    "subtitle",
    "heading",
    "text",
    "body",
    "content",
    "summary",
    "description",
    "caption",
    "attribution",
    "source",
  ];
  for (const key of keys) {
    const entry = value[key];
    if (typeof entry === "string" && normalizeText(entry)) result.push(normalizeText(entry));
  }
  const items = normalizeStringList(value.items);
  if (items.length) result.push(...items);
  if (Array.isArray(value.blocks)) {
    for (const block of value.blocks) {
      const normalized = normalizeBlock(block);
      if (!normalized) continue;
      if (normalized.type === "divider") result.push("---");
      else if (isImageBlock(normalized)) result.push(normalized.alt || normalized.caption || normalized.url);
      else if (normalized.type === "imageGallery") result.push(...normalized.images.map((image) => image.caption || image.alt || image.url));
      else if (isListBlock(normalized)) result.push(...normalized.items);
      else if (isSequenceBlock(normalized)) result.push(...normalized.items.map((item) => item.title));
      else if ("text" in normalized) result.push(normalized.text);
    }
  }
  return result.map((segment) => normalizeText(segment)).filter(Boolean);
}

function segmentsToBlocks(segments: string[]) {
  return segments.map((segment) => createTextBlock("paragraph", segment));
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? normalizeText(item) : ""))
    .filter(Boolean);
}

function readFirstText(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const entry = value[key];
    if (typeof entry === "string") {
      const text = normalizeText(entry);
      if (text) return text;
    }
  }
  return "";
}

function normalizeSharedProps(value: Record<string, unknown>) {
  return {
    title: normalizeOptionalText(readFirstText(value, ["title"])),
    icon: normalizeOptionalText(readFirstText(value, ["icon"])),
    align: normalizeAlignment(value.align),
    backgroundStyle: normalizeBackgroundStyle(value.backgroundStyle),
    borderStyle: normalizeBorderStyle(value.borderStyle),
    hidden: value.hidden ? true : undefined,
    collapsed: value.collapsed ? true : undefined,
  };
}

function sharedPresentationProps(block: ContentBlock) {
  return {
    title: block.title,
    icon: block.icon,
    align: block.align,
    backgroundStyle: block.backgroundStyle,
    borderStyle: block.borderStyle,
    hidden: block.hidden,
    collapsed: block.collapsed,
  };
}

function normalizeText(value: string | undefined) {
  return (value ?? "").replace(/\u0000/g, "").trim();
}

function normalizeOptionalText(value: string | undefined) {
  const text = normalizeText(value);
  return text || undefined;
}

function normalizeKnowledgeReferences(value: unknown, text: string): KnowledgeReference[] {
  if (!Array.isArray(value)) return [];
  const length = text.length;
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const type =
        typeof entry.type === "string" && KNOWLEDGE_REFERENCE_TYPES.includes(entry.type as never)
          ? (entry.type as KnowledgeReference["type"])
          : null;
      const targetId = normalizeText(typeof entry.targetId === "string" ? entry.targetId : "");
      const label = normalizeText(typeof entry.label === "string" ? entry.label : "");
      const start = clampNumber(entry.start, 0, length);
      const end = clampNumber(entry.end, 0, length);
      if (!type || !targetId || !label || end <= start) return null;
      return {
        id: normalizeText(typeof entry.id === "string" ? entry.id : "") || createStableId(),
        type,
        targetId,
        label,
        start,
        end,
      };
    })
    .filter((entry): entry is KnowledgeReference => Boolean(entry));
}

function clampNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function normalizeId(value: string) {
  const trimmed = value.trim();
  if (trimmed) return trimmed.slice(0, 64);
  return createStableId();
}

function normalizeGalleryImage(value: unknown) {
  const record = isRecord(value) ? value : {};
  return {
    id: normalizeId(typeof record.id === "string" ? record.id : ""),
    resourceId: normalizeOptionalText(readFirstText(record, ["resourceId"])),
    url: sanitizeUrl(readFirstText(record, ["url", "src", "href", "fileUrl"])),
    alt: normalizeText(readFirstText(record, ["alt", "title", "caption"])),
    caption: normalizeOptionalText(readFirstText(record, ["caption", "description"])),
    width: normalizeImageWidth(record.width),
  };
}

function createGalleryImage() {
  return {
    id: createStableId(),
    url: "",
    alt: "",
  };
}

function normalizeTableRow(value: unknown) {
  const record = isRecord(value) ? value : {};
  const cells = Array.isArray(record.cells)
    ? record.cells.map((cell) => normalizeTableCell(cell)).filter(Boolean)
    : [];
  return {
    id: normalizeId(typeof record.id === "string" ? record.id : ""),
    cells: cells.length ? cells : [createTableCell(), createTableCell()],
  };
}

function normalizeTableCell(value: unknown) {
  const record = isRecord(value) ? value : {};
  return {
    id: normalizeId(typeof record.id === "string" ? record.id : ""),
    text: normalizeText(readFirstText(record, ["text", "content", "value"])),
    colSpan: normalizeSpan(record.colSpan),
    rowSpan: normalizeSpan(record.rowSpan),
  };
}

function createTableCell(text = "") {
  return { id: createStableId(), text };
}

function createTableRow(columns = 2) {
  return {
    id: createStableId(),
    cells: Array.from({ length: Math.max(1, columns) }, () => createTableCell("")),
  };
}

function rowsFromItems(items: string[]) {
  return items.length
    ? items.map((item) => ({
        id: createStableId(),
        cells: [createTableCell(item), createTableCell("")],
      }))
    : [createTableRow(2), createTableRow(2)];
}

function normalizeSequenceItem(value: unknown) {
  const record = isRecord(value) ? value : {};
  return {
    id: normalizeId(typeof record.id === "string" ? record.id : ""),
    title: normalizeText(readFirstText(record, ["title", "text", "label", "name"])),
    description: normalizeOptionalText(readFirstText(record, ["description", "content", "body"])),
    icon: normalizeOptionalText(readFirstText(record, ["icon"])),
  };
}

function createSequenceItem() {
  return { id: createStableId(), title: "", description: "" };
}

function normalizeSpan(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 1 ? Math.floor(number) : undefined;
}

function normalizeAlignment(value: unknown) {
  return typeof value === "string" && BLOCK_ALIGNMENTS.includes(value as BlockAlignment)
    ? (value as BlockAlignment)
    : undefined;
}

function normalizeBackgroundStyle(value: unknown) {
  return typeof value === "string" &&
    BLOCK_BACKGROUND_STYLES.includes(value as BlockBackgroundStyle)
    ? (value as BlockBackgroundStyle)
    : undefined;
}

function normalizeBorderStyle(value: unknown) {
  return typeof value === "string" && BLOCK_BORDER_STYLES.includes(value as BlockBorderStyle)
    ? (value as BlockBorderStyle)
    : undefined;
}

function normalizeInfoBoxVariant(value: unknown) {
  return typeof value === "string" && INFO_BOX_VARIANTS.includes(value as InfoBoxVariant)
    ? (value as InfoBoxVariant)
    : undefined;
}

function normalizeFormulaDisplayMode(value: unknown) {
  return typeof value === "string" &&
    FORMULA_DISPLAY_MODES.includes(value as FormulaDisplayMode)
    ? (value as FormulaDisplayMode)
    : undefined;
}

function normalizeImageWidth(value: unknown) {
  return typeof value === "string" && IMAGE_WIDTHS.includes(value as ImageWidth)
    ? (value as ImageWidth)
    : undefined;
}

function normalizeImageFloat(value: unknown) {
  return typeof value === "string" && IMAGE_FLOATS.includes(value as ImageFloat)
    ? (value as ImageFloat)
    : undefined;
}

function normalizeAssetKind(value: unknown): LinkedAssetKind | null {
  return typeof value === "string" && LINKED_ASSET_KINDS.includes(value as LinkedAssetKind)
    ? (value as LinkedAssetKind)
    : null;
}

function normalizeTargetType(value: unknown): LinkedAssetTargetType | null {
  return typeof value === "string" &&
    LINKED_ASSET_TARGET_TYPES.includes(value as LinkedAssetTargetType)
    ? (value as LinkedAssetTargetType)
    : null;
}

function normalizeAudienceList(value: unknown): LinkedAssetAudience[] {
  if (!Array.isArray(value)) return ["TEACHER", "STUDENT"];
  const normalized = value.filter(
    (entry): entry is LinkedAssetAudience =>
      typeof entry === "string" && LINKED_ASSET_AUDIENCES.includes(entry as LinkedAssetAudience),
  );
  return normalized.length ? Array.from(new Set(normalized)) : ["TEACHER", "STUDENT"];
}

function normalizeDisplayStyle(value: unknown): LinkedAssetDisplayStyle | null {
  return typeof value === "string" &&
    LINKED_ASSET_DISPLAY_STYLES.includes(value as LinkedAssetDisplayStyle)
    ? (value as LinkedAssetDisplayStyle)
    : null;
}

function normalizeOpenMode(value: unknown): LinkedAssetOpenMode | null {
  return typeof value === "string" &&
    LINKED_ASSET_OPEN_MODES.includes(value as LinkedAssetOpenMode)
    ? (value as LinkedAssetOpenMode)
    : null;
}

function normalizeMediaKind(value: unknown): MediaKind | null {
  return typeof value === "string" && MEDIA_KINDS.includes(value as MediaKind)
    ? (value as MediaKind)
    : null;
}

function normalizeMediaTargetType(value: unknown): MediaTargetType | null {
  return typeof value === "string" && MEDIA_TARGET_TYPES.includes(value as MediaTargetType)
    ? (value as MediaTargetType)
    : null;
}

function normalizeMediaDisplayMode(value: unknown): MediaDisplayMode | null {
  return typeof value === "string" && MEDIA_DISPLAY_MODES.includes(value as MediaDisplayMode)
    ? (value as MediaDisplayMode)
    : null;
}

function infoBoxDefaultTitle(variant: InfoBoxVariant) {
  switch (variant) {
    case "example":
      return "Example";
    case "remember":
      return "Remember";
    case "important":
      return "Important";
    case "tip":
      return "Tip";
    case "warning":
      return "Warning";
    case "didYouKnow":
      return "Did You Know";
    case "summary":
      return "Summary";
  }
}

function placeholderBlockTitle(type: PlaceholderBlockType) {
  return type === "mindMap" ? "Mind Map" : "Flow Chart";
}

function extractBlockText(block: ContentBlock) {
  if (isTextBlock(block)) return block.text;
  if (isInfoBoxBlock(block)) return block.text;
  if (isObservationBoxBlock(block)) return block.text;
  if (isFormulaBlock(block)) return block.expression;
  if (isImageBlock(block)) return block.caption ?? block.alt;
  if (isSequenceBlock(block)) {
    return block.items.map((item) => item.title).filter(Boolean).join("\n");
  }
  if (isTableBlock(block)) {
    return block.rows.map((row) => row.cells.map((cell) => cell.text).join(" | ")).join("\n");
  }
  return block.title ?? "";
}

function extractBlockItems(block: ContentBlock) {
  if (isListBlock(block)) return block.items;
  if (isSequenceBlock(block)) return block.items.map((item) => item.title || item.description || "");
  if (isTableBlock(block)) return block.rows.map((row) => row.cells[0]?.text ?? "");
  if (isTextBlock(block)) return block.text ? block.text.split(/\n+/).map((item) => normalizeText(item)).filter(Boolean) : [""];
  return [extractBlockText(block)].filter(Boolean);
}

function isImageLikeBlock(block: ContentBlock): block is ImageBlock {
  return isImageBlock(block);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSupportedType(value: unknown): value is ContentBlockType {
  return typeof value === "string" && supportedTypes.has(value as ContentBlockType);
}

function createStableId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
