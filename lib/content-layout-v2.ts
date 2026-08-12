import type { ContentBlock, ContentDocument } from "./content-document";

export const LAYOUT_VERSIONS = [1, 2] as const;
export type LayoutVersion = (typeof LAYOUT_VERSIONS)[number];

export const V2_FRAME_TYPES = [
  "TEXT",
  "IMAGE",
  "TABLE",
  "VIDEO",
  "EDUCATIONAL",
  "ACTIVITY",
  "WORKSHEET",
  "EXERCISE",
  "SHAPE",
] as const;
export type LayoutV2FrameType = (typeof V2_FRAME_TYPES)[number];

export const V2_CHILD_FRAME_TYPES = ["TEXT", "IMAGE", "VIDEO", "TABLE"] as const;
export type LayoutV2ChildFrameType = (typeof V2_CHILD_FRAME_TYPES)[number];

export const V2_LAYOUT_MODES = ["FLOW", "INLINE", "FLOAT", "ABSOLUTE"] as const;
export type LayoutV2Mode = (typeof V2_LAYOUT_MODES)[number];

export const V2_LAYERS = ["BACKGROUND", "CONTENT", "DESIGN", "INTERACTIVE"] as const;
export type LayoutV2Layer = (typeof V2_LAYERS)[number];

export const V2_WRAP_MODES = [
  "NONE",
  "INLINE",
  "WRAP_LEFT",
  "WRAP_RIGHT",
  "WRAP_BOTH",
  "BEHIND_TEXT",
  "IN_FRONT_OF_TEXT",
] as const;
export type LayoutV2WrapMode = (typeof V2_WRAP_MODES)[number];

export const V2_TEXT_DIRECTIONS = ["LTR", "RTL", "AUTO"] as const;
export type LayoutV2TextDirection = (typeof V2_TEXT_DIRECTIONS)[number];

export const V2_TEXT_HEIGHT_MODES = ["AUTO", "FIXED"] as const;
export type LayoutV2TextHeightMode = (typeof V2_TEXT_HEIGHT_MODES)[number];

export const V2_TEXT_OVERFLOW_MODES = ["VISIBLE", "CLIP", "OVERSET"] as const;
export type LayoutV2TextOverflowMode = (typeof V2_TEXT_OVERFLOW_MODES)[number];

export const V2_IMAGE_FIT_MODES = ["FIT", "FILL", "CROP"] as const;
export const V2_IMAGE_ZOOM_MIN = 1;
export const V2_IMAGE_ZOOM_MAX = 5;
export type LayoutV2ImageFitMode = (typeof V2_IMAGE_FIT_MODES)[number];

export const V2_VIDEO_DISPLAY_MODES = ["PLAYER", "BUTTON"] as const;
export type LayoutV2VideoDisplayMode = (typeof V2_VIDEO_DISPLAY_MODES)[number];

export const V2_PAGE_PRESETS = ["A3", "A4", "A5", "CUSTOM"] as const;
export type LayoutV2PagePreset = (typeof V2_PAGE_PRESETS)[number];
export type LayoutV2Unit = "px" | "mm" | "cm" | "inch";
export type LayoutV2Alignment = "left" | "center" | "right" | "justify";

export const V2_MAIN_FLOW_FRAME_PREFIX = "main-flow-";

export type LayoutV2PageSize = {
  preset?: LayoutV2PagePreset;
  width: number;
  height: number;
  unit: LayoutV2Unit;
};

export type LayoutV2ContentReference = {
  blockId?: string;
  resourceId?: string;
};

export type LayoutV2Background = {
  resourceId?: string;
  color?: string;
};

export const V2_VISUAL_MODES = ["EDITABLE", "EXACT_REPLICA"] as const;
export type LayoutV2VisualMode = (typeof V2_VISUAL_MODES)[number];
export const V2_FRAME_RENDER_MODES = ["VISIBLE", "SEMANTIC_ONLY"] as const;
export type LayoutV2FrameRenderMode = (typeof V2_FRAME_RENDER_MODES)[number];
export const V2_FRAME_AUDIENCES = ["ALL", "STUDENT", "TEACHER"] as const;
export type LayoutV2FrameAudience = (typeof V2_FRAME_AUDIENCES)[number];

export type LayoutV2ReplicaVisual = {
  resourceId?: string;
  sourceKind: "PDF" | "PAGE_IMAGE";
  sourcePageNumber?: number;
  intrinsicWidth: number;
  intrinsicHeight: number;
  fitMode: "CONTAIN";
  sourceHash: string;
  importMetadata?: {
    sourceFileName?: string;
    pageIndex?: number;
    referencePageCount?: number;
  };
};

export type LayoutV2NarrationSegment = {
  id: string;
  sourceHash: string;
  resourceId?: string;
  startMs?: number;
  endMs?: number;
};

export type LayoutV2PageReadAloud = {
  text: string;
  source: "PDF_TEXT" | "MANUAL";
  reviewed?: boolean;
};

export type LayoutV2PageNarration = {
  sourceHash: string;
  resourceId?: string;
  provider?: string;
  providerVersion?: string;
  voice?: string;
  language?: string;
  status?: "READY" | "NEEDS_REGENERATION" | "UNAVAILABLE" | "BROWSER_TTS_FALLBACK";
  segments?: LayoutV2NarrationSegment[];
};
export type LayoutV2Crop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutV2TextSpan = {
  text: string;
  marks?: Array<"bold" | "italic" | "underline" | "superscript" | "subscript">;
  color?: string;
  highlight?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  letterSpacing?: number;
  baselineShift?: number;
  horizontalScale?: number;
  verticalScale?: number;
  textTransform?: "uppercase" | "lowercase" | "capitalize";
};export type LayoutV2ImageTransform = {
  crop: LayoutV2Crop;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type LayoutV2Frame = {
  id: string;
  type: LayoutV2FrameType;
  pageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  layer: LayoutV2Layer;
  layoutMode: LayoutV2Mode;
  wrapMode: LayoutV2WrapMode;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  aspectLocked?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
  textColor?: string;
  textSpans?: LayoutV2TextSpan[];
  textInset?: { top: number; right: number; bottom: number; left: number };
  overset?: boolean;
  wrapPadding?: number;
  contentRef?: LayoutV2ContentReference;
  payload?: unknown;
  readable: boolean;
  audioAllowed?: boolean;
  readingOrder: number;
  language?: string;
  narrationLabel?: string;
  altText?: string;
  caption?: string;
  direction?: LayoutV2TextDirection;
  alignment?: LayoutV2Alignment;
  heightMode?: LayoutV2TextHeightMode;
  overflow?: LayoutV2TextOverflowMode;
  resourceId?: string;
  fitMode?: LayoutV2ImageFitMode;
  crop?: LayoutV2Crop;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  parentId?: string;
  children?: LayoutV2Frame[];
  renderMode?: LayoutV2FrameRenderMode;
  audience?: LayoutV2FrameAudience;
};

/**
 * Video presentation belongs to a document frame, not to its reusable
 * protected resource. Missing legacy data intentionally reads as PLAYER
 * without materialising a change merely by viewing the document.
 */
export function getV2VideoDisplayMode(frame: Pick<LayoutV2Frame, "payload"> | { payload?: unknown }): LayoutV2VideoDisplayMode {
  const payload = isRecord(frame.payload) ? frame.payload : {};
  const displayMode = typeof payload.displayMode === "string" ? payload.displayMode.toUpperCase() : "";
  return displayMode === "BUTTON" ? "BUTTON" : "PLAYER";
}

export function withV2VideoDisplayMode(frame: Pick<LayoutV2Frame, "payload"> | { payload?: unknown }, displayMode: LayoutV2VideoDisplayMode) {
  const payload = isRecord(frame.payload) ? frame.payload : {};
  return { ...payload, displayMode };
}

export type LayoutV2PdfBackground = { source: "BOOK_FULL_PDF"; pageNumber: number; };

export type LayoutV2Page = {
  id: string;
  order: number;
  width: number;
  height: number;
  unit: LayoutV2Unit;
  background?: LayoutV2Background;
  pdfBackground?: LayoutV2PdfBackground;
  frames: LayoutV2Frame[];
  visualMode?: LayoutV2VisualMode;
  replica?: LayoutV2ReplicaVisual;
  readAloud?: LayoutV2PageReadAloud;
  narration?: LayoutV2PageNarration;
};

export type LayoutV2PageLayout = {
  pageSize: LayoutV2PageSize;
  pages: LayoutV2Page[];
};

type NormalizationOptions = {
  createMissingIds?: boolean;
};

const DEFAULT_PAGE_SIZE: LayoutV2PageSize = {
  preset: "A4",
  width: 794,
  height: 1123,
  unit: "px",
};

const PAGE_PRESET_SIZES: Record<LayoutV2PagePreset, LayoutV2PageSize> = {
  A3: { preset: "A3", width: 1123, height: 1587, unit: "px" },
  A4: { preset: "A4", width: 794, height: 1123, unit: "px" },
  A5: { preset: "A5", width: 559, height: 794, unit: "px" },
  CUSTOM: { preset: "CUSTOM", width: 794, height: 1123, unit: "px" },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const positive = (value: unknown, fallback: number) =>
  Math.max(1, finite(value, fallback));

const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, finite(value, fallback)));

const safeString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const enumValue = <T extends readonly string[]>(values: T, value: unknown, fallback: T[number]) =>
  values.includes(value as T[number]) ? value as T[number] : fallback;

function generatedId(prefix: string, index: number) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${index.toString(36)}`;
}

function normalizedId(value: unknown, prefix: string, index: number, createMissingIds: boolean) {
  const existing = safeString(value);
  return existing ?? (createMissingIds ? generatedId(prefix, index) : undefined);
}

function defaultReadable(type: LayoutV2FrameType, layer: LayoutV2Layer) {
  if (layer === "BACKGROUND" || type === "SHAPE") return false;
  return ["TEXT", "EDUCATIONAL", "ACTIVITY", "WORKSHEET", "EXERCISE"].includes(type);
}

function normalizePageSize(value: unknown): LayoutV2PageSize {
  const record = isRecord(value) ? value : {};
  const preset = enumValue(V2_PAGE_PRESETS, record.preset, "A4");
  const presetDefaults = PAGE_PRESET_SIZES[preset];
  const unit = enumValue(["px", "mm", "cm", "inch"] as const, record.unit, presetDefaults.unit);
  return {
    preset,
    width: positive(record.width, presetDefaults.width),
    height: positive(record.height, presetDefaults.height),
    unit,
  };
}

export function normalizeV2ImageCrop(value: unknown): LayoutV2Crop {
  const record = isRecord(value) ? value : {};
  const width = bounded(record.width, 1, 0.0001, 1);
  const height = bounded(record.height, 1, 0.0001, 1);
  return {
    x: bounded(record.x, 0, 0, Math.max(0, 1 - width)),
    y: bounded(record.y, 0, 0, Math.max(0, 1 - height)),
    width,
    height,
  };
}

export function normalizeV2ImageTransform(value: Partial<LayoutV2ImageTransform> = {}): LayoutV2ImageTransform {
  return {
    crop: normalizeV2ImageCrop(value.crop),
    zoom: bounded(value.zoom, 1, V2_IMAGE_ZOOM_MIN, V2_IMAGE_ZOOM_MAX),
    offsetX: bounded(value.offsetX, 0, -1, 1),
    offsetY: bounded(value.offsetY, 0, -1, 1),
  };
}

export function getV2CropImagePercentages(value: Partial<LayoutV2ImageTransform> = {}) {
  const transform = normalizeV2ImageTransform(value);
  return {
    width: (100 / transform.crop.width) * transform.zoom,
    height: (100 / transform.crop.height) * transform.zoom,
    left: (-(transform.crop.x / transform.crop.width) + transform.offsetX) * 100,
    top: (-(transform.crop.y / transform.crop.height) + transform.offsetY) * 100,
  };
}

function normalizeTextInset(value: unknown) { if (!isRecord(value)) return undefined; const top = bounded(value.top, 12, 0, 96); const right = bounded(value.right, 12, 0, 96); const bottom = bounded(value.bottom, 12, 0, 96); const left = bounded(value.left, 12, 0, 96); return { top, right, bottom, left }; }

function normalizeTextSpans(value: unknown): LayoutV2TextSpan[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowedMarks = ["bold", "italic", "underline", "superscript", "subscript"] as const;
  const spans = value.map((entry) => {
    if (!isRecord(entry) || typeof entry.text !== "string") return undefined;
    const marks = Array.isArray(entry.marks) ? entry.marks.filter((mark) => allowedMarks.includes(mark as typeof allowedMarks[number])) as Array<typeof allowedMarks[number]> : undefined;
    return {
      text: entry.text,
      ...(marks?.length ? { marks } : {}),
      ...(safeString(entry.color) ? { color: safeString(entry.color) } : {}),
      ...(safeString(entry.highlight) ? { highlight: safeString(entry.highlight) } : {}),
      ...(typeof entry.fontSize === "number" && Number.isFinite(entry.fontSize) ? { fontSize: bounded(entry.fontSize, 16, 8, 96) } : {}),
      ...(safeString(entry.fontFamily) ? { fontFamily: safeString(entry.fontFamily) } : {}),
      ...(typeof entry.fontWeight === "number" && Number.isFinite(entry.fontWeight) ? { fontWeight: bounded(entry.fontWeight, 400, 100, 900) } : {}),
      ...(entry.fontStyle === "italic" ? { fontStyle: "italic" as const } : {}),
      ...(typeof entry.letterSpacing === "number" && Number.isFinite(entry.letterSpacing) ? { letterSpacing: bounded(entry.letterSpacing, 0, -4, 16) } : {}),
      ...(typeof entry.baselineShift === "number" && Number.isFinite(entry.baselineShift) ? { baselineShift: bounded(entry.baselineShift, 0, -96, 96) } : {}),
      ...(typeof entry.horizontalScale === "number" && Number.isFinite(entry.horizontalScale) ? { horizontalScale: bounded(entry.horizontalScale, 100, 20, 300) } : {}),
      ...(typeof entry.verticalScale === "number" && Number.isFinite(entry.verticalScale) ? { verticalScale: bounded(entry.verticalScale, 100, 20, 300) } : {}),
      ...(["uppercase", "lowercase", "capitalize"].includes(entry.textTransform as string) ? { textTransform: entry.textTransform as "uppercase" | "lowercase" | "capitalize" } : {}),
    };
  }).filter(Boolean) as LayoutV2TextSpan[];
  return spans.length ? spans : undefined;
}

function normalizeReference(value: unknown): LayoutV2ContentReference | undefined {
  if (!isRecord(value)) return undefined;
  const blockId = safeString(value.blockId);
  const resourceId = safeString(value.resourceId);
  return blockId || resourceId ? { ...(blockId ? { blockId } : {}), ...(resourceId ? { resourceId } : {}) } : undefined;
}

function normalizeBackground(value: unknown): LayoutV2Background | undefined {
  if (!isRecord(value)) return undefined;
  const resourceId = safeString(value.resourceId);
  const color = safeString(value.color);
  return resourceId || color ? { ...(resourceId ? { resourceId } : {}), ...(color ? { color } : {}) } : undefined;
}

function normalizeReplica(value: unknown): LayoutV2ReplicaVisual | undefined {
  if (!isRecord(value)) return undefined;
  const sourceKind = enumValue(["PDF", "PAGE_IMAGE"] as const, value.sourceKind, "PAGE_IMAGE");
  const sourceHash = safeString(value.sourceHash);
  if (!sourceHash) return undefined;
  const metadata = isRecord(value.importMetadata) ? value.importMetadata : undefined;
  return {
    ...(safeString(value.resourceId) ? { resourceId: safeString(value.resourceId) } : {}),
    sourceKind,
    ...(Number.isFinite(value.sourcePageNumber) ? { sourcePageNumber: Math.max(1, Math.round(value.sourcePageNumber as number)) } : {}),
    intrinsicWidth: positive(value.intrinsicWidth, 1),
    intrinsicHeight: positive(value.intrinsicHeight, 1),
    fitMode: "CONTAIN",
    sourceHash,
    ...(metadata ? {
      importMetadata: {
        ...(safeString(metadata.sourceFileName) ? { sourceFileName: safeString(metadata.sourceFileName) } : {}),
        ...(Number.isFinite(metadata.pageIndex) ? { pageIndex: Math.max(0, Math.round(metadata.pageIndex as number)) } : {}),
        ...(Number.isFinite(metadata.referencePageCount) ? { referencePageCount: Math.max(1, Math.round(metadata.referencePageCount as number)) } : {}),
      },
    } : {}),
  };
}
function normalizeReadAloud(value: unknown): LayoutV2PageReadAloud | undefined {
  if (!isRecord(value) || typeof value.text !== "string") return undefined;
  const source = value.source === "PDF_TEXT" || value.source === "MANUAL" ? value.source : undefined;
  if (!source) return undefined;
  return {
    text: value.text.trim(),
    source,
    ...(typeof value.reviewed === "boolean" ? { reviewed: value.reviewed } : {}),
  };
}

function normalizeNarration(value: unknown): LayoutV2PageNarration | undefined {
  if (!isRecord(value) || !safeString(value.sourceHash)) return undefined;
  const segments = Array.isArray(value.segments)
    ? value.segments.map((entry) => {
      if (!isRecord(entry) || !safeString(entry.id) || !safeString(entry.sourceHash)) return undefined;
      return {
        id: safeString(entry.id)!,
        sourceHash: safeString(entry.sourceHash)!,
        ...(safeString(entry.resourceId) ? { resourceId: safeString(entry.resourceId) } : {}),
        ...(Number.isFinite(entry.startMs) ? { startMs: Math.max(0, Math.round(entry.startMs as number)) } : {}),
        ...(Number.isFinite(entry.endMs) ? { endMs: Math.max(0, Math.round(entry.endMs as number)) } : {}),
      } satisfies LayoutV2NarrationSegment;
    }).filter((entry): entry is LayoutV2NarrationSegment => Boolean(entry))
    : undefined;
  return {
    sourceHash: safeString(value.sourceHash)!,
    ...(safeString(value.resourceId) ? { resourceId: safeString(value.resourceId) } : {}),
    ...(safeString(value.provider) ? { provider: safeString(value.provider) } : {}),
    ...(safeString(value.providerVersion) ? { providerVersion: safeString(value.providerVersion) } : {}),
    ...(safeString(value.voice) ? { voice: safeString(value.voice) } : {}),
    ...(safeString(value.language) ? { language: safeString(value.language) } : {}),
    ...(value.status === "READY" || value.status === "NEEDS_REGENERATION" || value.status === "UNAVAILABLE" || value.status === "BROWSER_TTS_FALLBACK" ? { status: value.status } : {}),
    ...(segments?.length ? { segments } : {}),
  };
}
function normalizeFrame(value: unknown, pageId: string, index: number, options: NormalizationOptions, allowChildren = true): LayoutV2Frame | undefined {
  if (!isRecord(value)) return undefined;
  const id = normalizedId(value.id, `frame_${pageId}`, index, options.createMissingIds === true);
  if (!id) return undefined;
  const type = enumValue(V2_FRAME_TYPES, value.type, "TEXT");
  const layer = enumValue(V2_LAYERS, value.layer, "CONTENT");
  const contentRef = normalizeReference(value.contentRef);
  const resourceId = safeString(value.resourceId) ?? contentRef?.resourceId;
  const children = allowChildren && (type === "EDUCATIONAL" || type === "TEXT") && Array.isArray(value.children)
    ? value.children.map((child, childIndex) => {
      if (!isRecord(child) || !V2_CHILD_FRAME_TYPES.includes(child.type as LayoutV2ChildFrameType)) return undefined;
      return normalizeFrame(child, pageId, childIndex, options, false);
    }).filter((child): child is LayoutV2Frame => Boolean(child)).map((child) => ({ ...child, parentId: id }))
    : undefined;
  return {
    id,
    type,
    pageId,
    x: Math.max(0, finite(value.x, 0)),
    y: Math.max(0, finite(value.y, 0)),
    width: positive(value.width, 320),
    height: positive(value.height, 160),
    zIndex: Math.round(finite(value.zIndex, 0)),
    layer,
    layoutMode: enumValue(V2_LAYOUT_MODES, value.layoutMode, "FLOW"),
    wrapMode: enumValue(V2_WRAP_MODES, value.wrapMode, "NONE"),
    rotation: bounded(value.rotation, 0, -360, 360),
    locked: value.locked === true,
    hidden: value.hidden === true,
    ...(type === "IMAGE" && typeof value.aspectLocked === "boolean"
      ? { aspectLocked: value.aspectLocked }
      : value.aspectLocked === true
        ? { aspectLocked: true }
        : {}),
    ...(typeof value.wrapPadding === "number" ? { wrapPadding: bounded(value.wrapPadding, 8, 0, 96) } : {}),
    ...(value.overset === true ? { overset: true } : {}),
    ...(contentRef ? { contentRef } : {}),
    ...(Object.prototype.hasOwnProperty.call(value, "payload") ? { payload: value.payload } : {}),
    readable: typeof value.readable === "boolean" ? value.readable : defaultReadable(type, layer),
    ...(value.audioAllowed === false ? { audioAllowed: false } : {}),
    readingOrder: Math.max(0, Math.round(finite(value.readingOrder, index))),
    ...(safeString(value.language) ? { language: safeString(value.language) } : {}),
    ...(safeString(value.narrationLabel) ? { narrationLabel: safeString(value.narrationLabel) } : {}),
    ...(safeString(value.altText) ? { altText: safeString(value.altText) } : {}),
    ...(type === "TEXT" ? {
      direction: enumValue(V2_TEXT_DIRECTIONS, value.direction, "LTR"),
      alignment: enumValue(["left", "center", "right", "justify"] as const, value.alignment, "left"),
      heightMode: enumValue(V2_TEXT_HEIGHT_MODES, value.heightMode, "AUTO"),
      overflow: enumValue(V2_TEXT_OVERFLOW_MODES, value.overflow, "VISIBLE"),
      ...(safeString(value.fontFamily) ? { fontFamily: safeString(value.fontFamily) } : {}),
      ...(typeof value.fontSize === "number" && Number.isFinite(value.fontSize) ? { fontSize: bounded(value.fontSize, 16, 8, 96) } : {}),
      ...(typeof value.fontWeight === "number" && Number.isFinite(value.fontWeight) ? { fontWeight: bounded(value.fontWeight, 400, 100, 900) } : {}),
      ...(value.fontStyle === "italic" ? { fontStyle: "italic" as const } : {}),
      ...(typeof value.lineHeight === "number" && Number.isFinite(value.lineHeight) ? { lineHeight: bounded(value.lineHeight, 1.4, 1, 3) } : {}),
      ...(typeof value.letterSpacing === "number" && Number.isFinite(value.letterSpacing) ? { letterSpacing: bounded(value.letterSpacing, 0, -4, 16) } : {}),
      ...(safeString(value.textColor) ? { textColor: safeString(value.textColor) } : {}),
      ...(normalizeTextSpans(value.textSpans) ? { textSpans: normalizeTextSpans(value.textSpans) } : {}),
      ...(normalizeTextInset(value.textInset) ? { textInset: normalizeTextInset(value.textInset)! } : {}),
    } : {}),
    ...(type === "IMAGE" ? {
      ...(resourceId ? { resourceId } : {}),
      fitMode: enumValue(V2_IMAGE_FIT_MODES, value.fitMode, "FIT"),
      crop: normalizeV2ImageCrop(value.crop),
      zoom: bounded(value.zoom, 1, V2_IMAGE_ZOOM_MIN, V2_IMAGE_ZOOM_MAX),
      offsetX: bounded(value.offsetX, 0, -1, 1),
      offsetY: bounded(value.offsetY, 0, -1, 1),
      ...(safeString(value.caption) ? { caption: safeString(value.caption) } : {}),
      ...(["left", "center", "right"].includes(value.alignment as string) ? { alignment: value.alignment as "left" | "center" | "right" } : {}),
    } : {}),
    ...(type === "VIDEO" && resourceId ? { resourceId } : {}),
    ...(safeString(value.parentId) ? { parentId: safeString(value.parentId) } : {}),
    ...(children ? { children } : {}),
    ...(value.renderMode === "SEMANTIC_ONLY" ? { renderMode: "SEMANTIC_ONLY" as const } : {}),
    ...(V2_FRAME_AUDIENCES.includes(value.audience as LayoutV2FrameAudience) && value.audience !== "ALL" ? { audience: value.audience as LayoutV2FrameAudience } : {}),
  };
}

function normalizePdfBackground(value: unknown): LayoutV2PdfBackground | undefined { if (!isRecord(value) || value.source !== "BOOK_FULL_PDF" || typeof value.pageNumber !== "number" || !Number.isInteger(value.pageNumber) || value.pageNumber < 1) return undefined; return { source: "BOOK_FULL_PDF", pageNumber: value.pageNumber }; }

function normalizePage(value: unknown, index: number, options: NormalizationOptions): LayoutV2Page | undefined {
  if (!isRecord(value)) return undefined;
  const id = normalizedId(value.id, "page", index, options.createMissingIds === true);
  if (!id) return undefined;
  const frames = Array.isArray(value.frames)
    ? value.frames.map((frame, frameIndex) => normalizeFrame(frame, id, frameIndex, options)).filter((frame): frame is LayoutV2Frame => Boolean(frame))
    : [];
  const replica = normalizeReplica(value.replica);
  const readAloud = normalizeReadAloud(value.readAloud);
  const narration = normalizeNarration(value.narration);
  const visualMode = value.visualMode === "EXACT_REPLICA" ? "EXACT_REPLICA" as const : undefined;
  return {
    id,
    order: Math.max(0, Math.round(finite(value.order, index))),
    width: positive(value.width, DEFAULT_PAGE_SIZE.width),
    height: positive(value.height, DEFAULT_PAGE_SIZE.height),
    unit: enumValue(["px", "mm", "cm", "inch"] as const, value.unit, DEFAULT_PAGE_SIZE.unit),
    ...(normalizeBackground(value.background) ? { background: normalizeBackground(value.background) } : {}),
    ...(normalizePdfBackground(value.pdfBackground) ? { pdfBackground: normalizePdfBackground(value.pdfBackground) } : {}),
    frames,
    ...(visualMode ? { visualMode } : {}),
    ...(replica ? { replica } : {}),
    ...(readAloud ? { readAloud } : {}),
    ...(narration ? { narration } : {}),
  };
}

export function normalizePageLayoutV2(value: unknown, options: NormalizationOptions = {}): LayoutV2PageLayout | undefined {
  if (!isRecord(value) || !Array.isArray(value.pages)) return undefined;
  const pages = value.pages.map((page, index) => normalizePage(page, index, options)).filter((page): page is LayoutV2Page => Boolean(page));
  if (!pages.length) return undefined;
  return {
    pageSize: normalizePageSize(value.pageSize),
    pages: pages.map((page, index) => ({ ...page, order: index })),
  };
}

export function createV2PageLayout(options: {
  pageSize?: Partial<LayoutV2PageSize>;
  pages?: Array<Omit<Partial<LayoutV2Page>, "frames"> & { frames?: Array<Partial<LayoutV2Frame>> }>;
} = {}): LayoutV2PageLayout {
  const requested = { ...DEFAULT_PAGE_SIZE, ...(options.pageSize ?? {}) };
  const pageSize = normalizePageSize(requested);
  const pages = options.pages?.length ? options.pages : [{}];
  return normalizePageLayoutV2({
    pageSize,
    pages: pages.map((page, index) => ({
      ...page,
      id: page.id ?? generatedId("page", index),
      order: index,
      width: page.width ?? pageSize.width,
      height: page.height ?? pageSize.height,
      unit: page.unit ?? pageSize.unit,
      frames: (page.frames ?? []).map((frame, frameIndex) => ({
        ...frame,
        id: frame.id ?? generatedId(`frame_page_${index}`, frameIndex),
        pageId: page.id ?? undefined,
      })),
    })),
  }, { createMissingIds: true }) ?? { pageSize, pages: [] };
}

export type LayoutV2FrameInput = Partial<Omit<LayoutV2Frame, "id" | "pageId" | "type">> & { id?: string };

export type LayoutV2FrameGeometry = Pick<LayoutV2Frame, "x" | "y" | "width" | "height">;

export function clampV2FrameGeometry(
  geometry: LayoutV2FrameGeometry,
  pageWidth: number,
  pageHeight: number,
): LayoutV2FrameGeometry {
  const safePageWidth = Math.max(1, pageWidth);
  const safePageHeight = Math.max(1, pageHeight);
  const width = Math.min(safePageWidth, Math.max(Math.min(24, safePageWidth), finite(geometry.width, 24)));
  const height = Math.min(safePageHeight, Math.max(Math.min(24, safePageHeight), finite(geometry.height, 24)));
  return {
    width,
    height,
    x: Math.min(safePageWidth - width, Math.max(0, finite(geometry.x, 0))),
    y: Math.min(safePageHeight - height, Math.max(0, finite(geometry.y, 0))),
  };
}

export function getV2InsertionGeometry(
  page: Pick<LayoutV2Page, "width" | "height" | "frames">,
  type: LayoutV2FrameType,
  preferredPoint?: { x: number; y: number },
): LayoutV2FrameGeometry {
  const margin = Math.min(48, Math.max(12, Math.min(page.width, page.height) * 0.06));
  const availableWidth = Math.max(24, page.width - margin * 2);
  const availableHeight = Math.max(24, page.height - margin * 2);
  const preferredSize = type === "TEXT"
    ? { width: 420, height: 150 }
    : type === "EDUCATIONAL"
      ? { width: 520, height: 180 }
      : type === "SHAPE"
        ? { width: 220, height: 120 }
        : { width: 320, height: 180 };
  return clampV2FrameGeometry({
    x: preferredPoint?.x ?? margin,
    y: preferredPoint?.y ?? margin,
    width: Math.min(preferredSize.width, availableWidth),
    height: Math.min(preferredSize.height, availableHeight),
  }, page.width, page.height);
}

export function createV2Frame(
  type: LayoutV2FrameType,
  pageId: string,
  input: LayoutV2FrameInput = {},
): LayoutV2Frame {
  const frame = normalizeFrame({
    ...input,
    id: input.id ?? generatedId(`frame_${pageId}`, 0),
    type,
    pageId,
  }, pageId, 0, { createMissingIds: true });
  if (!frame) throw new Error("Unable to create V2 frame");
  return frame;
}

export function getV2MainFlowFrameId(pageId: string) {
  return `${V2_MAIN_FLOW_FRAME_PREFIX}${pageId}`;
}

export function isV2MainFlowFrame(frame: LayoutV2Frame) {
  return frame.type === "TEXT" && frame.layoutMode === "FLOW" && frame.id === getV2MainFlowFrameId(frame.pageId);
}

export function ensureV2MainFlowFrames(layout: LayoutV2PageLayout): LayoutV2PageLayout {
  let changed = false;
  const pages = layout.pages.map((page) => {
    if (page.frames.some(isV2MainFlowFrame)) return page;
    changed = true;
    const margin = Math.min(48, Math.max(24, Math.min(page.width, page.height) * 0.06));
    const frame = createV2Frame("TEXT", page.id, {
      id: getV2MainFlowFrameId(page.id),
      x: margin,
      y: margin,
      width: Math.max(24, page.width - margin * 2),
      height: Math.max(48, page.height - margin * 2),
      zIndex: 0,
      layer: "CONTENT",
      layoutMode: "FLOW",
      wrapMode: "NONE",
      payload: "",
      readable: true,
      readingOrder: 0,
      narrationLabel: "Main content",
      direction: "LTR",
      alignment: "left",
      heightMode: "FIXED",
      overflow: "OVERSET",
    });
    return { ...page, frames: [frame, ...page.frames] };
  });
  return changed ? { ...layout, pages } : layout;
}

function isV2ChildContainer(frame: LayoutV2Frame) {
  return frame.type === "EDUCATIONAL" || frame.type === "TEXT";
}

/**
 * Creates an in-memory V2 workspace projection for a legacy V1 document.
 * It deliberately does not mutate the document or set layoutVersion. Callers
 * may persist the returned layout only after an explicit V2 editing action.
 */
export function createV2CompatibilityLayout(document: ContentDocument): LayoutV2PageLayout {
  const pageWidth = Math.max(320, document.canvas?.width ?? DEFAULT_PAGE_SIZE.width);
  const pageHeight = Math.max(420, document.canvas?.height ?? DEFAULT_PAGE_SIZE.height);
  const pages = document.periods.map((period, periodIndex) => {
    const pageId = `legacy-v1-period-${period.id}`;
    const periodBlocks = document.blocks.filter((block) => block.periodId === period.id);
    return {
      id: pageId,
      order: periodIndex,
      width: pageWidth,
      height: pageHeight,
      unit: "px" as const,
      frames: periodBlocks.map((block, blockIndex) => legacyBlockToV2Frame(block, pageId, blockIndex, pageWidth, pageHeight)),
    };
  });
  return createV2PageLayout({
    pageSize: { preset: "CUSTOM", width: pageWidth, height: pageHeight, unit: "px" },
    pages: pages.length ? pages : [{ id: "legacy-v1-period-default", width: pageWidth, height: pageHeight, unit: "px", frames: [] }],
  });
}

function legacyBlockToV2Frame(
  block: ContentBlock,
  pageId: string,
  index: number,
  pageWidth: number,
  pageHeight: number,
): LayoutV2Frame {
  const source = block as unknown as Record<string, unknown>;
  const legacyLayout = block.layout;
  const type = legacyBlockFrameType(block);
  const x = Math.min(Math.max(0, pageWidth - 120), Math.max(0, legacyLayout?.x ?? 36));
  const y = Math.min(Math.max(0, pageHeight - 72), Math.max(0, legacyLayout?.y ?? 36 + index * 176));
  const width = Math.max(120, Math.min(pageWidth - x, legacyLayout?.width ?? pageWidth - 72));
  const height = Math.max(72, Math.min(pageHeight - y, legacyLayout?.height ?? (type === "TEXT" ? 120 : 180)));
  const payload = type === "TEXT" && typeof source.text !== "string"
    ? legacyBlockPlainText(block)
    : undefined;
  const legacyResourceId = typeof source.resourceId === "string"
    ? source.resourceId
    : block.type === "media" && source.targetType === "RESOURCE" && typeof source.targetId === "string"
      ? source.targetId
      : undefined;
  return createV2Frame(type, pageId, {
    id: `legacy-v1-frame-${block.id}`,
    x,
    y,
    width,
    height,
    zIndex: legacyLayout?.zIndex ?? index,
    layer: "CONTENT",
    layoutMode: "ABSOLUTE",
    readingOrder: index,
    contentRef: { blockId: block.id },
    ...(payload !== undefined ? { payload } : {}),
    ...((type === "IMAGE" || type === "VIDEO") && legacyResourceId ? { resourceId: legacyResourceId } : {}),
    ...(type === "IMAGE" && typeof source.alt === "string" ? { altText: source.alt } : {}),
    ...(type === "IMAGE" && typeof source.caption === "string" && source.caption.trim() ? { caption: source.caption } : {}),
    ...(type === "IMAGE" && ["left", "center", "right"].includes(source.align as string) ? { alignment: source.align as "left" | "center" | "right" } : {}),
    ...(typeof source.fontFamily === "string" ? { fontFamily: source.fontFamily } : {}),
    ...(typeof source.fontSize === "number" ? { fontSize: source.fontSize } : {}),
    ...(source.bold === true ? { fontWeight: 700 } : {}),
    ...(source.italic === true ? { fontStyle: "italic" as const } : {}),
  });
}

function legacyBlockFrameType(block: ContentBlock): LayoutV2FrameType {
  if (block.type === "image" || block.type === "diagram" || block.type === "imageGallery") return "IMAGE";
  if (block.type === "table" || block.type === "comparisonTable") return "TABLE";
  if (block.type === "media") return "VIDEO";
  if (block.type === "educationalObject" || block.type === "infoBox" || block.type === "observationBox") return "EDUCATIONAL";
  if (block.type === "activity") return "ACTIVITY";
  if (block.type === "worksheet") return "WORKSHEET";
  if (block.type === "exercise") return "EXERCISE";
  return "TEXT";
}

function legacyBlockPlainText(block: ContentBlock) {
  const source = block as unknown as Record<string, unknown>;
  if (Array.isArray(source.items)) return source.items.filter((item): item is string => typeof item === "string").join("\n");
  return typeof source.text === "string" ? source.text : "";
}

export function updateV2PageLayout(
  layout: LayoutV2PageLayout,
  updater: (pages: LayoutV2Page[]) => LayoutV2Page[],
): LayoutV2PageLayout {
  return normalizePageLayoutV2({ ...layout, pages: updater(layout.pages) }) ?? layout;
}

export function updateV2Frame(
  layout: LayoutV2PageLayout,
  pageId: string,
  frameId: string,
  patch: Partial<LayoutV2Frame>,
): LayoutV2PageLayout {
  const page = layout.pages.find((entry) => entry.id === pageId);
  const frame = getV2Frame(layout, pageId, frameId);
  if (!page || !frame) return layout;
  const parent = page.frames.find((entry) => isV2ChildContainer(entry) && entry.children?.some((child) => child.id === frameId));
  const geometry = clampV2FrameGeometry({ ...frame, ...patch }, parent?.width ?? page.width, parent?.height ?? page.height);
  return updateV2PageLayout(layout, (pages) => pages.map((entry) => entry.id !== pageId ? entry : {
    ...entry,
    frames: entry.frames.map((item) => item.id === frameId
      ? { ...item, ...patch, pageId, ...geometry }
      : isV2ChildContainer(item) && item.children?.some((child) => child.id === frameId)
        ? { ...item, children: item.children.map((child) => child.id === frameId ? { ...child, ...patch, pageId, parentId: item.id, ...geometry } : child) }
        : item),
  }));
}
export type V2ArrangeAction = "FRONT" | "FORWARD" | "BACKWARD" | "BACK";

export function getV2Frame(layout: LayoutV2PageLayout, pageId: string, frameId: string): LayoutV2Frame | undefined {
  const page = layout.pages.find((entry) => entry.id === pageId);
  if (!page) return undefined;
  for (const frame of page.frames) {
    if (frame.id === frameId) return frame;
    const child = frame.children?.find((entry) => entry.id === frameId);
    if (child) return child;
  }
  return undefined;
}

function normalizeScope(frames: LayoutV2Frame[]) {
  const ordered = [...frames].sort((a, b) => a.zIndex - b.zIndex);
  return ordered.map((frame, index) => ({ ...frame, zIndex: index }));
}

export function normalizeV2LayerZIndices(layout: LayoutV2PageLayout): LayoutV2PageLayout {
  return updateV2PageLayout(layout, (pages) => pages.map((page) => {
    const frames = V2_LAYERS.flatMap((layer) => normalizeScope(page.frames.filter((frame) => frame.layer === layer)));
    return {
      ...page,
      frames: frames.map((frame) => isV2ChildContainer(frame) && frame.children
        ? { ...frame, children: V2_LAYERS.flatMap((layer) => normalizeScope(frame.children?.filter((child) => child.layer === layer) ?? [])) }
        : frame),
    };
  }));
}

function updateScopedFrames(
  frames: LayoutV2Frame[],
  frameId: string,
  action: V2ArrangeAction,
): LayoutV2Frame[] {
  const target = frames.find((frame) => frame.id === frameId);
  if (!target) return frames;
  const sameLayer = frames.filter((frame) => frame.layer === target.layer).sort((a, b) => a.zIndex - b.zIndex);
  const index = sameLayer.findIndex((frame) => frame.id === frameId);
  if (index < 0) return frames;
  const nextIndex = action === "FRONT" ? sameLayer.length - 1
    : action === "BACK" ? 0
      : Math.max(0, Math.min(sameLayer.length - 1, index + (action === "FORWARD" ? 1 : -1)));
  const reordered = [...sameLayer];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, moved);
  const zById = new Map(reordered.map((frame, zIndex) => [frame.id, zIndex]));
  return frames.map((frame) => zById.has(frame.id) ? { ...frame, zIndex: zById.get(frame.id) ?? frame.zIndex } : frame);
}

export function arrangeV2Frame(
  layout: LayoutV2PageLayout,
  pageId: string,
  frameId: string,
  action: V2ArrangeAction,
): LayoutV2PageLayout {
  return normalizeV2LayerZIndices(updateV2PageLayout(layout, (pages) => pages.map((page) => {
    if (page.id !== pageId) return page;
    const top = page.frames.find((frame) => frame.id === frameId);
    if (top) return { ...page, frames: updateScopedFrames(page.frames, frameId, action) };
    return {
      ...page,
      frames: page.frames.map((frame) => isV2ChildContainer(frame) && frame.children?.some((child) => child.id === frameId)
        ? { ...frame, children: updateScopedFrames(frame.children, frameId, action) }
        : frame),
    };
  })));
}

export function updateV2FrameLayer(
  layout: LayoutV2PageLayout,
  pageId: string,
  frameId: string,
  layer: LayoutV2Layer,
): LayoutV2PageLayout {
  const frame = getV2Frame(layout, pageId, frameId);
  if (!frame) return layout;
  const next = updateV2PageLayout(layout, (pages) => pages.map((page) => page.id !== pageId ? page : {
    ...page,
    frames: page.frames.map((entry) => entry.id === frameId
      ? { ...entry, layer }
      : isV2ChildContainer(entry) && entry.children
        ? { ...entry, children: entry.children.map((child) => child.id === frameId ? { ...child, layer } : child) }
        : entry),
  }));
  return normalizeV2LayerZIndices(next);
}

export function moveV2FlowFrame(layout: LayoutV2PageLayout, pageId: string, frameId: string, direction: -1 | 1): LayoutV2PageLayout {
  return updateV2PageLayout(layout, (pages) => pages.map((page) => {
    if (page.id !== pageId) return page;
    const flow = page.frames.filter((frame) => frame.layoutMode === "FLOW" || frame.layoutMode === "INLINE").sort((a, b) => a.readingOrder - b.readingOrder);
    const index = flow.findIndex((frame) => frame.id === frameId);
    if (index < 0) return page;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= flow.length) return page;
    [flow[index], flow[nextIndex]] = [flow[nextIndex], flow[index]];
    const orderById = new Map(flow.map((frame, order) => [frame.id, order]));
    return { ...page, frames: page.frames.map((frame) => orderById.has(frame.id) ? { ...frame, readingOrder: orderById.get(frame.id) ?? frame.readingOrder } : frame) };
  }));
}

export function moveV2FrameToContainer(layout: LayoutV2PageLayout, pageId: string, frameId: string, containerId: string): LayoutV2PageLayout {
  const page = layout.pages.find((entry) => entry.id === pageId);
  const source = page?.frames.find((frame) => frame.id === frameId);
  const container = page?.frames.find((frame) => frame.id === containerId && isV2ChildContainer(frame));
  if (!page || !source || !container || !V2_CHILD_FRAME_TYPES.includes(source.type as LayoutV2ChildFrameType)) return layout;
  const local = clampV2FrameGeometry({ ...source, x: source.x - container.x, y: source.y - container.y }, container.width, container.height);
  const child = { ...source, ...local, parentId: container.id };
  return normalizeV2LayerZIndices(updateV2PageLayout(layout, (pages) => pages.map((entry) => entry.id !== pageId ? entry : {
    ...entry,
    frames: entry.frames.filter((frame) => frame.id !== frameId).map((frame) => frame.id === containerId ? { ...frame, children: [...(frame.children ?? []), child] } : frame),
  })));
}

export function moveV2ChildToPage(layout: LayoutV2PageLayout, pageId: string, containerId: string, childId: string): LayoutV2PageLayout {
  const page = layout.pages.find((entry) => entry.id === pageId);
  const container = page?.frames.find((frame) => frame.id === containerId && isV2ChildContainer(frame));
  const child = container?.children?.find((entry) => entry.id === childId);
  if (!page || !container || !child) return layout;
  const geometry = clampV2FrameGeometry({ ...child, x: container.x + child.x, y: container.y + child.y }, page.width, page.height);
  const topLevel = { ...child, ...geometry, parentId: undefined };
  return normalizeV2LayerZIndices(updateV2PageLayout(layout, (pages) => pages.map((entry) => entry.id !== pageId ? entry : {
    ...entry,
    frames: [...entry.frames.map((frame) => frame.id === containerId ? { ...frame, children: frame.children?.filter((entry) => entry.id !== childId) } : frame), topLevel],
  })));
}

export function duplicateV2Frame(layout: LayoutV2PageLayout, pageId: string, frameId: string): LayoutV2PageLayout {
  const page = layout.pages.find((entry) => entry.id === pageId);
  const source = page?.frames.find((frame) => frame.id === frameId);
  if (!page || !source) return layout;
  const duplicateChildren = source.children?.map((child, index) => ({ ...child, id: generatedId(`child_${source.id}`, index), parentId: undefined }))
    .map((child) => ({ ...child, parentId: undefined })) as LayoutV2Frame[] | undefined;
  const duplicate = { ...source, id: generatedId(`frame_${pageId}`, page.frames.length), x: Math.min(page.width - source.width, source.x + 16), y: Math.min(page.height - source.height, source.y + 16), children: duplicateChildren?.map((child) => ({ ...child, parentId: undefined })) };
  return normalizeV2LayerZIndices(updateV2PageLayout(layout, (pages) => pages.map((entry) => entry.id === pageId ? { ...entry, frames: [...entry.frames, duplicate] } : entry)));
}

export function deleteV2Frame(layout: LayoutV2PageLayout, pageId: string, frameId: string): LayoutV2PageLayout {
  return updateV2PageLayout(layout, (pages) => pages.map((page) => page.id !== pageId ? page : {
    ...page,
    frames: page.frames.filter((frame) => frame.id !== frameId).map((frame) => isV2ChildContainer(frame) && frame.children?.some((child) => child.id === frameId)
      ? { ...frame, children: frame.children.filter((child) => child.id !== frameId) }
      : frame),
  }));
}
export function addV2Page(layout: LayoutV2PageLayout): LayoutV2PageLayout {
  const page = {
    id: generatedId("page", layout.pages.length),
    order: layout.pages.length,
    width: layout.pageSize.width,
    height: layout.pageSize.height,
    unit: layout.pageSize.unit,
    frames: [],
  } satisfies LayoutV2Page;
  return updateV2PageLayout(layout, (pages) => [...pages, page]);
}

export function deleteV2Page(layout: LayoutV2PageLayout, pageId: string): LayoutV2PageLayout {
  if (layout.pages.length <= 1 || !layout.pages.some((page) => page.id === pageId)) return layout;
  return {
    ...layout,
    pages: layout.pages.filter((page) => page.id !== pageId).map((page, order) => ({ ...page, order })),
  };
}

export function isV2PagePopulated(page: LayoutV2Page) {
  return page.frames.some((frame) => {
    if (!isV2MainFlowFrame(frame)) return true;
    if (frame.children?.length) return true;
    if (typeof frame.payload === "string") return frame.payload.trim().length > 0;
    return Boolean(frame.contentRef?.blockId || frame.contentRef?.resourceId || frame.resourceId);
  });
}

export function setV2PageVisualMode(layout: LayoutV2PageLayout, pageId: string, visualMode: LayoutV2VisualMode): LayoutV2PageLayout {
  return updateV2PageLayout(layout, (pages) => pages.map((page) => {
    if (page.id !== pageId) return page;
    const frames = page.frames.map((frame) => ({
      ...frame,
      ...(visualMode === "EXACT_REPLICA" ? { renderMode: "SEMANTIC_ONLY" as const } : { renderMode: undefined }),
      children: frame.children?.map((child) => ({
        ...child,
        ...(visualMode === "EXACT_REPLICA" ? { renderMode: "SEMANTIC_ONLY" as const } : { renderMode: undefined }),
      })),
    }));
    return { ...page, visualMode, frames };
  }));
}
export function reorderV2Page(layout: LayoutV2PageLayout, pageId: string, direction: -1 | 1): LayoutV2PageLayout {
  const index = layout.pages.findIndex((page) => page.id === pageId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= layout.pages.length) return layout;
  const pages = [...layout.pages];
  [pages[index], pages[nextIndex]] = [pages[nextIndex], pages[index]];
  return updateV2PageLayout(layout, () => pages);
}

export function addV2FrameToPage(
  layout: LayoutV2PageLayout,
  pageId: string,
  frame: LayoutV2Frame,
): LayoutV2PageLayout {
  return updateV2PageLayout(layout, (pages) => pages.map((page) => page.id === pageId
    ? { ...page, frames: [...page.frames, { ...frame, pageId }] }
    : page));
}

export function getContentLayoutVersion(value: Pick<ContentDocument, "layoutVersion" | "pageLayout"> | unknown): LayoutVersion {
  if (!isRecord(value)) return 1;
  return value.layoutVersion === 2 ? 2 : 1;
}

export function isLayoutV2Document(value: Pick<ContentDocument, "layoutVersion" | "pageLayout"> | unknown): boolean {
  return getContentLayoutVersion(value) === 2;
}

export function adoptLayoutV2(document: ContentDocument, pageLayout?: LayoutV2PageLayout): ContentDocument {
  const adopted = pageLayout
    ? normalizePageLayoutV2(pageLayout, { createMissingIds: true }) ?? createV2PageLayout()
    : createV2PageLayout();
  return {
    ...document,
    layoutVersion: 2,
    pageLayout: adopted,
  };
}
