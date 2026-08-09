import {
  isActivityBlock,
  isExerciseBlock,
  isInfoBoxBlock,
  isListBlock,
  isSequenceBlock,
  isTableBlock,
  isTextBlock,
  isWorksheetBlock,
  normalizeContentDocument,
  richTextSpansToText,
  type ContentBlock,
  type ContentDocument,
} from "@/lib/content-document";
import type {
  LayoutV2Frame,
  LayoutV2Page,
  LayoutV2PageNarration,
} from "@/lib/content-layout-v2";

export type NarrationAudience = "STUDENT" | "TEACHER" | "ADMIN_PREVIEW";
export type NarrationStatus = "READY" | "NEEDS_REGENERATION" | "UNAVAILABLE" | "BROWSER_TTS_FALLBACK";

export type NarrationSegment = {
  id: string;
  pageId: string;
  frameId: string;
  childFrameId?: string;
  readingOrder: number;
  text: string;
  language: string;
  narrationLabel?: string;
  sourceHash: string;
  audioResourceId?: string;
  startMs?: number;
  endMs?: number;
};

export type NarrationPage = {
  pageId: string;
  order: number;
  sourceHash: string;
  language?: string;
  segments: NarrationSegment[];
  audioResourceId?: string;
};

export type BookNarrationManifest = {
  version: 1;
  audience: NarrationAudience;
  sourceHash: string;
  pages: NarrationPage[];
  segments: NarrationSegment[];
};

type BuildOptions = {
  scopeId?: string;
  defaultLanguage?: string;
  provider?: string;
  providerVersion?: string;
  voice?: string;
};

type SemanticUnit = {
  text: string;
  label?: string;
};

const DEFAULT_LANGUAGE = "en";
const DECORATIVE_LINE = /^[\s.*_=-]+$/u;

function emptyManifest(audience: NarrationAudience): BookNarrationManifest {
  return { version: 1, audience, sourceHash: hashText("empty"), pages: [], segments: [] };
}
export function buildV2NarrationManifest(
  document: ContentDocument,
  audience: NarrationAudience,
  options: BuildOptions = {},
): BookNarrationManifest {
  const normalized = normalizeContentDocument(document);
  const layout = normalized.pageLayout;
  if (!layout) return emptyManifest(audience);

  const blocksById = new Map(normalized.blocks.map((block) => [block.id, block]));
  const pages = [...layout.pages]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((page) => buildPageManifest(page, blocksById, audience, options));

  const segments = pages.flatMap((page) => page.segments);
  return {
    version: 1,
    audience,
    sourceHash: hashNarrationSource({
      text: segments.map((segment) => segment.text).join("\n"),
      language: segments.map((segment) => segment.language).join("|") || options.defaultLanguage || DEFAULT_LANGUAGE,
      provider: options.provider,
      providerVersion: options.providerVersion,
      voice: options.voice,
    }),
    pages,
    segments,
  };
}

export function mergeV2NarrationManifests(manifests: BookNarrationManifest[], audience: NarrationAudience): BookNarrationManifest {
  const pages = manifests.flatMap((manifest) => manifest.pages);
  const segments = pages.flatMap((page) => page.segments);
  return {
    version: 1,
    audience,
    sourceHash: hashNarrationSource({
      text: segments.map((segment) => segment.text).join("\n"),
      language: segments.map((segment) => segment.language).join("|") || DEFAULT_LANGUAGE,
    }),
    pages,
    segments,
  };
}

function buildPageManifest(
  page: LayoutV2Page,
  blocksById: Map<string, ContentBlock>,
  audience: NarrationAudience,
  options: BuildOptions,
): NarrationPage {
  const segments = sortFrames(page.frames)
    .flatMap((frame) => collectFrameSegments(frame, page, blocksById, audience, options))
    .map((segment) => attachNarrationMetadata(segment, page.narration));
  return {
    pageId: page.id,
    order: page.order,
    language: segments[0]?.language,
    sourceHash: hashNarrationSource({
      text: segments.map((segment) => segment.text).join("\n"),
      language: segments.map((segment) => segment.language).join("|") || options.defaultLanguage || DEFAULT_LANGUAGE,
      provider: options.provider,
      providerVersion: options.providerVersion,
      voice: options.voice,
    }),
    segments,
    audioResourceId: page.narration?.resourceId,
  };
}

function collectFrameSegments(
  frame: LayoutV2Frame,
  page: LayoutV2Page,
  blocksById: Map<string, ContentBlock>,
  audience: NarrationAudience,
  options: BuildOptions,
  childFrameId?: string,
): NarrationSegment[] {
  if (frame.hidden || frame.audioAllowed === false || !isFrameAudienceAllowed(frame, audience)) return [];

  const block = frame.contentRef?.blockId ? blocksById.get(frame.contentRef.blockId) : undefined;
  const units = frame.type === "EDUCATIONAL"
    ? frame.readable ? extractContainerUnits(frame, block, audience) : []
    : frame.readable ? extractFrameUnits(frame, block, audience) : [];

  const language = frame.language?.trim() || options.defaultLanguage || "en";
  const ownSegments = units.flatMap((unit, unitIndex) => splitNarrationText(unit.text, language).map((text, sentenceIndex) => {
    const segmentSourceHash = hashNarrationSource({
      text,
      language,
      provider: options.provider,
      providerVersion: options.providerVersion,
      voice: options.voice,
    });
    const identity = [options.scopeId || "document", page.id, frame.id, childFrameId || "root", unitIndex, sentenceIndex, segmentSourceHash].join(":");
    return {
      id: "v2n-" + hashText(identity),
      pageId: page.id,
      frameId: frame.id,
      ...(childFrameId ? { childFrameId } : {}),
      readingOrder: frame.readingOrder,
      text,
      language,
      ...(unit.label ? { narrationLabel: unit.label } : frame.narrationLabel ? { narrationLabel: frame.narrationLabel } : {}),
      sourceHash: segmentSourceHash,
    };
  }));

  const childSegments = frame.type === "EDUCATIONAL"
    ? sortFrames(frame.children ?? []).flatMap((child) => collectFrameSegments(child, page, blocksById, audience, options, child.id))
    : [];
  return [...ownSegments, ...childSegments];
}

function extractContainerUnits(frame: LayoutV2Frame, block: ContentBlock | undefined, audience: NarrationAudience): SemanticUnit[] {
  const units: SemanticUnit[] = [];
  const payload = record(frame.payload);
  const title = textValue(payload.title);
  const body = textValue(payload.body) || textValue(payload.text);
  if (title) units.push({ text: title, label: frame.narrationLabel });
  if (body) units.push({ text: body, label: frame.narrationLabel });
  if (block) units.push(...extractBlockUnits(block, audience));
  return dedupeUnits(units);
}

function extractFrameUnits(frame: LayoutV2Frame, block: ContentBlock | undefined, audience: NarrationAudience): SemanticUnit[] {
  if (frame.type === "IMAGE") {
    const label = cleanText(frame.altText || frame.narrationLabel || (block && "alt" in block ? block.alt : ""));
    return label && !/^image$/iu.test(label) ? [{ text: label, label }] : [];
  }
  if (frame.type === "VIDEO") {
    const label = cleanText(frame.narrationLabel || frame.altText || "");
    return label ? [{ text: label, label }] : [];
  }
  if (frame.type === "SHAPE") return [];
  const payload = record(frame.payload);
  const payloadText = typeof frame.payload === "string" ? cleanText(frame.payload) : (textValue(payload.text) || textValue(payload.body));
  const payloadTitle = frame.type === "EDUCATIONAL" ? textValue(payload.title) : "";
  const units: SemanticUnit[] = payloadTitle ? [{ text: payloadTitle, label: frame.narrationLabel }] : [];
  if (payloadText) units.push({ text: payloadText, label: frame.narrationLabel });
  if (block) units.push(...extractBlockUnits(block, audience));
  if (!units.length && frame.narrationLabel && frame.type !== "TABLE") units.push({ text: frame.narrationLabel, label: frame.narrationLabel });
  if (frame.type === "TABLE" && !units.length) {
    const tableRows = Array.isArray(payload.rows) ? payload.rows : [];
    tableRows.forEach((row) => {
      const cells = Array.isArray(row) ? row.map(textValue).filter(Boolean) : [];
      if (cells.length) units.push({ text: cells.join(" | "), label: frame.narrationLabel });
    });
  }
  return dedupeUnits(units);
}

function extractBlockUnits(block: ContentBlock, audience: NarrationAudience): SemanticUnit[] {
  if (isTextBlock(block)) return block.spans?.length ? [{ text: richTextSpansToText(block.spans) }] : [{ text: block.text }];
  if (isListBlock(block)) return block.items.map((item) => ({ text: item })).filter((item) => cleanText(item.text));
  if (isTableBlock(block)) {
    return [
      ...(block.title ? [{ text: block.title, label: block.title }] : []),
      ...block.rows.map((row) => ({ text: row.cells.map((cell) => richTextSpansToText(cell.spans ?? [{ text: cell.text }])).join(" | ") })),
    ];
  }
  if (isSequenceBlock(block)) return [
    ...(block.title ? [{ text: block.title, label: block.title }] : []),
    ...block.items.flatMap((item) => [{ text: [item.title, item.description].filter(Boolean).join(". ") }]),
  ];
  if (isInfoBoxBlock(block)) {
    if (audience === "STUDENT" && block.variant === "teacherTip") return [];
    return [{ text: [block.title, block.text].filter(Boolean).join(". "), label: block.title }];
  }
  if (block.type === "educationalObject") return [{ text: [block.title, block.text].filter(Boolean).join(". "), label: block.title }];
  if (block.type === "formula") return [{ text: block.expression }];
  if (block.type === "observationBox") return [{ text: [block.title, block.text].filter(Boolean).join(". "), label: block.title }];
  if (isActivityBlock(block)) {
    return [
      ...(block.title ? [{ text: block.title, label: block.title }] : []),
      ...block.fields
        .filter((field) => field.visibility?.[audience === "TEACHER" ? "teacher" : "student"] !== false)
        .filter((field) => field.type !== "teacherNote" || audience !== "STUDENT")
        .filter((field) => Boolean(field.text?.trim()))
        .map((field) => ({ text: [field.label, field.text].filter(Boolean).join(": "), label: field.label })),
    ];
  }
  if (isWorksheetBlock(block)) return extractWorksheetUnits(block, audience);
  if (isExerciseBlock(block)) return extractExerciseUnits(block, audience);
  return [];
}

function extractWorksheetUnits(block: Extract<ContentBlock, { type: "worksheet" }>, audience: NarrationAudience): SemanticUnit[] {
  const units: SemanticUnit[] = [];
  if (block.title) units.push({ text: block.title, label: block.title });
  if (block.instructions) units.push({ text: block.instructions, label: "Instructions" });
  for (const question of block.questions) {
    if (question.visibility?.[audience === "TEACHER" ? "teacher" : "student"] === false) continue;
    if (question.instructions) units.push({ text: question.instructions, label: "Instructions" });
    if (question.prompt) units.push({ text: question.prompt, label: "Question" });
    if (question.caseText) units.push({ text: question.caseText, label: "Case" });
    if (question.assertion) units.push({ text: question.assertion, label: "Assertion" });
    if (question.reason) units.push({ text: question.reason, label: "Reason" });
    question.options?.forEach((option) => { if (option.text) units.push({ text: option.text, label: "Option" }); });
    question.subQuestions?.forEach((subQuestion) => { if (subQuestion.prompt) units.push({ text: subQuestion.prompt, label: "Question" }); });
  }
  return units;
}

function extractExerciseUnits(block: Extract<ContentBlock, { type: "exercise" }>, audience: NarrationAudience): SemanticUnit[] {
  const units: SemanticUnit[] = [];
  if (block.title) units.push({ text: block.title, label: block.title });
  if (block.introduction) units.push({ text: block.introduction });
  if (block.instructions) units.push({ text: block.instructions, label: "Instructions" });
  for (const group of block.groups) {
    if (group.title) units.push({ text: group.title, label: group.title });
  }
  const questions = [...block.questions, ...block.groups.flatMap((group) => group.questions)];
  for (const question of questions) {
    if (question.visibility?.[audience === "TEACHER" ? "teacher" : "student"] === false) continue;
    if ("instructions" in question && question.instructions) units.push({ text: question.instructions, label: "Instructions" });
    if ("prompt" in question && question.prompt) units.push({ text: question.prompt, label: "Question" });
    if ("caseText" in question && question.caseText) units.push({ text: question.caseText, label: "Case" });
    if ("assertion" in question && question.assertion) units.push({ text: question.assertion, label: "Assertion" });
    if ("reason" in question && question.reason) units.push({ text: question.reason, label: "Reason" });
    if ("options" in question) question.options?.forEach((option) => { if (option.text) units.push({ text: option.text, label: "Option" }); });
    if ("subQuestions" in question) question.subQuestions?.forEach((subQuestion) => { if (subQuestion.prompt) units.push({ text: subQuestion.prompt, label: "Question" }); });
  }
  return units;
}

function attachNarrationMetadata(segment: NarrationSegment, narration: LayoutV2PageNarration | undefined): NarrationSegment {
  const metadata = narration?.segments?.find((entry) => entry.id === segment.id && entry.sourceHash === segment.sourceHash);
  return {
    ...segment,
    ...(metadata?.resourceId ? { audioResourceId: metadata.resourceId } : {}),
    ...(metadata?.startMs !== undefined ? { startMs: metadata.startMs } : {}),
    ...(metadata?.endMs !== undefined ? { endMs: metadata.endMs } : {}),
  };
}

function isFrameAudienceAllowed(frame: LayoutV2Frame, audience: NarrationAudience) {
  if (audience === "STUDENT" && frame.audience === "TEACHER") return false;
  if (audience === "TEACHER" && frame.audience === "STUDENT") return false;
  return true;
}

function sortFrames(frames: LayoutV2Frame[]) {
  return [...frames].sort((left, right) => left.readingOrder - right.readingOrder || left.id.localeCompare(right.id));
}

function splitNarrationText(value: string, language: string) {
  const cleaned = cleanText(value);
  if (!cleaned || DECORATIVE_LINE.test(cleaned)) return [];
  const paragraphs = cleaned.split(/\n+/u).map((paragraph) => paragraph.trim()).filter(Boolean);
  const segments: string[] = [];
  for (const paragraph of paragraphs) {
    const sentenceParts = sentenceSegments(paragraph, language);
    segments.push(...(sentenceParts.length ? sentenceParts : [paragraph]));
  }
  return segments;
}

function sentenceSegments(value: string, language: string) {
  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (locale?: string | string[], options?: { granularity: "sentence" }) => { segment(input: string): Iterable<{ segment: string }> };
  };
  if (IntlWithSegmenter.Segmenter) {
    try {
      return Array.from(new IntlWithSegmenter.Segmenter(language || DEFAULT_LANGUAGE, { granularity: "sentence" }).segment(value))
        .map((entry) => cleanText(entry.segment))
        .filter(Boolean);
    } catch {
      // Unsupported locale: use the conservative fallback below.
    }
  }
  return value.split(/(?<=[.!?。！？])\s+/u).map((entry) => cleanText(entry)).filter(Boolean);
}

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim()).filter((line) => !DECORATIVE_LINE.test(line)).join("\n").trim()
    : "";
}

function dedupeUnits(units: SemanticUnit[]) {
  const seen = new Set<string>();
  return units.filter((unit) => {
    const text = cleanText(unit.text);
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  }).map((unit) => ({ ...unit, text: cleanText(unit.text) }));
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? cleanText(value) : "";
}

function attachableNarrationResourceIds(manifest: BookNarrationManifest) {
  return manifest.pages.flatMap((page) => page.audioResourceId ? [page.audioResourceId] : page.segments.flatMap((segment) => segment.audioResourceId ? [segment.audioResourceId] : []));
}

export function getNarrationStatus(page: LayoutV2Page, pageManifest: NarrationPage): NarrationStatus {
  if (!pageManifest.segments.length) return "UNAVAILABLE";
  const narration = page.narration;
  if (!narration) return "BROWSER_TTS_FALLBACK";
  if (narration.sourceHash !== pageManifest.sourceHash) return "NEEDS_REGENERATION";
  const hasCachedAudio = Boolean(narration.resourceId) || pageManifest.segments.some((segment) => segment.audioResourceId);
  return hasCachedAudio ? "READY" : "BROWSER_TTS_FALLBACK";
}

export function hashNarrationSource(input: { text: string; language: string; voice?: string; provider?: string; providerVersion?: string }) {
  return hashText(stableSerialize({
    text: cleanText(input.text),
    language: input.language || DEFAULT_LANGUAGE,
    voice: input.voice || "",
    provider: input.provider || "",
    providerVersion: input.providerVersion || "",
  }));
}

export function hashText(value: string) {
  let left = 2166136261;
  let right = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 16777619);
    right = Math.imul(right ^ (code + index), 2246822519);
  }
  return (left >>> 0).toString(16).padStart(8, "0") + (right >>> 0).toString(16).padStart(8, "0");
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key])).join(",") + "}";
}

export { attachableNarrationResourceIds };