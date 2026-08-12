import {
  clampV2FrameGeometry,
  isV2MainFlowFrame,
  type LayoutV2Frame,
  type LayoutV2FrameGeometry,
  type LayoutV2FrameType,
} from "./content-layout-v2";

export type V2TextLayoutSpan = {
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
};
export type V2TextLayoutLine = {
  text: string;
  start: number;
  end: number;
  x: number;
  width: number;
  y: number;
  height: number;
};

export type V2TextLayoutResult = {
  lines: V2TextLayoutLine[];
  contentHeight: number;
  availableHeight: number;
  desiredHeight: number;
  overset: boolean;
  exclusions: LayoutV2Frame[];
};

export type V2TextFramePatch = LayoutV2FrameGeometry & { overset: boolean };

const TEXT_PADDING = 12;
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_LINE_HEIGHT = 1.4;
const DEFAULT_WRAP_PADDING = 8;
const MIN_TEXT_FRAME_HEIGHT = 48;
const MAX_TEXT_LAYOUT_LINES = 512;
const WRAP_TYPES: LayoutV2FrameType[] = ["IMAGE", "SHAPE", "EDUCATIONAL", "TABLE", "VIDEO"];

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function textWidth(text: string, fontSize: number, letterSpacing: number) {
  return Array.from(text).reduce(
    (width, character) => width + (character === "\t" ? fontSize * 2 : fontSize * (character === " " ? 0.28 : 0.52)) + letterSpacing,
    0,
  );
}

function isWrapExclusion(frame: LayoutV2Frame) {
  return WRAP_TYPES.includes(frame.type) &&
    !frame.hidden &&
    frame.layer !== "BACKGROUND" &&
    (frame.layoutMode === "FLOAT" || frame.layoutMode === "ABSOLUTE") &&
    frame.wrapMode !== "NONE" &&
    frame.wrapMode !== "INLINE" &&
    frame.wrapMode !== "BEHIND_TEXT" &&
    frame.wrapMode !== "IN_FRONT_OF_TEXT";
}

function intersects(a: LayoutV2Frame, b: LayoutV2Frame, padding: number) {
  return a.x < b.x + b.width + padding &&
    a.x + a.width > b.x - padding &&
    a.y < b.y + b.height + padding &&
    a.y + a.height > b.y - padding;
}

export function getV2TextWrapExclusions(textFrame: LayoutV2Frame, frames: LayoutV2Frame[]) {
  return frames.filter((frame) => frame.id !== textFrame.id && isWrapExclusion(frame) && intersects(textFrame, frame, frame.wrapPadding ?? DEFAULT_WRAP_PADDING));
}

function availableLineBox(textFrame: LayoutV2Frame, y: number, lineHeight: number, exclusions: LayoutV2Frame[]) {
  const left = textFrame.x + TEXT_PADDING;
  const right = textFrame.x + textFrame.width - TEXT_PADDING;
  const active = exclusions.filter((frame) => y < frame.y + frame.height && y + lineHeight > frame.y);
  if (!active.length) return { x: left, width: Math.max(1, right - left) };

  const candidates: Array<{ x: number; width: number }> = [];
  for (const exclusion of active) {
    const padding = exclusion.wrapPadding ?? DEFAULT_WRAP_PADDING;
    const exclusionLeft = exclusion.x - padding;
    const exclusionRight = exclusion.x + exclusion.width + padding;
    if (exclusion.wrapMode === "WRAP_LEFT") {
      candidates.push({ x: left, width: Math.max(1, Math.min(right, exclusionLeft) - left) });
    } else if (exclusion.wrapMode === "WRAP_RIGHT") {
      candidates.push({ x: Math.max(left, exclusionRight), width: Math.max(1, right - Math.max(left, exclusionRight)) });
    } else if (exclusion.wrapMode === "WRAP_BOTH") {
      candidates.push({ x: left, width: Math.max(1, Math.min(right, exclusionLeft) - left) });
      candidates.push({ x: Math.max(left, exclusionRight), width: Math.max(1, right - Math.max(left, exclusionRight)) });
    }
  }
  return candidates.sort((a, b) => b.width - a.width)[0] ?? { x: left, width: Math.max(1, right - left) };
}

export function layoutV2TextFrame(
  textFrame: LayoutV2Frame,
  text: string,
  frames: LayoutV2Frame[] = [],
): V2TextLayoutResult {
  const fontSize = Math.max(8, finite(textFrame.fontSize, DEFAULT_FONT_SIZE));
  const lineHeight = Math.max(1, finite(textFrame.lineHeight, DEFAULT_LINE_HEIGHT)) * fontSize;
  const letterSpacing = finite(textFrame.letterSpacing, 0);
  const exclusions = getV2TextWrapExclusions(textFrame, frames);
  const lines: V2TextLayoutLine[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  let sourceOffset = 0;
  let truncated = false;

  for (const paragraph of paragraphs) {
    if (lines.length >= MAX_TEXT_LAYOUT_LINES) { truncated = true; break; }
    let remaining = paragraph;
    let lineOffset = sourceOffset;
    do {
      if (lines.length >= MAX_TEXT_LAYOUT_LINES) { truncated = true; break; }      const y = TEXT_PADDING + lines.length * lineHeight;
      const box = availableLineBox(textFrame, textFrame.y + y, lineHeight, exclusions);
      if (!remaining) {
        lines.push({ text: "", start: lineOffset, end: lineOffset, x: box.x, width: box.width, y, height: lineHeight });
        break;
      }
      const candidate = fitTextToWidth(remaining, box.width, fontSize, letterSpacing);
      const consumed = candidate.length || Math.min(remaining.length, 1);
      const lineText = remaining.slice(0, consumed).replace(/\s+$/, "");
      const actualConsumed = Math.max(consumed, lineText.length);
      lines.push({ text: lineText, start: lineOffset, end: lineOffset + actualConsumed, x: box.x, width: box.width, y, height: lineHeight });
      remaining = remaining.slice(actualConsumed).replace(/^\s+/, "");
      lineOffset = sourceOffset + paragraph.length - remaining.length;
    } while (remaining.length > 0);
    sourceOffset += paragraph.length + 1;
  }

  const contentHeight = lines.length * lineHeight;
  const availableHeight = Math.max(0, textFrame.height - TEXT_PADDING * 2);
  const desiredHeight = Math.max(MIN_TEXT_FRAME_HEIGHT, contentHeight + TEXT_PADDING * 2);
  return {
    lines,
    contentHeight,
    availableHeight,
    desiredHeight,
    overset: truncated || contentHeight > availableHeight + 0.01,
    exclusions,
  };
}

function fitTextToWidth(remaining: string, width: number, fontSize: number, letterSpacing: number) {
  const averageCharacterWidth = Math.max(1, fontSize * 0.52 + letterSpacing);
  const sampleLength = Math.max(1, Math.ceil(width / averageCharacterWidth) * 2 + 1);
  let candidate = remaining.slice(0, sampleLength);
  while (candidate.length > 1 && textWidth(candidate, fontSize, letterSpacing) > width) {
    const lastSpace = candidate.lastIndexOf(" ");
    candidate = lastSpace > 0 ? candidate.slice(0, lastSpace) : Array.from(candidate).slice(0, -1).join("");
  }
  return candidate || remaining.slice(0, 1);
}
export function getV2TextFramePatch(
  textFrame: LayoutV2Frame,
  text: string,
  frames: LayoutV2Frame[],
  pageWidth: number,
  pageHeight: number,
): V2TextFramePatch {
  const result = layoutV2TextFrame(textFrame, text, frames);
  const nextHeight = textFrame.heightMode === "AUTO"
    ? Math.min(Math.max(MIN_TEXT_FRAME_HEIGHT, result.desiredHeight), Math.max(MIN_TEXT_FRAME_HEIGHT, pageHeight - textFrame.y))
    : textFrame.height;
  const geometry = clampV2FrameGeometry({ ...textFrame, height: nextHeight }, pageWidth, pageHeight);
  const pageLimited = textFrame.heightMode === "AUTO" && result.desiredHeight > pageHeight - textFrame.y;
  return { ...geometry, overset: result.overset || pageLimited };
}

export function isV2InlineFrame(frame: LayoutV2Frame) {
  return frame.layoutMode === "INLINE";
}

export function getV2InlineFrameGeometry(
  frame: LayoutV2Frame,
  frames: LayoutV2Frame[],
  pageWidth: number,
  pageHeight: number,
): LayoutV2FrameGeometry {
  if (!isV2InlineFrame(frame)) return clampV2FrameGeometry(frame, pageWidth, pageHeight);
  if (frames.some((entry) => isV2MainFlowFrame(entry) && entry.readingOrder < frame.readingOrder)) {
    return clampV2FrameGeometry(frame, pageWidth, pageHeight);
  }
  const previousText = frames
    .filter((entry) => entry.type === "TEXT" && entry.readingOrder < frame.readingOrder)
    .sort((a, b) => b.readingOrder - a.readingOrder)[0];
  return clampV2FrameGeometry({
    ...frame,
    x: previousText?.x ?? 12,
    y: (previousText?.y ?? 12) + (previousText?.height ?? 0) + (frame.wrapPadding ?? DEFAULT_WRAP_PADDING),
  }, pageWidth, pageHeight);
}

export function isV2NonWrappingLayer(frame: LayoutV2Frame) {
  return frame.layer === "BACKGROUND" || frame.wrapMode === "BEHIND_TEXT" || frame.wrapMode === "IN_FRONT_OF_TEXT";
}
