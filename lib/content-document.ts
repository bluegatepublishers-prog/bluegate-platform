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
import {
  getEducationalObjectDefinition,
  isEducationalObjectType,
  type EducationalObjectType,
} from "@/lib/educational-object-registry";
import {
  activityFieldDefinition,
  defaultActivityFieldVisibility,
  type ActivityField,
  type ActivityFieldType,
} from "@/lib/activity-object";
import {
  createWorksheetBlock as createWorksheetObjectBlock,
  normalizeWorksheetBlock,
  type WorksheetBlockData,
} from "@/lib/worksheet-object";
import {
  createExerciseBlock as createExerciseObjectBlock,
  normalizeExerciseBlock,
  addExerciseGroup as addExerciseObjectGroup,
  updateExerciseGroup as updateExerciseObjectGroup,
  removeExerciseGroup as removeExerciseObjectGroup,
  moveExerciseGroup as moveExerciseObjectGroup,
  addExerciseQuestion as addExerciseObjectQuestion,
  removeExerciseQuestion as removeExerciseObjectQuestion,
  moveExerciseQuestion as moveExerciseObjectQuestion,
  duplicateExerciseQuestion as duplicateExerciseObjectQuestion,
  type ExerciseBlockData,
} from "@/lib/exercise-object";
import type { LayoutV2PageLayout, LayoutVersion } from "@/lib/content-layout-v2";
import { normalizePageLayoutV2 } from "@/lib/content-layout-v2";

export const CONTENT_DOCUMENT_VERSION = 4 as const;
export const DEFAULT_PERIOD_ID = "period_default";

export const BLOCK_ALIGNMENTS = ["left", "center", "right"] as const;
export const BLOCK_BACKGROUND_STYLES = ["none", "subtle", "accent", "emphasis"] as const;
export const BLOCK_BORDER_STYLES = ["none", "subtle", "strong"] as const;
export const TABLE_BORDER_STYLES = ["all", "outer", "inner", "none"] as const;
export const TABLE_CELL_BACKGROUNDS = ["none", "muted", "accent", "highlight"] as const;
export const TABLE_VERTICAL_ALIGNMENTS = ["top", "middle", "bottom"] as const;
export const INFO_BOX_VARIANTS = [
  "example",
  "remember",
  "important",
  "tip",
  "warning",
  "didYouKnow",
  "summary",
  "thinkAndDiscuss",
  "reflection",
  "competencyCheck",
  "lifeSkill",
  "caseStudy",
  "teacherTip",
  "activityPrompt",
  "experimentPrompt",
  "observationPrompt",
] as const;
export const FORMULA_DISPLAY_MODES = ["inline", "block"] as const;
export const IMAGE_WIDTHS = ["full", "wide", "medium"] as const;
export const IMAGE_FLOATS = ["none", "left", "right"] as const;
export const MEDIA_KINDS = ["video", "audio", "animation", "html5", "simulation"] as const;
export const MEDIA_TARGET_TYPES = ["RESOURCE", "VIDEO_LESSON"] as const;
export const MEDIA_DISPLAY_MODES = ["inline", "button", "fullWidth"] as const;
export const PLACEHOLDER_BLOCK_TYPES = ["mindMap", "flowChart"] as const;
export const CANVAS_PRESETS = ["A3", "A4", "A5", "CUSTOM", "WEB", "STUDENT", "TEACHER"] as const;

export type BlockAlignment = (typeof BLOCK_ALIGNMENTS)[number];
export type BlockBackgroundStyle = (typeof BLOCK_BACKGROUND_STYLES)[number];
export type BlockBorderStyle = (typeof BLOCK_BORDER_STYLES)[number];
export type TableBorderStyle = (typeof TABLE_BORDER_STYLES)[number];
export type TableCellBackground = (typeof TABLE_CELL_BACKGROUNDS)[number];
export type TableVerticalAlignment = (typeof TABLE_VERTICAL_ALIGNMENTS)[number];
export type InfoBoxVariant = (typeof INFO_BOX_VARIANTS)[number];
export type FormulaDisplayMode = (typeof FORMULA_DISPLAY_MODES)[number];
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];
export type ImageFloat = (typeof IMAGE_FLOATS)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];
export type MediaTargetType = (typeof MEDIA_TARGET_TYPES)[number];
export type MediaDisplayMode = (typeof MEDIA_DISPLAY_MODES)[number];
export type PlaceholderBlockType = (typeof PLACEHOLDER_BLOCK_TYPES)[number];
export type CanvasPreset = (typeof CANVAS_PRESETS)[number];
export const TEXT_MARKS = ["bold", "italic", "underline", "superscript", "subscript"] as const;

export type TextMark = (typeof TEXT_MARKS)[number];

export type RichTextSpan = {
  text: string;
  marks?: TextMark[];
  color?: string;
  highlight?: string;
  fontSize?: number;
};
export type ContentPeriod = {
  id: string;
  title: string;
  sortOrder: number;
};

export type ContentBlockType =
  | "heading"
  | "heading3"
  | "subheading"
  | "paragraph"
  | "caption"
  | "bulletList"
  | "numberedList"
  | "quote"
  | "callout"
  | "activity"
  | "worksheet"
  | "exercise"
  | "educationalObject"
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

export type LayoutMetadata = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
  digital?: {
    order?: number;
    width?: "full" | "wide" | "content";
    alignment?: "left" | "center" | "right";
    visibility?: "all" | "web" | "student" | "teacher";
  };
};

export type CanvasConfig = {
  preset: CanvasPreset;
  width: number;
  height: number;
  unit: "px" | "mm" | "cm" | "inch";
  orientation: "portrait" | "landscape";
  margins: { top: number; right: number; bottom: number; left: number };
};

type BaseBlock = {
  id: string;
  type: ContentBlockType;
  title?: string;
  icon?: string;
  align?: BlockAlignment;
  backgroundStyle?: BlockBackgroundStyle;
  borderStyle?: BlockBorderStyle;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  highlightColor?: string;
  indent?: number;
  lineSpacing?: number;
  hidden?: boolean;
  collapsed?: boolean;
  periodId?: string;
  layout?: LayoutMetadata;
};

type ImageLike = {
  resourceId?: string;
  url: string;
  alt: string;
  caption?: string;
  crop?: { x: number; y: number; width: number; height: number };
};

export type TableCell = {
  id: string;
  text: string;
  spans?: RichTextSpan[];
  colSpan?: number;
  rowSpan?: number;
  horizontalAlign?: BlockAlignment;
  verticalAlign?: TableVerticalAlignment;
  background?: TableCellBackground;
  header?: boolean;
};

export type TableRow = {
  id: string;
  cells: TableCell[];
  height?: number;
};

type SequenceItem = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
};

export type TextBlock = BaseBlock & {
  type: "heading" | "heading3" | "subheading" | "paragraph" | "caption" | "quote" | "callout";

  /**
   * Plain-text representation retained for backward compatibility,
   * searching, knowledge-reference offsets, AI collection and exports.
   */
  text: string;

  /**
   * Canonical character-level formatting representation.
   * When omitted on legacy content, normalization creates one plain span.
   */
  spans: RichTextSpan[];

  attribution?: string;
  knowledgeReferences?: KnowledgeReference[];
};

export type EducationalObjectBlock = BaseBlock & {
  type: "educationalObject";
  objectType: EducationalObjectType;
  text: string;
};

export type ActivityBlock = BaseBlock & {
  type: "activity";
  fields: ActivityField[];
};

export type WorksheetBlock = BaseBlock & WorksheetBlockData;
export type ExerciseBlock = BaseBlock & ExerciseBlockData;

export type ListBlock = BaseBlock & {
  type: "bulletList" | "numberedList";
  items: string[];
  itemSpans?: RichTextSpan[][];
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
  headerRows?: number[];
  rows: TableRow[];
  columnWidths?: number[];
  tableBorderStyle?: TableBorderStyle;
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
  | ActivityBlock
  | WorksheetBlock
  | ExerciseBlock
  | EducationalObjectBlock
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
  layoutVersion?: LayoutVersion;
  blocks: ContentBlock[];
  periods: ContentPeriod[];
  layout: "single" | "double";
  canvas: CanvasConfig;
  pageLayout?: LayoutV2PageLayout;
};

const supportedTypes = new Set<ContentBlockType>([
  "heading",
  "heading3",
  "subheading",
  "paragraph",
  "caption",
  "bulletList",
  "numberedList",
  "quote",
  "callout",
  "activity",
  "worksheet",
  "exercise",
  "educationalObject",
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

const fallbackParagraph = (): ContentDocument => createContentDocument();

export function createContentDocument(
  blocks: ContentBlock[] = [],
  periods: ContentPeriod[] = [],
  layout: ContentDocument["layout"] = "single",
  canvas?: Partial<CanvasConfig>,
): ContentDocument {
  const normalizedPeriods = normalizePeriods(periods);
  const firstPeriodId = normalizedPeriods[0]?.id ?? DEFAULT_PERIOD_ID;
  const normalizedBlocks = blocks.map((block) => ({
    ...block,
    periodId: normalizedPeriods.some((period) => period.id === block.periodId) ? block.periodId : firstPeriodId,
  }));
  return {
    version: CONTENT_DOCUMENT_VERSION,
    blocks: normalizedBlocks.length ? normalizedBlocks : [{ ...createTextBlock("paragraph", ""), periodId: firstPeriodId }],
    periods: normalizedPeriods,
    layout,
    canvas: normalizeCanvasConfig(canvas),
  };
}

function rebuildContentDocument(document: ContentDocument, blocks: ContentBlock[], periods = document.periods, layout = document.layout, canvas = document.canvas) {
  const next = createContentDocument(blocks, periods, layout, canvas);
  if (document.layoutVersion === 2 && document.pageLayout) return { ...next, layoutVersion: 2 as const, pageLayout: document.pageLayout };
  if (document.layoutVersion === 1) return { ...next, layoutVersion: 1 as const };
  return next;
}

export function normalizeCanvasConfig(value: unknown): CanvasConfig {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const preset = CANVAS_PRESETS.includes(record.preset as CanvasPreset) ? record.preset as CanvasPreset : "WEB";
  const unit = ["px", "mm", "cm", "inch"].includes(record.unit as string) ? record.unit as CanvasConfig["unit"] : "px";
  const orientation = record.orientation === "landscape" ? "landscape" : "portrait";
  const number = (candidate: unknown, fallback: number) => typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0 ? candidate : fallback;
  const margins = record.margins && typeof record.margins === "object" ? record.margins as Record<string, unknown> : {};
  return {
    preset,
    width: number(record.width, preset === "A3" ? 1123 : preset === "A5" ? 559 : 794),
    height: number(record.height, preset === "A3" ? 1587 : preset === "A5" ? 794 : 1123),
    unit,
    orientation,
    margins: {
      top: number(margins.top, 48), right: number(margins.right, 48),
      bottom: number(margins.bottom, 48), left: number(margins.left, 48),
    },
  };
}

export function addContentPeriod(document: ContentDocument, title?: string) {
  const sortOrder = document.periods.length;
  const period: ContentPeriod = { id: createStableId(), title: normalizeText(title) || `Period ${sortOrder + 1}`, sortOrder };
  return rebuildContentDocument(document, document.blocks, [...document.periods, period], document.layout, document.canvas);
}

export function moveBlockToPeriod(document: ContentDocument, blockId: string, periodId: string) {
  if (!document.periods.some((period) => period.id === periodId)) return document;
  return rebuildContentDocument(document, document.blocks.map((block) => block.id === blockId ? { ...block, periodId } : block), document.periods, document.layout, document.canvas);
}

export function renameContentPeriod(document: ContentDocument, periodId: string, title: string) {
  return rebuildContentDocument(document, document.blocks, document.periods.map((period) => period.id === periodId ? { ...period, title: normalizeText(title) || period.title } : period), document.layout, document.canvas);
}

export function removeEmptyContentPeriod(document: ContentDocument, periodId: string) {
  if (document.periods.length <= 1 || document.blocks.some((block) => block.periodId === periodId)) return document;
  return rebuildContentDocument(document, document.blocks, document.periods.filter((period) => period.id !== periodId).map((period, index) => ({ ...period, sortOrder: index })), document.layout, document.canvas);
}

export function createTextBlock(
  type: "heading" | "heading3" | "subheading" | "paragraph" | "caption" | "quote" | "callout",
  text = "",
): TextBlock {
  const normalizedText = normalizeTextContent(text);

  return {
    id: createStableId(),
    type,
    text: normalizedText,
    spans: [{ text: normalizedText }],
  };
}

export function createEducationalObjectBlock(objectType: EducationalObjectType): EducationalObjectBlock {
  const definition = getEducationalObjectDefinition(objectType);
  return {
    id: createStableId(), type: "educationalObject", objectType,
    title: definition.defaultTitle, text: "",
    layout: {
      x: 0, y: 0, width: definition.defaultWidth, height: definition.defaultHeight, zIndex: 1,
      digital: { order: 0, width: "content", alignment: "left", visibility: "all" },
    },
  };
}

export function createActivityBlock(): ActivityBlock {
  return {
    id: createStableId(),
    type: "activity",
    fields: [{ id: createStableId(), type: "instructions" }],
    layout: {
      x: 0,
      y: 0,
      width: 640,
      height: 280,
      zIndex: 1,
      digital: { order: 0, width: "content", alignment: "left", visibility: "all" },
    },
  };
}

export function createWorksheetBlock(): WorksheetBlock {
  return {
    ...createWorksheetObjectBlock(),
    layout: {
      x: 0,
      y: 0,
      width: 700,
      height: 420,
      zIndex: 1,
      digital: { order: 0, width: "content", alignment: "left", visibility: "all" },
    },
  };
}

export function createExerciseBlock(): ExerciseBlock {
  return {
    ...createExerciseObjectBlock(),
    layout: {
      x: 0,
      y: 0,
      width: 700,
      height: 420,
      zIndex: 1,
      digital: { order: 0, width: "content", alignment: "left", visibility: "all" },
    },
  };
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
    crop: normalizeCrop(partial?.crop),
  };
}

function normalizeCrop(value: unknown) {
  if (!value || typeof value !== "object") return { x: 0, y: 0, width: 1, height: 1 };
  const record = value as Record<string, unknown>;
  const number = (candidate: unknown, fallback: number) => typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
  const x = Math.min(1, Math.max(0, number(record.x, 0)));
  const y = Math.min(1, Math.max(0, number(record.y, 0)));
  const width = Math.min(1 - x, Math.max(0.01, number(record.width, 1)));
  const height = Math.min(1 - y, Math.max(0.01, number(record.height, 1)));
  return { x, y, width, height };
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
  dimensions?: { rows?: number; columns?: number },
): TableBlock {
  const requestedRows = dimensions?.rows ?? partial?.rows?.length ?? 2;
  const requestedColumns = dimensions?.columns ?? partial?.rows?.[0]?.cells.length ?? 2;
  const rowCount = clampTableDimension(requestedRows, 1, 50);
  const columnCount = clampTableDimension(requestedColumns, 1, 20);
  const rows = partial?.rows?.length
    ? partial.rows.map((row) => normalizeTableRow(row, columnCount))
    : Array.from({ length: rowCount }, () => createTableRow(columnCount));
  return {
    id: createStableId(),
    type,
    headerRow: partial?.headerRow ?? true,
    headerRows: partial?.headerRows ?? (partial?.headerRow === false ? [] : [0]),
    rows,
    columnWidths: normalizeTableColumnWidths(partial?.columnWidths, columnCount),
    tableBorderStyle: partial?.tableBorderStyle ?? "all",
    layout: partial?.layout ?? defaultTableLayout(),
  };
}

function defaultTableLayout(): LayoutMetadata {
  return {
    x: 0,
    y: 0,
    width: 640,
    height: 240,
    zIndex: 1,
    digital: { order: 0, width: "content", alignment: "left", visibility: "all" },
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
    case "heading3":
    case "subheading":
    case "paragraph":
    case "caption":
    case "quote":
    case "callout":
      return createTextBlock(type, "");
    case "educationalObject":
      return createEducationalObjectBlock("didYouKnow");
    case "activity":
      return createActivityBlock();
    case "worksheet":
      return createWorksheetBlock();
    case "exercise":
      return createExerciseBlock();
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
  type === "heading3" ||
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
    spans: isTextBlock(block)
      ? block.spans.map((span) => ({
          ...span,
          marks: span.marks ? [...span.marks] : undefined,
        }))
      : [{ text: textValue }],
    attribution:
      block.type === "quote" || block.type === "callout"
        ? block.attribution
        : undefined,
    knowledgeReferences: isTextBlock(block)
      ? block.knowledgeReferences
      : undefined,
  };
}
  
  if (type === "bulletList" || type === "numberedList") {
    return {
      ...createListBlock(type, extractBlockItems(block)),
      ...shared,
      id,
      itemSpans: isListBlock(block)
        ? block.itemSpans?.map((spans) => spans.map((span) => ({ ...span, marks: span.marks ? [...span.marks] : undefined })))
        : undefined,
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
    return {
      ...createTableBlock(type, block.type === "table" || block.type === "comparisonTable"
        ? {
            rows,
            headerRow: block.headerRow,
            headerRows: block.headerRows,
            columnWidths: block.columnWidths,
            tableBorderStyle: block.tableBorderStyle,
          }
        : { rows }),
      ...shared,
      id,
    };
  }
  if (type === "activity") {
    return { ...createActivityBlock(), ...shared, id, fields: [{ id: createStableId(), type: "instructions", text: textValue || undefined }] };
  }
  if (type === "worksheet") {
    return { ...createWorksheetBlock(), ...shared, ...normalizeWorksheetBlock({ ...block, id }), id };
  }
  if (type === "exercise") {
    return { ...createExerciseBlock(), ...shared, ...normalizeExerciseBlock({ ...block, id }), id };
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
  if (type === "educationalObject") {
    return {
      ...createEducationalObjectBlock("didYouKnow"),
      ...shared,
      id,
      text: textValue,
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
    const document = createContentDocument(blocks, normalizePeriods(value.periods), value.layout === "double" ? "double" : "single", normalizeCanvasConfig(value.canvas));
    if (value.layoutVersion === 2) {
      const pageLayout = normalizePageLayoutV2(value.pageLayout);
      return pageLayout ? { ...document, layoutVersion: 2 as const, pageLayout } : document;
    }
    return value.layoutVersion === 1 ? { ...document, layoutVersion: 1 as const } : document;
  }

  if (isSupportedType(value.type)) {
    const block = normalizeBlock(value);
    return createContentDocument(block ? [block] : []);
  }

  const content = readFirstText(value, ["content", "text", "body", "summary", "description"]);
  if (content) return legacyTextToDocument(content);

  const segments = extractLegacySegments(value);
  if (segments.length) {
    return createContentDocument(segmentsToBlocks(segments));
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
    return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
  }
  const index = blocks.findIndex((entry) => entry.id === afterId);
  if (index < 0) {
    blocks.push(block);
    return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
  }
  blocks.splice(index + 1, 0, block);
  return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
}

export function insertBlockBefore(
  document: ContentDocument,
  beforeId: string | null,
  block: ContentBlock,
) {
  const blocks = [...document.blocks];
  if (!beforeId) {
    blocks.push(block);
    return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
  }
  const index = blocks.findIndex((entry) => entry.id === beforeId);
  if (index < 0) {
    blocks.push(block);
    return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
  }
  blocks.splice(index, 0, block);
  return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
}

export function updateBlock(
  document: ContentDocument,
  blockId: string,
  updater: (block: ContentBlock) => ContentBlock,
) {
  const blocks = document.blocks.map((block) => (block.id === blockId ? updater(block) : block));
  return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
}

export function updateTableBlock(
  document: ContentDocument,
  blockId: string,
  updater: (table: TableBlock) => TableBlock,
) {
  return updateBlock(document, blockId, (block) => isTableBlock(block) ? updater(block) : block);
}

export function updateActivityBlock(
  document: ContentDocument,
  blockId: string,
  updater: (activity: ActivityBlock) => ActivityBlock,
) {
  return updateBlock(document, blockId, (block) => isActivityBlock(block) ? updater(block) : block);
}

export function updateWorksheetBlock(
  document: ContentDocument,
  blockId: string,
  updater: (worksheet: WorksheetBlock) => WorksheetBlock,
) {
  return updateBlock(document, blockId, (block) => isWorksheetBlock(block) ? updater(block) : block);
}

export function updateExerciseBlock(
  document: ContentDocument,
  blockId: string,
  updater: (exercise: ExerciseBlock) => ExerciseBlock,
) {
  return updateBlock(document, blockId, (block) => isExerciseBlock(block) ? updater(block) : block);
}

export function addExerciseQuestion(document: ContentDocument, blockId: string, question: ExerciseBlock["questions"][number], groupId?: string, index?: number) {
  return updateExerciseBlock(document, blockId, (exercise) => addExerciseObjectQuestion(exercise, question, groupId, index));
}

export function removeExerciseQuestion(document: ContentDocument, blockId: string, questionId: string) {
  return updateExerciseBlock(document, blockId, (exercise) => removeExerciseObjectQuestion(exercise, questionId));
}

export function moveExerciseQuestion(document: ContentDocument, blockId: string, questionId: string, direction: -1 | 1) {
  return updateExerciseBlock(document, blockId, (exercise) => moveExerciseObjectQuestion(exercise, questionId, direction));
}

export function duplicateExerciseQuestion(document: ContentDocument, blockId: string, questionId: string) {
  return updateExerciseBlock(document, blockId, (exercise) => duplicateExerciseObjectQuestion(exercise, questionId));
}

export function addExerciseGroup(document: ContentDocument, blockId: string) {
  return updateExerciseBlock(document, blockId, (exercise) => addExerciseObjectGroup(exercise));
}

export function updateExerciseGroup(document: ContentDocument, blockId: string, groupId: string, patch: Partial<ExerciseBlock["groups"][number]>) {
  return updateExerciseBlock(document, blockId, (exercise) => updateExerciseObjectGroup(exercise, groupId, patch));
}

export function removeExerciseGroup(document: ContentDocument, blockId: string, groupId: string) {
  return updateExerciseBlock(document, blockId, (exercise) => removeExerciseObjectGroup(exercise, groupId));
}

export function moveExerciseGroup(document: ContentDocument, blockId: string, groupId: string, direction: -1 | 1) {
  return updateExerciseBlock(document, blockId, (exercise) => moveExerciseObjectGroup(exercise, groupId, direction));
}

export function addActivityField(document: ContentDocument, blockId: string, field: ActivityField, index?: number) {
  return updateActivityBlock(document, blockId, (activity) => {
    const fields = [...activity.fields];
    fields.splice(Math.min(fields.length, Math.max(0, index ?? fields.length)), 0, field);
    return { ...activity, fields };
  });
}

export function removeActivityField(document: ContentDocument, blockId: string, fieldId: string) {
  return updateActivityBlock(document, blockId, (activity) => ({ ...activity, fields: activity.fields.filter((field) => field.id !== fieldId) }));
}

export function moveActivityField(document: ContentDocument, blockId: string, fieldId: string, direction: -1 | 1) {
  return updateActivityBlock(document, blockId, (activity) => {
    const fields = [...activity.fields];
    const index = fields.findIndex((field) => field.id === fieldId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= fields.length) return activity;
    [fields[index], fields[next]] = [fields[next], fields[index]];
    return { ...activity, fields };
  });
}

export function addWorksheetQuestion(document: ContentDocument, blockId: string, question: WorksheetBlock["questions"][number], index?: number) {
  return updateWorksheetBlock(document, blockId, (worksheet) => {
    const questions = [...worksheet.questions];
    questions.splice(Math.min(questions.length, Math.max(0, index ?? questions.length)), 0, question);
    return { ...worksheet, questions };
  });
}

export function removeWorksheetQuestion(document: ContentDocument, blockId: string, questionId: string) {
  return updateWorksheetBlock(document, blockId, (worksheet) => ({ ...worksheet, questions: worksheet.questions.filter((question) => question.id !== questionId) }));
}

export function moveWorksheetQuestion(document: ContentDocument, blockId: string, questionId: string, direction: -1 | 1) {
  return updateWorksheetBlock(document, blockId, (worksheet) => {
    const questions = [...worksheet.questions];
    const index = questions.findIndex((question) => question.id === questionId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= questions.length) return worksheet;
    [questions[index], questions[next]] = [questions[next], questions[index]];
    return { ...worksheet, questions };
  });
}

export function duplicateWorksheetQuestion(document: ContentDocument, blockId: string, questionId: string) {
  return updateWorksheetBlock(document, blockId, (worksheet) => {
    const index = worksheet.questions.findIndex((question) => question.id === questionId);
    if (index < 0) return worksheet;
    const source = worksheet.questions[index];
    const copy = {
      ...source,
      id: createStableId(),
      visibility: source.visibility ? { ...source.visibility } : undefined,
      options: source.options?.map((option) => ({ ...option, id: createStableId() })),
      assertionOptions: source.assertionOptions?.map((option) => ({ ...option, id: createStableId() })),
      pairs: source.pairs?.map((pair) => ({ ...pair, id: createStableId() })),
      subQuestions: source.subQuestions?.map((entry) => ({ ...entry, id: createStableId() })),
    };
    const questions = [...worksheet.questions];
    questions.splice(index + 1, 0, copy);
    return { ...worksheet, questions };
  });
}

export function insertTableRow(
  document: ContentDocument,
  blockId: string,
  rowIndex: number,
  position: "above" | "below" = "below",
) {
  return updateTableBlock(document, blockId, (table) => {
    const index = Math.min(table.rows.length, Math.max(0, Math.floor(rowIndex) + (position === "below" ? 1 : 0)));
    const rows = [...table.rows];
    rows.splice(index, 0, createTableRow(tableColumnCount(table)));
    const headerRows = (table.headerRows ?? (table.headerRow === false ? [] : [0]))
      .map((headerIndex) => headerIndex >= index ? headerIndex + 1 : headerIndex);
    return { ...table, rows, headerRows };
  });
}

export function deleteTableRow(document: ContentDocument, blockId: string, rowIndex: number) {
  return updateTableBlock(document, blockId, (table) => {
    if (table.rows.length <= 1) return table;
    const index = Math.min(table.rows.length - 1, Math.max(0, Math.floor(rowIndex)));
    const rows = table.rows.filter((_, currentIndex) => currentIndex !== index);
    const headerRows = (table.headerRows ?? (table.headerRow === false ? [] : [0]))
      .filter((headerIndex) => headerIndex !== index)
      .map((headerIndex) => headerIndex > index ? headerIndex - 1 : headerIndex);
    return { ...table, rows, headerRows, headerRow: headerRows.includes(0) };
  });
}

export function insertTableColumn(document: ContentDocument, blockId: string, columnIndex: number) {
  return updateTableBlock(document, blockId, (table) => {
    const index = Math.min(tableColumnCount(table), Math.max(0, Math.floor(columnIndex)));
    const rows = table.rows.map((row) => ({ ...row, cells: insertCellAtColumn(row.cells, index) }));
    return { ...table, rows, columnWidths: insertTableWidth(table.columnWidths, tableColumnCount(table), index) };
  });
}

export function deleteTableColumn(document: ContentDocument, blockId: string, columnIndex: number) {
  return updateTableBlock(document, blockId, (table) => {
    const count = tableColumnCount(table);
    if (count <= 1) return table;
    const index = Math.min(count - 1, Math.max(0, Math.floor(columnIndex)));
    const rows = table.rows.map((row) => ({ ...row, cells: deleteCellAtColumn(row.cells, index) }));
    return { ...table, rows, columnWidths: deleteTableWidth(table.columnWidths, count, index) };
  });
}

export function mergeTableCells(document: ContentDocument, blockId: string, rowIndex: number, startCellIndex: number, endCellIndex: number) {
  return updateTableBlock(document, blockId, (table) => {
    const row = table.rows[rowIndex];
    if (!row) return table;
    const start = Math.max(0, Math.min(startCellIndex, endCellIndex));
    const end = Math.min(row.cells.length - 1, Math.max(startCellIndex, endCellIndex));
    if (end <= start) return table;
    const selected = row.cells.slice(start, end + 1);
    const first = selected[0];
    if (!first) return table;
    const spans = selected.flatMap((cell, index) => index === 0 ? (cell.spans ?? [{ text: cell.text }]) : [{ text: " " }, ...(cell.spans ?? [{ text: cell.text }])]);
    const merged: TableCell = {
      ...first,
      text: selected.map((cell) => cell.text).filter(Boolean).join(" "),
      spans,
      colSpan: selected.reduce((sum, cell) => sum + (cell.colSpan ?? 1), 0),
    };
    const cells = [...row.cells.slice(0, start), merged, ...row.cells.slice(end + 1)];
    return { ...table, rows: table.rows.map((entry, index) => index === rowIndex ? { ...entry, cells } : entry) };
  });
}

export function splitTableCell(document: ContentDocument, blockId: string, rowIndex: number, cellIndex: number) {
  return updateTableBlock(document, blockId, (table) => {
    const row = table.rows[rowIndex];
    const cell = row?.cells[cellIndex];
    const span = cell?.colSpan ?? 1;
    if (!row || !cell || span <= 1) return table;
    const cells = [
      { ...cell, colSpan: undefined },
      ...Array.from({ length: span - 1 }, () => createTableCell("")),
    ];
    return { ...table, rows: table.rows.map((entry, index) => index === rowIndex ? { ...entry, cells: [...entry.cells.slice(0, cellIndex), ...cells, ...entry.cells.slice(cellIndex + 1)] } : entry) };
  });
}

export function removeBlock(document: ContentDocument, blockId: string) {
  const blocks = document.blocks.filter((block) => block.id !== blockId);
  return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
}

export function moveBlock(document: ContentDocument, blockId: string, direction: -1 | 1) {
  const blocks = [...document.blocks];
  const index = blocks.findIndex((block) => block.id === blockId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= blocks.length) return document;
  [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
  return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
}

export function duplicateBlock(document: ContentDocument, blockId: string) {
  const index = document.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return document;
  const source = document.blocks[index];
  const copy = normalizeBlock({ ...source, id: createStableId() });
  if (!copy) return document;
  const duplicate = duplicateNestedBlockIds(copy);
  const blocks = [...document.blocks];
  blocks.splice(index + 1, 0, duplicate);
  return rebuildContentDocument(document, blocks, document.periods, document.layout, document.canvas);
}

function duplicateNestedBlockIds(block: ContentBlock): ContentBlock {
  if (isActivityBlock(block)) return { ...block, fields: block.fields.map((field) => ({ ...field, id: createStableId() })) };
  if (isWorksheetBlock(block)) return { ...block, questions: block.questions.map((question) => duplicateQuestionIds(question)) };
  if (isExerciseBlock(block)) return {
    ...block,
    questions: block.questions.map((question) => duplicateQuestionIds(question)),
    groups: block.groups.map((group) => ({ ...group, id: createStableId(), questions: group.questions.map((question) => duplicateQuestionIds(question)) })),
  };
  if (isTableBlock(block)) return { ...block, rows: block.rows.map((row) => ({ ...row, id: createStableId(), cells: row.cells.map((cell) => ({ ...cell, id: createStableId() })) })) };
  if (isImageGalleryBlock(block)) return { ...block, images: block.images.map((image) => ({ ...image, id: createStableId() })) };
  if (isSequenceBlock(block)) return { ...block, items: block.items.map((item) => ({ ...item, id: createStableId() })) };
  return block;
}

function duplicateQuestionIds(question: WorksheetBlock["questions"][number]) {
  return {
    ...question,
    id: createStableId(),
    visibility: question.visibility ? { ...question.visibility } : undefined,
    options: question.options?.map((option) => ({ ...option, id: createStableId() })),
    assertionOptions: question.assertionOptions?.map((option) => ({ ...option, id: createStableId() })),
    pairs: question.pairs?.map((pair) => ({ ...pair, id: createStableId() })),
    subQuestions: question.subQuestions?.map((entry) => ({ ...entry, id: createStableId() })),
  };
}

export function blockLabel(type: ContentBlockType) {
  switch (type) {
    case "heading":
      return "Heading";
    case "heading3":
      return "Heading 3";
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
    case "activity":
      return "Activity";
    case "worksheet":
      return "Worksheet";
    case "exercise":
      return "Exercise";
    case "educationalObject":
      return "Educational Object";
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
    case "educationalObject":
    case "activity":
    case "worksheet":
    case "exercise":
      return "paragraph";
    case "paragraph":
    default:
      return "paragraph";
  }
}

export function isTextBlock(block: ContentBlock): block is TextBlock {
  return ["heading", "heading3", "subheading", "paragraph", "caption", "quote", "callout"].includes(block.type);
}

export function isEducationalObjectBlock(block: ContentBlock): block is EducationalObjectBlock {
  return block.type === "educationalObject";
}

export function isActivityBlock(block: ContentBlock): block is ActivityBlock {
  return block.type === "activity";
}

export function isWorksheetBlock(block: ContentBlock): block is WorksheetBlock {
  return block.type === "worksheet";
}

export function isExerciseBlock(block: ContentBlock): block is ExerciseBlock {
  return block.type === "exercise";
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

  if (type === "educationalObject") {
    const objectType = isEducationalObjectType(value.objectType) ? value.objectType : "didYouKnow";
    return {
      ...createEducationalObjectBlock(objectType),
      ...shared,
      id,
      objectType,
      title: normalizeOptionalText(readFirstText(value, ["title"])) ?? getEducationalObjectDefinition(objectType).defaultTitle,
      text: normalizeText(readFirstText(value, ["text", "body", "content"])),
    };
  }

  if (type === "activity") {
    return {
      ...createActivityBlock(),
      ...shared,
      id,
      fields: normalizeActivityFields(value.fields, value),
    };
  }

  if (type === "worksheet") {
    return {
      ...createWorksheetBlock(),
      ...shared,
      ...normalizeWorksheetBlock(value, id),
      id,
    };
  }

  if (type === "exercise") {
    return { ...createExerciseBlock(), ...shared, ...normalizeExerciseBlock(value, id), id };
  }

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
      crop: normalizeCrop(value.crop),
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
    const rawRows = Array.isArray(value.rows) ? value.rows : [];
    const inferredColumns = rawRows.length ? rawRows.reduce((maximum, row) => {
      const record = isRecord(row) ? row : {};
      const cells = Array.isArray(record.cells) ? record.cells : [];
      const columns = cells.reduce((sum, cell) => {
        const cellRecord = isRecord(cell) ? cell : {};
        const span = Number(cellRecord.colSpan);
        return sum + (Number.isFinite(span) && span > 1 ? Math.floor(span) : 1);
      }, 0);
      return Math.max(maximum, columns);
    }, 1) : 2;
    const rows = rawRows.map((row) => normalizeTableRow(row, inferredColumns)).filter(Boolean);
    const headerRows = Array.isArray(value.headerRows)
      ? value.headerRows
          .map((row) => Number(row))
          .filter((row): row is number => Number.isInteger(row) && row >= 0 && row < Math.max(1, rows.length))
      : value.headerRow === false ? [] : [0];
    return {
      id,
      type,
      ...shared,
      headerRow: value.headerRow === false ? false : true,
      headerRows: Array.from(new Set(headerRows)),
      rows: rows.length ? rows : [createTableRow(2), createTableRow(2)],
      columnWidths: normalizeTableColumnWidths(value.columnWidths, Math.max(1, inferredColumns)),
      tableBorderStyle: normalizeTableBorderStyle(value.tableBorderStyle),
      layout: shared.layout ?? defaultTableLayout(),
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
    const rawItemSpans = value.itemSpans;
    const itemSpans = Array.isArray(rawItemSpans)
      ? items.map((item, index) => normalizeRichTextSpans(rawItemSpans[index], item))
      : undefined;
    return {
      id,
      type,
      ...shared,
      items: items.length ? items : [""],
      itemSpans,
    };
  }

  if (
  type === "quote" ||
  type === "callout" ||
  type === "heading" ||
  type === "heading3" ||
  type === "subheading" ||
  type === "paragraph" ||
  type === "caption"
) {
  const legacyText = normalizeTextContent(
    readFirstText(value, [
      "text",
      "content",
      "body",
      "value",
      "title",
      "caption",
    ]),
  );

  const spans = normalizeRichTextSpans(value.spans, legacyText);
  const text = richTextSpansToText(spans);

  return {
    id,
    type,
    ...shared,
    text,
    spans,
    attribution: normalizeOptionalText(
      readFirstText(value, ["attribution", "source"]),
    ),
    knowledgeReferences: normalizeKnowledgeReferences(
      value.knowledgeReferences,
      text,
    ),
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
  return createContentDocument(blocks.length ? blocks : [createTextBlock("paragraph", value)]);
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
    fontFamily: normalizeFontFamily(value.fontFamily),
    fontSize: normalizeFontSize(value.fontSize),
    bold: value.bold ? true : undefined,
    italic: value.italic ? true : undefined,
    underline: value.underline ? true : undefined,
    strikethrough: value.strikethrough ? true : undefined,
    textColor: normalizeCssColor(value.textColor),
    highlightColor: normalizeCssColor(value.highlightColor),
    indent: normalizeIndent(value.indent),
    lineSpacing: normalizeLineSpacing(value.lineSpacing),
    hidden: value.hidden ? true : undefined,
    collapsed: value.collapsed ? true : undefined,
    periodId: normalizeOptionalText(typeof value.periodId === "string" ? value.periodId : ""),
    layout: normalizeLayoutMetadata(value.layout),
  };
}

function normalizeLayoutMetadata(value: unknown): LayoutMetadata | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const number = (candidate: unknown, fallback: number) => typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
  const digital = record.digital && typeof record.digital === "object" ? record.digital as Record<string, unknown> : undefined;
  return {
    x: number(record.x, 0), y: number(record.y, 0),
    width: Math.max(80, number(record.width, 640)), height: Math.max(40, number(record.height, 180)),
    zIndex: Math.round(number(record.zIndex, 0)), locked: record.locked === true,
    digital: digital ? {
      order: Math.round(number(digital.order, 0)),
      width: ["full", "wide", "content"].includes(digital.width as string) ? digital.width as "full" | "wide" | "content" : "content",
      alignment: ["left", "center", "right"].includes(digital.alignment as string) ? digital.alignment as "left" | "center" | "right" : "left",
      visibility: ["all", "web", "student", "teacher"].includes(digital.visibility as string) ? digital.visibility as "all" | "web" | "student" | "teacher" : "all",
    } : undefined,
  };
}

function sharedPresentationProps(block: ContentBlock) {
  return {
    title: block.title,
    icon: block.icon,
    align: block.align,
    backgroundStyle: block.backgroundStyle,
    borderStyle: block.borderStyle,
    fontFamily: block.fontFamily,
    fontSize: block.fontSize,
    bold: block.bold,
    italic: block.italic,
    underline: block.underline,
    strikethrough: block.strikethrough,
    textColor: block.textColor,
    highlightColor: block.highlightColor,
    indent: block.indent,
    lineSpacing: block.lineSpacing,
    hidden: block.hidden,
    collapsed: block.collapsed,
    periodId: block.periodId,
    layout: block.layout,
  };
}

function normalizePeriods(value: unknown): ContentPeriod[] {
  const periods = Array.isArray(value)
    ? value.map((entry, index) => {
        const record = isRecord(entry) ? entry : {};
        const id = normalizeText(typeof record.id === "string" ? record.id : "") || (index === 0 ? DEFAULT_PERIOD_ID : createStableId());
        return {
          id,
          title: normalizeText(typeof record.title === "string" ? record.title : "") || `Period ${index + 1}`,
          sortOrder: index,
        };
      })
    : [];
  return periods.length ? periods : [{ id: DEFAULT_PERIOD_ID, title: "Period 1", sortOrder: 0 }];
}
export function richTextSpansToText(spans: RichTextSpan[]) {
  return spans.map((span) => span.text).join("");
}

export function normalizeRichTextSpans(
  value: unknown,
  fallbackText = "",
): RichTextSpan[] {
  if (!Array.isArray(value)) {
    return [{ text: normalizeTextContent(fallbackText) }];
  }

  const spans = value
    .map((entry): RichTextSpan | null => {
      if (!isRecord(entry)) return null;

      const text = normalizeTextContent(
        typeof entry.text === "string" ? entry.text : "",
      );

      /*
       * Preserve empty spans only temporarily during editing, but discard
       * completely empty spans when other useful spans exist.
       */
      const marks = normalizeTextMarks(entry.marks);
      const color = normalizeCssColor(entry.color);
      const highlight = normalizeCssColor(entry.highlight);
      const fontSize = normalizeFontSize(entry.fontSize);

      return {
        text,
        marks: marks.length ? marks : undefined,
        color,
        highlight,
        fontSize,
      };
    })
    .filter((span): span is RichTextSpan => Boolean(span));

  const usableSpans =
    spans.length > 1
      ? spans.filter(
          (span) =>
            span.text.length > 0 ||
            Boolean(span.marks?.length) ||
            Boolean(span.color) ||
            Boolean(span.highlight) ||
            Boolean(span.fontSize),
        )
      : spans;

  if (!usableSpans.length) {
    return [{ text: normalizeTextContent(fallbackText) }];
  }

  return mergeAdjacentRichTextSpans(usableSpans);
}

function normalizeTextMarks(value: unknown): TextMark[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (entry): entry is TextMark =>
          typeof entry === "string" &&
          TEXT_MARKS.includes(entry as TextMark),
      ),
    ),
  );
}

function normalizeCssColor(value: unknown) {
  if (typeof value !== "string") return undefined;

  const color = value.trim();

  /*
   * Keep the first version intentionally strict.
   * It accepts hexadecimal colours only and rejects CSS injection,
   * variables, URLs and arbitrary style expressions.
   */
  return /^#[0-9a-fA-F]{6}$/.test(color) ||
    /^#[0-9a-fA-F]{3}$/.test(color)
    ? color.toLowerCase()
    : undefined;
}

function normalizeFontFamily(value: unknown) {
  if (typeof value !== "string") return undefined;

  const family = value.trim();

  const allowed = [
    "Arial",
    "Calibri",
    "Georgia",
    "Times New Roman",
    "Verdana",
    "Noto Sans Devanagari",
  ];

  return allowed.includes(family)
    ? family
    : undefined;
}

function normalizeFontSize(value: unknown) {
  const size = Number(value);

  if (!Number.isFinite(size)) return undefined;

  const rounded = Math.round(size);

  /*
   * Prevent unusably small or dangerously large values.
   */
  return rounded >= 8 && rounded <= 96 ? rounded : undefined;
}

function normalizeIndent(value: unknown) {
  const indent = Number(value);
  if (!Number.isFinite(indent)) return undefined;
  return Math.min(8, Math.max(0, Math.round(indent)));
}

function normalizeLineSpacing(value: unknown) {
  const spacing = Number(value);
  if (!Number.isFinite(spacing)) return undefined;
  return Math.min(3, Math.max(1, Math.round(spacing * 10) / 10));
}

function normalizeTextContent(value: string | undefined) {
  return (value ?? "").replace(/\u0000/g, "");
}

function mergeAdjacentRichTextSpans(
  spans: RichTextSpan[],
): RichTextSpan[] {
  const result: RichTextSpan[] = [];

  for (const span of spans) {
    const previous = result[result.length - 1];

    if (previous && haveSameRichTextFormatting(previous, span)) {
      previous.text += span.text;
      continue;
    }

    result.push({
      ...span,
      marks: span.marks ? [...span.marks] : undefined,
    });
  }

  return result.length ? result : [{ text: "" }];
}

function haveSameRichTextFormatting(
  left: RichTextSpan,
  right: RichTextSpan,
) {
  return (
    JSON.stringify(left.marks ?? []) ===
      JSON.stringify(right.marks ?? []) &&
    left.color === right.color &&
    left.highlight === right.highlight &&
    left.fontSize === right.fontSize
  );
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
    crop: normalizeCrop(record.crop),
  };
}

function createGalleryImage() {
  return {
    id: createStableId(),
    url: "",
    alt: "",
  };
}

function normalizeTableRow(value: unknown, minimumColumns = 1) {
  const record = isRecord(value) ? value : {};
  const cells = Array.isArray(record.cells)
    ? record.cells.map((cell) => normalizeTableCell(cell)).filter(Boolean)
    : [];
  return {
    id: normalizeId(typeof record.id === "string" ? record.id : ""),
    cells: cells.length ? cells : Array.from({ length: Math.max(1, minimumColumns) }, () => createTableCell()),
    height: normalizeTableRowHeight(record.height),
  };
}

function normalizeTableCell(value: unknown) {
  const record = isRecord(value) ? value : {};
  const text = normalizeText(readFirstText(record, ["text", "content", "value"]));
  const spans = normalizeRichTextSpans(record.spans, text);
  return {
    id: normalizeId(typeof record.id === "string" ? record.id : ""),
    text: richTextSpansToText(spans) || text,
    spans,
    colSpan: normalizeSpan(record.colSpan),
    rowSpan: normalizeSpan(record.rowSpan),
    horizontalAlign: normalizeAlignment(record.horizontalAlign),
    verticalAlign: normalizeTableVerticalAlignment(record.verticalAlign),
    background: normalizeTableCellBackground(record.background),
    header: record.header === true ? true : undefined,
  };
}

function createTableCell(text = "") {
  return { id: createStableId(), text, spans: [{ text }] };
}

function createTableRow(columns = 2) {
  return {
    id: createStableId(),
    cells: Array.from({ length: Math.max(1, columns) }, () => createTableCell("")),
  };
}

function clampTableDimension(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.floor(number))) : minimum;
}

function normalizeTableColumnWidths(value: unknown, count: number) {
  const safeCount = clampTableDimension(count, 1, 20);
  const raw = Array.isArray(value)
    ? value.slice(0, safeCount).map((entry) => Number(entry)).map((entry) => Number.isFinite(entry) && entry > 0 ? entry : 0)
    : [];
  while (raw.length < safeCount) raw.push(1);
  const minimum = 0.05;
  const clamped = raw.map((entry) => Math.max(minimum, entry));
  const total = clamped.reduce((sum, entry) => sum + entry, 0) || safeCount;
  return clamped.map((entry) => Math.round((entry / total) * 10000) / 10000);
}

function normalizeTableRowHeight(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 28 && number <= 800 ? Math.round(number) : undefined;
}

function tableColumnCount(table: TableBlock) {
  return Math.max(1, table.rows.reduce((maximum, row) => Math.max(maximum, row.cells.reduce((sum, cell) => sum + (cell.colSpan ?? 1), 0)), 0));
}

function insertCellAtColumn(cells: TableCell[], columnIndex: number) {
  const next = cells.map((cell) => ({ ...cell }));
  let cursor = 0;
  for (let index = 0; index < next.length; index += 1) {
    const span = next[index].colSpan ?? 1;
    if (columnIndex === cursor) {
      next.splice(index, 0, createTableCell(""));
      return next;
    }
    if (columnIndex > cursor && columnIndex < cursor + span) {
      next[index] = { ...next[index], colSpan: span + 1 };
      return next;
    }
    cursor += span;
  }
  next.push(createTableCell(""));
  return next;
}

function deleteCellAtColumn(cells: TableCell[], columnIndex: number) {
  const next = cells.map((cell) => ({ ...cell }));
  let cursor = 0;
  for (let index = 0; index < next.length; index += 1) {
    const span = next[index].colSpan ?? 1;
    if (columnIndex >= cursor && columnIndex < cursor + span) {
      if (span > 1) next[index] = { ...next[index], colSpan: span - 1 };
      else next.splice(index, 1);
      return next.length ? next : [createTableCell("")];
    }
    cursor += span;
  }
  return next.length ? next : [createTableCell("")];
}

function insertTableWidth(widths: number[] | undefined, count: number, index: number) {
  const current = normalizeTableColumnWidths(widths, count);
  const insertion = current[Math.min(index, current.length - 1)] ?? 1;
  current.splice(Math.min(index, current.length), 0, insertion);
  return normalizeTableColumnWidths(current, current.length);
}

function deleteTableWidth(widths: number[] | undefined, count: number, index: number) {
  const current = normalizeTableColumnWidths(widths, count);
  if (current.length <= 1) return current;
  current.splice(Math.min(index, current.length - 1), 1);
  return normalizeTableColumnWidths(current, current.length);
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

function normalizeTableBorderStyle(value: unknown): TableBorderStyle {
  return typeof value === "string" && TABLE_BORDER_STYLES.includes(value as TableBorderStyle)
    ? value as TableBorderStyle
    : "all";
}

function normalizeActivityFields(value: unknown, legacy: Record<string, unknown>) {
  if (Array.isArray(value)) {
    return value.map((field) => normalizeActivityField(field)).filter((field): field is ActivityField => Boolean(field));
  }

  const legacyFields: Array<[ActivityFieldType, string[]]> = [
    ["introduction", ["introduction", "shortDescription"]],
    ["objective", ["objective"]],
    ["materials", ["materials"]],
    ["time", ["time", "duration"]],
    ["activityType", ["activityType", "groupType"]],
    ["instructions", ["instructions", "studentInstructions", "body", "content", "text"]],
    ["observation", ["observation", "observationPrompts"]],
    ["discussion", ["discussion"]],
    ["result", ["result", "expectedLearning"]],
    ["reflection", ["reflection", "reflectionPrompts"]],
    ["safetyNote", ["safetyNote", "safetyNotes"]],
    ["teacherNote", ["teacherNote", "teacherGuidance"]],
  ];
  return legacyFields.flatMap(([type, keys]) => {
    const value = keys.map((key) => legacy[key]).find((entry) => typeof entry === "string" || Array.isArray(entry));
    const text = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").join("\n") : typeof value === "string" ? normalizeText(value) : "";
    return text ? [{ id: createStableId(), type, text, visibility: defaultActivityFieldVisibility(type) }] : [];
  });
}

function normalizeActivityField(value: unknown): ActivityField | null {
  if (!isRecord(value)) return null;
  const rawType = typeof value.type === "string" ? value.type : "custom";
  const type = isActivityFieldType(rawType) ? rawType : "custom";
  const definition = activityFieldDefinition(type);
  const rawVisibility = isRecord(value.visibility) ? value.visibility : {};
  const defaults = defaultActivityFieldVisibility(type);
  const textValue = readFirstText(value, ["text", "content", "body", "value"]);
  const resourceId = normalizeOptionalText(typeof value.resourceId === "string" ? value.resourceId : "");
  return {
    id: normalizeId(typeof value.id === "string" ? value.id : ""),
    type,
    label: normalizeOptionalText(typeof value.label === "string" ? value.label : "") ?? (type === "custom" ? definition[1] : undefined),
    text: textValue || undefined,
    resourceId,
    visibility: {
      student: rawVisibility.student === undefined ? defaults.student : rawVisibility.student === true,
      teacher: rawVisibility.teacher === undefined ? defaults.teacher : rawVisibility.teacher === true,
    },
  };
}

function isActivityFieldType(value: string): value is ActivityFieldType {
  return ["introduction", "objective", "materials", "time", "activityType", "instructions", "observation", "discussion", "result", "reflection", "safetyNote", "teacherNote", "image", "video", "linkedResource", "custom"].includes(value);
}

function normalizeTableCellBackground(value: unknown): TableCellBackground | undefined {
  return typeof value === "string" && TABLE_CELL_BACKGROUNDS.includes(value as TableCellBackground)
    ? value as TableCellBackground
    : undefined;
}

function normalizeTableVerticalAlignment(value: unknown): TableVerticalAlignment | undefined {
  return typeof value === "string" && TABLE_VERTICAL_ALIGNMENTS.includes(value as TableVerticalAlignment)
    ? value as TableVerticalAlignment
    : undefined;
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
    case "thinkAndDiscuss":
      return "Think and Discuss";
    case "reflection":
      return "Reflection";
    case "competencyCheck":
      return "Competency Check";
    case "lifeSkill":
      return "Life Skill";
    case "caseStudy":
      return "Case Study";
    case "teacherTip":
      return "Teacher Tip";
    case "activityPrompt":
      return "Activity Prompt";
    case "experimentPrompt":
      return "Experiment Prompt";
    case "observationPrompt":
      return "Observation Prompt";
  }
}

function placeholderBlockTitle(type: PlaceholderBlockType) {
  return type === "mindMap" ? "Mind Map" : "Flow Chart";
}

function extractBlockText(block: ContentBlock) {
  if (isTextBlock(block)) {
    return richTextSpansToText(block.spans);
  }

  if (isInfoBoxBlock(block)) return block.text;
  if (isObservationBoxBlock(block)) return block.text;
  if (isFormulaBlock(block)) return block.expression;
  if (isImageBlock(block)) return block.caption ?? block.alt;

  if (isSequenceBlock(block)) {
    return block.items
      .map((item) => item.title)
      .filter(Boolean)
      .join("\n");
  }

  if (isTableBlock(block)) {
    return block.rows
      .map((row) => row.cells.map((cell) => cell.text).join(" | "))
      .join("\n");
  }

  return block.title ?? "";
}

function extractBlockItems(block: ContentBlock) {
  if (isListBlock(block)) return block.items;

  if (isSequenceBlock(block)) {
    return block.items.map(
      (item) => item.title || item.description || "",
    );
  }

  if (isTableBlock(block)) {
    return block.rows.map((row) => row.cells[0]?.text ?? "");
  }

  if (isTextBlock(block)) {
    const text = richTextSpansToText(block.spans);

    return text
      ? text
          .split(/\n+/)
          .map((item) => normalizeText(item))
          .filter(Boolean)
      : [""];
  }

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
