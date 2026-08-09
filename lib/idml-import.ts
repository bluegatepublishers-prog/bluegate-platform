import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

import {
  adoptLayoutV2,
  createV2Frame,
  type LayoutV2Frame,
  type LayoutV2Page,
  type LayoutV2VisualMode,
} from "@/lib/content-layout-v2";
import { createContentDocument, createTableBlock, type ContentBlock, type ContentDocument } from "@/lib/content-document";

export const IDML_LIMITS = {
  maxPackageBytes: 100 * 1024 * 1024,
  maxEntries: 10_000,
  maxUncompressedBytes: 500 * 1024 * 1024,
  maxEntryBytes: 50 * 1024 * 1024,
  maxXmlBytes: 25 * 1024 * 1024,
  maxXmlNodes: 500_000,
  maxXmlDepth: 128,
  maxPreviewAssetBytes: 512 * 1024,
  maxReferencePageCount: 1_000,
  maxReferenceVisualBytes: 50 * 1024 * 1024,
} as const;

export type IdmlDiagnosticSeverity = "INFO" | "WARNING" | "ERROR";

export type IdmlDiagnostic = {
  severity: IdmlDiagnosticSeverity;
  pageId?: string;
  pageNumber?: number;
  objectType?: string;
  message: string;
  suggestedAction?: string;
};

export type IdmlFidelity = {
  level: "LOW" | "MEDIUM" | "HIGH";
  recommendation: "EDITABLE" | "EXACT_REPLICA";
  reasons: string[];
  referenceAvailable: boolean;
};

export type IdmlReferenceVisual = {
  sourceKind: "PDF" | "PAGE_IMAGE";
  sourcePath: string;
  fileName: string;
  pageIndex: number;
  sourcePageNumber?: number;
  intrinsicWidth: number;
  intrinsicHeight: number;
  contentType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  bytes: number;
  sourceHash: string;
  supported: boolean;
  previewDataUrl?: string;
  data?: Uint8Array;
};
export type IdmlAsset = {
  sourcePath: string;
  entryPath: string | null;
  fileName: string;
  contentType: string | null;
  bytes: number;
  supported: boolean;
  previewDataUrl?: string;
  data?: Uint8Array;
};

export type IdmlIntermediateFrame = {
  id: string;
  pageId: string;
  type: "TEXT" | "IMAGE" | "SHAPE" | "TABLE";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layerName: string;
  zIndex: number;
  readingOrder: number;
  text?: string;
  textSpans?: Array<{ text: string; marks?: Array<"bold" | "italic" | "underline" | "superscript" | "subscript">; fontSize?: number; color?: string }>;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
  alignment?: "left" | "center" | "right";
  direction?: "LTR" | "RTL" | "AUTO";
  fill?: string;
  border?: string;
  borderWidth?: number;
  asset?: IdmlAsset;
  table?: string[][];
  sourceLabel?: string;
  altText?: string;
};

export type IdmlPage = {
  id: string;
  sourceId: string;
  order: number;
  width: number;
  height: number;
  left: number;
  top: number;
  frames: IdmlIntermediateFrame[];
  fidelity?: IdmlFidelity;
  referenceVisual?: IdmlReferenceVisual;
};

export type IdmlStory = {
  id: string;
  text: string;
  spans: IdmlIntermediateFrame["textSpans"];
};

export type IdmlDocument = {
  pages: IdmlPage[];
  stories: IdmlStory[];
  assets: IdmlAsset[];
  referenceVisuals: IdmlReferenceVisual[];
  diagnostics: IdmlDiagnostic[];
  source: "IDML";
};

export type IdmlAnalysis = {
  document: ContentDocument;
  intermediate: IdmlDocument;
  diagnostics: IdmlDiagnostic[];
  previewResourceUrls: Record<string, string>;
  assets: Array<Omit<IdmlAsset, "data">>;
  referenceVisuals: Array<Omit<IdmlReferenceVisual, "data">>;
  pageRecommendations: Array<{ pageId: string; pageNumber: number; level: IdmlFidelity["level"]; recommendation: IdmlFidelity["recommendation"]; reasons: string[]; referenceAvailable: boolean }>;
  summary: {
    pagesDetected: number;
    pagesImportable: number;
    textFrames: number;
    imageFrames: number;
    tables: number;
    shapes: number;
    missingLinks: number;
    unsupportedObjects: number;
    fontSubstitutions: number;
    warnings: number;
    errors: number;
    editableRecommended: number;
    reviewRecommended: number;
    exactRecommended: number;
    missingReferenceVisuals: number;
    advancedEffects: number;
  };
  sourceHash: string;
};

type ZipEntry = {
  path: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  externalAttributes: number;
};

type XmlNode = {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
};

type PackageReader = {
  entries: Map<string, ZipEntry>;
  read(path: string): Uint8Array;
};

export function analyzeIdmlPackage(input: Uint8Array, fileName = "package.zip"): IdmlAnalysis {
  const sourceHash = stableHash(input);
  const diagnostics: IdmlDiagnostic[] = [];
  if (fileName.toLowerCase().endsWith(".indd")) {
    throw new IdmlImportError("Please export/package the document with IDML and linked assets.");
  }
  const reader = createPackageReader(input, diagnostics);
  const idmlPath = findEntry(reader.entries, (path) => path.toLowerCase().endsWith(".idml"));
  if (!idmlPath) throw new IdmlImportError("The package must contain an IDML file.");
  const xmlFiles = new Map<string, XmlNode>();
  let firstXmlError: Error | null = null;
  for (const entry of reader.entries.values()) {
    if (!entry.path.toLowerCase().endsWith(".xml") && !entry.path.toLowerCase().endsWith(".idml")) continue;
    if (entry.uncompressedSize > IDML_LIMITS.maxXmlBytes) {
      diagnostics.push({ severity: "ERROR", objectType: "XML", message: `XML entry exceeds the ${Math.round(IDML_LIMITS.maxXmlBytes / 1024 / 1024)} MB safety limit.`, suggestedAction: "Reduce the package or export a smaller IDML document." });
      continue;
    }
    try {
      const text = decodeUtf8(reader.read(entry.path));
      const parsed = parseSafeXml(text);
      scanUnsafeLinks(parsed, entry.path, diagnostics);
      xmlFiles.set(entry.path, parsed);
    } catch (error) {
      if (!firstXmlError) firstXmlError = error instanceof Error ? error : new IdmlImportError("Malformed XML.");
      diagnostics.push({ severity: "ERROR", objectType: "XML", message: `${entry.path}: ${error instanceof Error ? error.message : "Malformed XML."}` });
    }
  }
  const designMap = xmlFiles.get(idmlPath) ?? xmlFiles.get(findEntry(reader.entries, (path) => path.toLowerCase().endsWith("designmap.xml")) ?? "");
  if (!designMap) throw firstXmlError ?? new IdmlImportError("The IDML design map could not be read.");

  scanUnsupportedFeatures(xmlFiles, diagnostics);
  const stories = parseStories(xmlFiles, diagnostics);
  const pages = parsePages(designMap, xmlFiles, reader, stories, diagnostics);
  if (!pages.length) diagnostics.push({ severity: "ERROR", objectType: "PAGE", message: "No importable pages were found in the IDML package.", suggestedAction: "Check that the package contains valid Spreads and Page elements." });
  const referenceVisuals = collectReferenceVisuals(reader, pages, diagnostics);
  for (const page of pages) {
    page.referenceVisual = referenceVisuals.find((visual) => visual.pageIndex === page.order);
    page.fidelity = analyzePageFidelity(page, diagnostics);
    if (page.fidelity.recommendation === "EXACT_REPLICA" && !page.referenceVisual?.supported) {
      diagnostics.push({ severity: "WARNING", pageId: page.id, pageNumber: page.order + 1, objectType: "REFERENCE_VISUAL", message: "Exact Replica recommended — reference PDF/page image required.", suggestedAction: "Provide a packaged reference PDF or deterministic page PNG/JPEG/WebP, or continue Editable." });
    }
  }
  const intermediate: IdmlDocument = { pages, stories, assets: collectAssets(pages), referenceVisuals, diagnostics, source: "IDML" };
  const document = mapIntermediateToV2(intermediate);
  const previewResourceUrls = createPreviewResourceUrls(intermediate);
  const summary = summarize(intermediate, diagnostics);
  return {
    document,
    intermediate,
    diagnostics,
    previewResourceUrls,
    assets: intermediate.assets.map((asset) => { const { data, ...withoutData } = asset; void data; return withoutData; }),
    referenceVisuals: referenceVisuals.map((visual) => { const { data, ...withoutData } = visual; void data; return withoutData; }),
    pageRecommendations: pages.map((page) => ({ pageId: page.id, pageNumber: page.order + 1, level: page.fidelity?.level ?? "LOW", recommendation: page.fidelity?.recommendation ?? "EDITABLE", reasons: page.fidelity?.reasons ?? [], referenceAvailable: Boolean(page.referenceVisual?.supported) })),
    summary,
    sourceHash,
  };
}

export function mapIntermediateToV2(intermediate: IdmlDocument, pageModes: Record<string, LayoutV2VisualMode> = {}): ContentDocument {
  const blocks: ContentBlock[] = [];
  const pages: LayoutV2Page[] = intermediate.pages.map((page) => {
    const requestedMode = pageModes[page.id] ?? (page.fidelity?.recommendation === "EXACT_REPLICA" ? "EXACT_REPLICA" : "EDITABLE");
    const visualMode: LayoutV2VisualMode = requestedMode === "EXACT_REPLICA" && page.referenceVisual?.supported ? "EXACT_REPLICA" : "EDITABLE";
    const semanticOnly = visualMode === "EXACT_REPLICA";
    const layerState = new Map<string, number>();
    const frames: LayoutV2Frame[] = page.frames.map((sourceFrame) => {
      const layer = mapLayer(sourceFrame.layerName);
      const zIndex = layerState.get(layer) ?? 0;
      layerState.set(layer, zIndex + 1);
      const base = {
        id: sourceFrame.id,
        pageId: page.id,
        x: sourceFrame.x,
        y: sourceFrame.y,
        width: sourceFrame.width,
        height: sourceFrame.height,
        rotation: sourceFrame.rotation,
        layer,
        zIndex,
        readingOrder: sourceFrame.readingOrder,
        readable: sourceFrame.type === "TEXT" || sourceFrame.type === "TABLE" || Boolean(sourceFrame.sourceLabel),
        narrationLabel: sourceFrame.sourceLabel,
        altText: sourceFrame.altText,
        renderMode: semanticOnly ? "SEMANTIC_ONLY" : undefined,
        source: "IDML",
        sourceLabel: sourceFrame.sourceLabel,
      } as Record<string, unknown>;
      if (sourceFrame.type === "TEXT") {
        return createV2Frame("TEXT", page.id, {
          ...base,
          payload: { text: sourceFrame.text ?? "", source: "IDML", sourceLabel: sourceFrame.sourceLabel },
          textSpans: sourceFrame.textSpans,
          fontFamily: sourceFrame.fontFamily,
          fontSize: sourceFrame.fontSize,
          fontWeight: sourceFrame.fontWeight,
          fontStyle: sourceFrame.fontStyle,
          lineHeight: sourceFrame.lineHeight,
          letterSpacing: sourceFrame.letterSpacing,
          alignment: sourceFrame.alignment,
          direction: sourceFrame.direction,
        });
      }
      if (sourceFrame.type === "IMAGE") {
        return createV2Frame("IMAGE", page.id, {
          ...base,
          resourceId: sourceFrame.asset?.supported ? idmlPreviewKey(sourceFrame.asset.sourcePath) : undefined,
          fitMode: "FILL",
          payload: {
            source: "IDML",
            sourcePath: sourceFrame.asset ? safeSourceReference(sourceFrame.asset.sourcePath) : undefined,
            sourceLabel: sourceFrame.sourceLabel,
            previewResourceKey: sourceFrame.asset ? idmlPreviewKey(sourceFrame.asset.sourcePath) : undefined,
          },
        });
      }
      if (sourceFrame.type === "TABLE") {
        const table = createTableBlock("table", {
          rows: (sourceFrame.table ?? [[""]]).map((cells, rowIndex) => ({
            id: `${sourceFrame.id}-row-${rowIndex}`,
            cells: cells.map((text, cellIndex) => ({
              id: `${sourceFrame.id}-cell-${rowIndex}-${cellIndex}`,
              text,
              spans: [{ text }],
            })),
          })),
        });
        table.id = `${sourceFrame.id}-table`;
        blocks.push(table);
        return createV2Frame("TABLE", page.id, {
          ...base,
          contentRef: { blockId: table.id },
          payload: { source: "IDML", sourceLabel: sourceFrame.sourceLabel },
        });
      }
      return createV2Frame("SHAPE", page.id, { ...base, payload: { fill: sourceFrame.fill ?? "#e2e8f0", border: sourceFrame.border ?? "#94a3b8", borderWidth: sourceFrame.borderWidth ?? 1, source: "IDML", sourceLabel: sourceFrame.sourceLabel } });
    });
    const reference = page.referenceVisual;
    return {
      id: page.id,
      order: page.order,
      width: page.width,
      height: page.height,
      unit: "px",
      frames,
      ...(visualMode === "EXACT_REPLICA" && reference?.supported ? {
        visualMode: "EXACT_REPLICA" as const,
        replica: {
          resourceId: idmlReplicaKey(reference.sourcePath),
          sourceKind: reference.sourceKind,
          sourcePageNumber: reference.sourcePageNumber,
          intrinsicWidth: reference.intrinsicWidth,
          intrinsicHeight: reference.intrinsicHeight,
          fitMode: "CONTAIN" as const,
          sourceHash: reference.sourceHash,
          importMetadata: { sourceFileName: reference.fileName, pageIndex: reference.pageIndex, referencePageCount: intermediate.referenceVisuals.length },
        },
      } : {}),
    };
  });
  const pageSize = pages[0] ? { preset: "CUSTOM" as const, width: pages[0].width, height: pages[0].height, unit: "px" as const } : undefined;
  return adoptLayoutV2(createContentDocument(blocks), pageSize ? { pageSize, pages } : undefined);
}

export class IdmlImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdmlImportError";
  }
}

function createPackageReader(input: Uint8Array, diagnostics: IdmlDiagnostic[]): PackageReader {
  if (input.byteLength === 0 || input.byteLength > IDML_LIMITS.maxPackageBytes) throw new IdmlImportError(`Package exceeds the ${Math.round(IDML_LIMITS.maxPackageBytes / 1024 / 1024)} MB safety limit.`);
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findSignature(bytes, 0x06054b50, Math.max(0, bytes.length - 65_557));
  if (eocd < 0) throw new IdmlImportError("The uploaded file is not a valid ZIP package.");
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entriesOnDisk = view.getUint16(eocd + 8, true);
  const entries = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entries || entries > IDML_LIMITS.maxEntries) throw new IdmlImportError("The ZIP package has too many or unsupported archive parts.");
  if (centralOffset + centralSize > bytes.length) throw new IdmlImportError("The ZIP central directory is malformed.");
  const result = new Map<string, ZipEntry>();
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new IdmlImportError("The ZIP central directory is malformed.");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    const localOffset = view.getUint32(offset + 42, true);
    const rawName = decodeUtf8(bytes.slice(offset + 46, offset + 46 + nameLength));
    const path = safePackagePath(rawName);
    if (flags & 0x1) throw new IdmlImportError(`Encrypted ZIP entries are not supported: ${path}`);
    if (method !== 0 && method !== 8) throw new IdmlImportError(`Unsupported ZIP compression for ${path}.`);
    if (uncompressedSize > IDML_LIMITS.maxEntryBytes || compressedSize > IDML_LIMITS.maxEntryBytes) throw new IdmlImportError(`ZIP entry exceeds the per-file safety limit: ${path}`);
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > IDML_LIMITS.maxUncompressedBytes) throw new IdmlImportError("The ZIP package exceeds the total uncompressed-size safety limit.");
    if (path.toLowerCase().endsWith(".zip") || path.toLowerCase().endsWith(".jar") || path.toLowerCase().endsWith(".gz")) {
      throw new IdmlImportError(`Nested archives are not supported: ${path}`);
    }
    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0xf000) === 0xa000) throw new IdmlImportError(`Symlink entries are not supported: ${path}`);
    if (!result.has(path)) result.set(path, { path, method, compressedSize, uncompressedSize, localOffset, externalAttributes });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (result.size === 0) throw new IdmlImportError("The ZIP package is empty.");
  diagnostics.push({ severity: "INFO", objectType: "PACKAGE", message: `Read ${result.size} bounded ZIP entries without extracting them to disk.` });
  return {
    entries: result,
    read(path) {
      const entry = result.get(path);
      if (!entry) throw new IdmlImportError(`Package entry not found: ${path}`);
      const local = view.getUint32(entry.localOffset, true) === 0x04034b50 ? entry.localOffset : -1;
      if (local < 0) throw new IdmlImportError(`Malformed local ZIP header: ${path}`);
      const nameLength = view.getUint16(local + 26, true);
      const extraLength = view.getUint16(local + 28, true);
      const start = local + 30 + nameLength + extraLength;
      const end = start + entry.compressedSize;
      if (end > bytes.length) throw new IdmlImportError(`Malformed ZIP entry: ${path}`);
      const compressed = bytes.slice(start, end);
      const output = entry.method === 0 ? compressed : inflateRawSync(compressed);
      if (output.byteLength !== entry.uncompressedSize || output.byteLength > IDML_LIMITS.maxEntryBytes) throw new IdmlImportError(`ZIP entry size validation failed: ${path}`);
      return new Uint8Array(output);
    },
  };
}

function parsePages(designMap: XmlNode, files: Map<string, XmlNode>, reader: PackageReader, stories: IdmlStory[], diagnostics: IdmlDiagnostic[]) {
  const spreadRefs = descendants(designMap, "Spread").map((node) => attr(node, "src")).filter(Boolean);
  const spreadPaths = spreadRefs.map((src) => resolvePackageReference("", src, files)).filter((path): path is string => Boolean(path));
  const candidates = spreadPaths.length ? spreadPaths : [...files.keys()].filter((path) => /(?:^|\/)Spreads\/.*\.xml$/i.test(path));
  const pages: IdmlPage[] = [];
  const usedStoryIds = new Set<string>();
  for (const spreadPath of candidates) {
    const spread = files.get(spreadPath);
    if (!spread) continue;
    const pageNodes = descendants(spread, "Page");
    if (!pageNodes.length) {
      const size = parseBounds(attr(spread, "GeometricBounds")) ?? [0, 0, 792, 612];
      pages.push(parsePage(spread, spreadPath, pages.length, size, spread, reader, stories, diagnostics, usedStoryIds));
      continue;
    }
    for (const pageNode of pageNodes) {
      const bounds = parseBounds(attr(pageNode, "GeometricBounds")) ?? [0, 0, 792, 612];
      pages.push(parsePage(pageNode, spreadPath, pages.length, bounds, spread, reader, stories, diagnostics, usedStoryIds));
    }
  }
  return pages;
}

function parsePage(pageNode: XmlNode, spreadPath: string, order: number, bounds: [number, number, number, number], spread: XmlNode, reader: PackageReader, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], usedStoryIds: Set<string>): IdmlPage {
  const [top, left, bottom, right] = bounds;
  const sourceId = attr(pageNode, "Self") || `${spreadPath}:${order}`;
  const id = stableId("idml-page", sourceId);
  const localNodes = descendants(pageNode, "TextFrame").concat(descendants(pageNode, "Rectangle"), descendants(pageNode, "GraphicLine"), descendants(pageNode, "Oval"), descendants(pageNode, "Polygon"), descendants(pageNode, "Table"));
  const itemNodes = localNodes.length ? localNodes : descendants(spread, "TextFrame").concat(descendants(spread, "Rectangle"), descendants(spread, "GraphicLine"), descendants(spread, "Oval"), descendants(spread, "Polygon"), descendants(spread, "Table"));
  const ownItems = itemNodes.filter((node) => belongsToPage(node, pageNode, bounds));
  const frames = ownItems.map((node, index) => parseFrame(node, id, order, index, bounds, reader, stories, diagnostics, usedStoryIds)).filter((frame): frame is IdmlIntermediateFrame => Boolean(frame));
  return { id, sourceId, order, width: Math.max(1, right - left), height: Math.max(1, bottom - top), left, top, frames };
}

function parseFrame(node: XmlNode, pageId: string, pageNumber: number, index: number, pageBounds: [number, number, number, number], reader: PackageReader, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], usedStoryIds: Set<string>): IdmlIntermediateFrame | null {
  const bounds = parseBounds(attr(node, "GeometricBounds"));
  if (!bounds) {
    diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: localName(node.name), message: "Page item has no usable geometric bounds and was skipped.", suggestedAction: "Review the object in InDesign or use Exact Replica." });
    return null;
  }
  const [top, left, bottom, right] = bounds;
  const [, pageLeft] = pageBounds;
  const sourceId = attr(node, "Self") || `${pageId}:${index}`;
  const typeName = localName(node.name);
  const base = { id: stableId("idml-frame", sourceId), pageId, x: Math.max(0, left - pageLeft), y: Math.max(0, top - pageBounds[0]), width: Math.max(1, right - left), height: Math.max(1, bottom - top), rotation: rotationFromTransform(attr(node, "ItemTransform")), layerName: attr(node, "ItemLayer") || attr(node, "Layer") || "Content", zIndex: index, readingOrder: index, sourceLabel: attr(node, "Name") || sourceId, altText: attr(node, "AltText") || attr(node, "Label") || attr(node, "Description") || undefined };
  if (typeName === "TextFrame") return parseTextFrame(node, base, stories, diagnostics, pageNumber, usedStoryIds);
  if (typeName === "Rectangle" || typeName === "GraphicLine" || typeName === "Oval" || typeName === "Polygon") {
    const link = findLink(node);
    if (link || typeName === "Rectangle" && attr(node, "ContentType")?.toLowerCase().includes("graphic")) return { ...base, type: "IMAGE", asset: link ? resolveAsset(link, reader, diagnostics, pageId, pageNumber) : undefined };
    if (typeName === "Polygon" || typeName === "Oval") {
      diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: "VECTOR", message: "Complex vector path cannot be edited; use Exact Replica.", suggestedAction: "Replace with a simple rectangle or use the future Exact Replica mode." });
      return null;
    }
    return { ...base, type: "SHAPE", fill: safeColor(attr(node, "FillColor")) ?? "#e2e8f0", border: safeColor(attr(node, "StrokeColor")) ?? "#94a3b8", borderWidth: finite(attr(node, "StrokeWeight"), 1) };
  }
  if (typeName === "Table") return { ...base, type: "TABLE", table: parseTableRows(node) };
  diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: typeName, message: `${typeName} is not supported as an editable V2 frame.`, suggestedAction: "Use Exact Replica or rebuild this object in Content Studio." });
  return null;
}

function parseTableRows(node: XmlNode) {
  const rows = descendants(node, "Row").map((row) => descendants(row, "Cell").map((cell) => textContent(cell).trim()));
  if (rows.length) return rows.filter((row) => row.length);
  const cells = descendants(node, "Cell").map((cell) => textContent(cell).trim());
  return cells.length ? [cells] : [[""]];
}

function parseTextFrame(node: XmlNode, base: Omit<IdmlIntermediateFrame, "type">, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], pageNumber: number, usedStoryIds: Set<string>): IdmlIntermediateFrame {
  const storyId = attr(node, "ParentStory");
  const story = storyId ? stories.find((item) => item.id === storyId) : undefined;
  const threaded = Boolean(storyId && usedStoryIds.has(storyId));
  const text = threaded ? "" : story?.text ?? textContent(node);
  const spans = threaded ? [{ text: "" }] : story?.spans ?? [{ text }];
  if (storyId) usedStoryIds.add(storyId);
  const font = attr(node, "FontFamily") || attr(node, "AppliedFont");
  const originalFont = font || "Default";
  const mappedFont = mapFont(originalFont);
  if (mappedFont !== originalFont) diagnostics.push({ severity: "WARNING", pageNumber: pageNumber + 1, objectType: "TEXT", message: `Font substituted. Original: ${originalFont}. Rendered using: ${mappedFont}.`, suggestedAction: "Review typography in Content Studio." });
  if (attr(node, "NextTextFrame") || attr(node, "PreviousTextFrame") || attr(node, "TextFrameIndex") || threaded) diagnostics.push({ severity: "WARNING", pageNumber: pageNumber + 1, objectType: "TEXT", message: "Linked text frames detected — advanced text threading is not yet editable in Content Studio.", suggestedAction: "Review the imported text and split or reconnect it manually." });
  return { ...base, type: "TEXT", text, textSpans: spans, fontFamily: mappedFont, fontWeight: /bold/i.test(attr(node, "FontStyle") ?? "") || Boolean(spans.some((span) => span.marks?.includes("bold"))) ? 700 : 400, fontSize: finite(attr(node, "PointSize") || attr(node, "FontSize"), spans[0]?.fontSize ?? 16), lineHeight: finite(attr(node, "Leading"), 1.4), letterSpacing: finite(attr(node, "Tracking"), 0), alignment: mapAlignment(attr(node, "Justification")), direction: mapDirection(attr(node, "Direction") || attr(node, "ParagraphDirection")) };
}

function scanUnsupportedFeatures(files: Map<string, XmlNode>, diagnostics: IdmlDiagnostic[]) {
  const roots = [...files.values()];
  const checks: Array<[string, string, IdmlDiagnosticSeverity]> = [
    ["MasterSpread", "Master-page content detected; only safe static objects are materialized.", "WARNING"],
    ["Group", "Grouped page items are flattened into independently editable frames when possible.", "INFO"],
    ["PageNumber", "Dynamic page-number content will require author review.", "INFO"],
    ["PageNumberMarker", "Dynamic page-number content will be materialized only when deterministic.", "INFO"],
    ["Gradient", "Gradient styling requires author review in the digital renderer.", "WARNING"],
    ["TransparencySetting", "Transparency effect requires Exact Replica.", "WARNING"],
    ["BlendMode", "Blend mode requires Exact Replica.", "WARNING"],
  ];
  for (const [name, message, severity] of checks) if (roots.some((candidate) => descendants(candidate, name).length > 0)) diagnostics.push({ severity, objectType: name, message, suggestedAction: severity === "WARNING" ? "Review the imported object or use Exact Replica." : undefined });
  if (roots.some((root) => Object.values(root.attributes).some((value) => /CMYK|Spot/i.test(value)))) diagnostics.push({ severity: "WARNING", objectType: "COLOR", message: "CMYK/spot color was converted for screen rendering.", suggestedAction: "Review digital colors in Content Studio." });
}

function parseStories(files: Map<string, XmlNode>, diagnostics: IdmlDiagnostic[]) {
  const stories: IdmlStory[] = [];
  for (const [path, root] of files) {
    if (!/Stories\/.*\.xml$/i.test(path) && localName(root.name) !== "Story") continue;
    for (const storyNode of localName(root.name) === "Story" ? [root] : descendants(root, "Story")) {
      const id = attr(storyNode, "Self") || stableId("story", path);
      const spans = collectStorySpans(storyNode);
      const text = spans.map((span) => span.text).join("") || textContent(storyNode);
      if (text.length > 1_000_000) {
        diagnostics.push({ severity: "ERROR", objectType: "STORY", message: `Story ${id} exceeds the supported text limit.` });
        continue;
      }
      stories.push({ id, text, spans: spans.length ? spans : [{ text }] });
    }
  }
  return stories;
}

function collectStorySpans(story: XmlNode) {
  const result: NonNullable<IdmlStory["spans"]> = [];
  const ranges = descendants(story, "CharacterStyleRange");
  for (const range of ranges) {
    const text = textContent(range);
    if (!text) continue;
    const marks: NonNullable<IdmlIntermediateFrame["textSpans"]>[number]["marks"] = [];
    const fontStyle = attr(range, "FontStyle") || attr(range, "AppliedCharacterStyle");
    if (/bold/i.test(fontStyle)) marks.push("bold");
    if (/italic|oblique/i.test(fontStyle)) marks.push("italic");
    if (attr(range, "Underline") === "true") marks.push("underline");
    if (/super/i.test(attr(range, "Position"))) marks.push("superscript");
    if (/sub/i.test(attr(range, "Position"))) marks.push("subscript");
    result.push({ text, ...(marks.length ? { marks } : {}), ...(finite(attr(range, "PointSize"), 0) ? { fontSize: finite(attr(range, "PointSize"), 0) } : {}), ...(safeColor(attr(range, "FillColor")) ? { color: safeColor(attr(range, "FillColor")) ?? undefined } : {}) });
  }
  return result;
}

function resolveAsset(sourcePath: string, reader: PackageReader, diagnostics: IdmlDiagnostic[], pageId: string, pageNumber: number): IdmlAsset {
  const normalized = normalizeLinkPath(sourcePath);
  const entryPath = findEntry(reader.entries, (path) => normalizeLinkPath(path) === normalized || normalizeLinkPath(path).endsWith(`/${basename(normalized)}`));
  const fileName = basename(normalized) || "linked-asset";
  if (!entryPath) {
    diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: "IMAGE", message: `Missing linked asset: ${sourcePath}`, suggestedAction: "Add the asset to Links/ or replace the image manually." });
    return { sourcePath, entryPath: null, fileName, contentType: null, bytes: 0, supported: false };
  }
  const data = reader.read(entryPath);
  const contentType = detectImageType(fileName, data);
  const supported = Boolean(contentType);
  if (!supported) diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: "IMAGE", message: `Unsupported linked asset format: ${fileName}`, suggestedAction: "Convert TIFF/PSD/EPS/AI to PNG/JPEG or use Exact Replica." });
  const asset: IdmlAsset = { sourcePath, entryPath, fileName, contentType, bytes: data.byteLength, supported, data };
  if (supported && data.byteLength <= IDML_LIMITS.maxPreviewAssetBytes) asset.previewDataUrl = `data:${contentType};base64,${Buffer.from(data).toString("base64")}`;
  return asset;
}

function collectReferenceVisuals(reader: PackageReader, pages: IdmlPage[], diagnostics: IdmlDiagnostic[]): IdmlReferenceVisual[] {
  const candidates = [...reader.entries.keys()];
  const pdfPaths = candidates.filter((path) => /\.pdf$/i.test(path) && /(?:^|\/)(?:reference|visual|pages?|source)[^/]*\.pdf$/i.test(path));
  const imagePaths = candidates.filter((path) => /\.(?:png|jpe?g|webp|svg)$/i.test(path) && (/(?:^|\/)Pages?\//i.test(path) || /(?:^|\/)page[-_ ]?\d+\.(?:png|jpe?g|webp)$/i.test(path)));
  const pdfPath = pdfPaths.length === 1 ? pdfPaths[0] : null;
  if (pdfPaths.length > 1) diagnostics.push({ severity: "ERROR", objectType: "REFERENCE_PDF", message: "Multiple reference PDFs were found; page matching is ambiguous.", suggestedAction: "Package one reference PDF or deterministic page images." });
  let pdfVisuals: IdmlReferenceVisual[] = [];
  if (pdfPath) {
    const data = reader.read(pdfPath);
    const parsed = parsePdfReference(data);
    if (!parsed) diagnostics.push({ severity: "ERROR", objectType: "REFERENCE_PDF", message: "Reference PDF is unreadable or contains unsupported active/external actions.", suggestedAction: "Provide a safe PDF without JavaScript, launch actions, external links, or embedded files." });
    if (parsed && parsed.pageCount === pages.length) {
      pdfVisuals = pages.map((page, index) => {
        const dimensions = parsed.dimensions[index] ?? parsed.dimensions[0] ?? { width: page.width, height: page.height };
        return createReferenceVisual({ sourceKind: "PDF", sourcePath: pdfPath, fileName: basename(pdfPath), pageIndex: index, sourcePageNumber: index + 1, intrinsicWidth: dimensions.width, intrinsicHeight: dimensions.height, contentType: "application/pdf", data });
      });
    } else if (parsed) {
      diagnostics.push({ severity: "ERROR", objectType: "REFERENCE_PDF", message: `Reference PDF page count (${parsed.pageCount}) does not match IDML page count (${pages.length}).`, suggestedAction: "Provide a matching PDF or page images; mappings are not shifted automatically." });
    }
  }
  const imageVisuals = collectPageImageVisuals(reader, imagePaths, pages, diagnostics);
  const visuals = imageVisuals.length ? imageVisuals : pdfVisuals;
  for (const page of pages) {
    const visual = visuals.find((item) => item.pageIndex === page.order);
    if (visual) {
      const pageRatio = page.width / Math.max(1, page.height);
      const visualRatio = visual.intrinsicWidth / Math.max(1, visual.intrinsicHeight);
      if (Math.abs(pageRatio - visualRatio) / Math.max(pageRatio, visualRatio) > 0.03) diagnostics.push({ severity: "WARNING", pageId: page.id, pageNumber: page.order + 1, objectType: "REFERENCE_DIMENSION", message: "Reference visual aspect ratio differs materially from the IDML page.", suggestedAction: "Export the reference at the same page dimensions; the renderer will contain it without distortion." });
    }
  }
  return visuals;
}

function collectPageImageVisuals(reader: PackageReader, paths: string[], pages: IdmlPage[], diagnostics: IdmlDiagnostic[]): IdmlReferenceVisual[] {
  const numbered = new Map<number, string>();
  const unnumbered: string[] = [];
  for (const path of [...paths].sort()) {
    const match = /(?:^|\/)page[-_ ]?(\d+)\.(?:png|jpe?g|webp)$/i.exec(path);
    if (!match) { unnumbered.push(path); continue; }
    const pageNumber = Number(match[1]);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pages.length) {
      diagnostics.push({ severity: "ERROR", objectType: "REFERENCE_IMAGE", message: `Reference image page number is outside the IDML page range: ${path}.`, suggestedAction: "Use page-001, page-002, ... matching the IDML page count." });
      continue;
    }
    if (numbered.has(pageNumber)) {
      diagnostics.push({ severity: "ERROR", objectType: "REFERENCE_IMAGE", message: `Multiple reference images map to page ${pageNumber}.`, suggestedAction: "Use one deterministic page image per page." });
      continue;
    }
    numbered.set(pageNumber, path);
  }
  if (unnumbered.length && unnumbered.length === pages.length && numbered.size === 0) unnumbered.sort().forEach((path, index) => numbered.set(index + 1, path));
  else if (unnumbered.length) diagnostics.push({ severity: "WARNING", objectType: "REFERENCE_IMAGE", message: "Unnumbered page images were not mapped because the reference count or naming is ambiguous.", suggestedAction: "Name images page-001.png, page-002.png, ... or provide a matching PDF." });
  if (numbered.size && numbered.size !== pages.length) diagnostics.push({ severity: "WARNING", objectType: "REFERENCE_IMAGE", message: `Reference page images cover ${numbered.size} of ${pages.length} IDML pages.`, suggestedAction: "Provide a visual for every page intended for Exact Replica." });
  const result: IdmlReferenceVisual[] = [];
  for (const [pageNumber, path] of numbered) {
    const data = reader.read(path);
    if (data.byteLength > IDML_LIMITS.maxReferenceVisualBytes) {
      diagnostics.push({ severity: "ERROR", objectType: "REFERENCE_IMAGE", message: `Reference page image exceeds the ${Math.round(IDML_LIMITS.maxReferenceVisualBytes / 1024 / 1024)} MB safety limit: ${path}.`, suggestedAction: "Export a sensible digital-resolution page image." });
      continue;
    }
    const dimensions = readReferenceImageDimensions(path, data);
    if (!dimensions) {
      diagnostics.push({ severity: "ERROR", objectType: "REFERENCE_IMAGE", message: `Reference page image is not a supported safe JPEG, PNG, or WebP: ${path}.`, suggestedAction: "Use raster JPEG, PNG, or WebP page images; SVG is not accepted for replica pages." });
      continue;
    }
    result.push(createReferenceVisual({ sourceKind: "PAGE_IMAGE", sourcePath: path, fileName: basename(path), pageIndex: pageNumber - 1, sourcePageNumber: pageNumber, intrinsicWidth: dimensions.width, intrinsicHeight: dimensions.height, contentType: dimensions.contentType, data }));
  }
  return result;
}

function createReferenceVisual(input: Omit<IdmlReferenceVisual, "bytes" | "sourceHash" | "supported" | "previewDataUrl" | "data"> & { data: Uint8Array }): IdmlReferenceVisual {
  const sourceHash = stableHash(input.data);
  return {
    ...input,
    bytes: input.data.byteLength,
    sourceHash,
    supported: true,
    ...(input.data.byteLength <= IDML_LIMITS.maxPreviewAssetBytes ? { previewDataUrl: `data:${input.contentType};base64,${Buffer.from(input.data).toString("base64")}` } : {}),
  };
}

function parsePdfReference(data: Uint8Array): { pageCount: number; dimensions: Array<{ width: number; height: number }> } | null {
  if (data.byteLength > IDML_LIMITS.maxReferenceVisualBytes || decodeUtf8(data.slice(0, 5)) !== "%PDF-") return null;
  const source = decodeUtf8(data);
  if (/\/JavaScript\b|\/JS\b|\/Launch\b|\/OpenAction\b|\/AA\b|\/URI\b|\/GoToR\b|\/SubmitForm\b|\/RichMedia\b|\/EmbeddedFile\b/i.test(source)) return null;
  const pageCount = [...source.matchAll(/\/Type\s*\/Page(?:\s|\/|>>)/g)].length;
  if (!pageCount || pageCount > IDML_LIMITS.maxReferencePageCount) return null;
  const dimensions = [...source.matchAll(/\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/g)].map((match) => ({ width: Math.abs(Number(match[3]) - Number(match[1])), height: Math.abs(Number(match[4]) - Number(match[2])) })).filter((entry) => entry.width > 0 && entry.height > 0);
  return { pageCount, dimensions };
}

function readReferenceImageDimensions(fileName: string, data: Uint8Array): { contentType: "image/jpeg" | "image/png" | "image/webp"; width: number; height: number } | null {
  const type = detectImageType(fileName, data);
  if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") return null;
  let width = 0;
  let height = 0;
  if (type === "image/png" && data.byteLength >= 24) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    width = view.getUint32(16, false);
    height = view.getUint32(20, false);
  } else if (type === "image/webp") {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const subtype = decodeUtf8(data.slice(12, 16));
    if (subtype === "VP8X" && data.byteLength >= 30) {
      width = 1 + readUint24LE(view, 24);
      height = 1 + readUint24LE(view, 27);
    } else if (subtype === "VP8 " && data.byteLength >= 30) {
      width = view.getUint16(26, true);
      height = view.getUint16(28, true);
    }
  } else if (type === "image/jpeg") {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 2;
    while (offset + 9 < data.byteLength) {
      if (view.getUint8(offset) !== 0xff) { offset += 1; continue; }
      const marker = view.getUint8(offset + 1);
      const length = view.getUint16(offset + 2, false);
      if (marker >= 0xc0 && marker <= 0xc3 && length >= 7) { height = view.getUint16(offset + 5, false); width = view.getUint16(offset + 7, false); break; }
      offset += 2 + Math.max(2, length);
    }
  }
  return width > 0 && height > 0 && width <= 30_000 && height <= 30_000 ? { contentType: type, width, height } : null;
}

function readUint24LE(view: DataView, offset: number) { return view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16); }

function analyzePageFidelity(page: IdmlPage, diagnostics: IdmlDiagnostic[]): IdmlFidelity {
  const relevant = diagnostics.filter((item) => item.pageId === page.id || !item.pageId);
  const reasons = [...new Set(relevant.filter((item) => item.severity !== "INFO").flatMap((item) => {
    if (item.objectType === "VECTOR" || /complex vector|unsupported object/i.test(item.message)) return ["Complex vector or unsupported object"];
    if (/Gradient|BlendMode|Transparency|advanced effects/i.test(`${item.objectType} ${item.message}`)) return ["Advanced visual effects"];
    if (/threaded text|linked text/i.test(item.message)) return ["Linked text chain"];
    if (/font substituted|missing font/i.test(item.message)) return ["Font substitution"];
    if (/table/i.test(`${item.objectType} ${item.message}`)) return ["Complex table"];
    if (/missing linked asset|unsupported linked asset/i.test(item.message)) return ["Missing or unsupported image"];
    if (/master-page|master page/i.test(item.message)) return ["Master-page complexity"];
    return [];
  }))];
  const high = reasons.some((reason) => ["Complex vector or unsupported object", "Advanced visual effects", "Master-page complexity"].includes(reason));
  const level = high ? "HIGH" : reasons.length ? "MEDIUM" : "LOW";
  return { level, recommendation: high ? "EXACT_REPLICA" : "EDITABLE", reasons, referenceAvailable: Boolean(page.referenceVisual?.supported) };
}
function collectAssets(pages: IdmlPage[]) {
  const map = new Map<string, IdmlAsset>();
  pages.flatMap((page) => page.frames).map((frame) => frame.asset).filter((asset): asset is IdmlAsset => Boolean(asset)).forEach((asset) => map.set(asset.sourcePath, asset));
  return [...map.values()];
}

function createPreviewResourceUrls(document: IdmlDocument) {
  const urls: Record<string, string> = {};
  for (const asset of document.assets) if (asset.previewDataUrl) urls[idmlPreviewKey(asset.sourcePath)] = asset.previewDataUrl;
  for (const visual of document.referenceVisuals) if (visual.previewDataUrl) urls[idmlReplicaKey(visual.sourcePath)] = visual.previewDataUrl;
  return urls;
}

function summarize(document: IdmlDocument, diagnostics: IdmlDiagnostic[]): IdmlAnalysis["summary"] {
  const frames = document.pages.flatMap((page) => page.frames);
  return {
    pagesDetected: document.pages.length,
    pagesImportable: document.pages.filter((page) => page.width > 0 && page.height > 0).length,
    textFrames: frames.filter((frame) => frame.type === "TEXT").length,
    imageFrames: frames.filter((frame) => frame.type === "IMAGE").length,
    tables: frames.filter((frame) => frame.type === "TABLE").length,
    shapes: frames.filter((frame) => frame.type === "SHAPE").length,
    missingLinks: diagnostics.filter((item) => item.message.startsWith("Missing linked asset")).length,
    unsupportedObjects: diagnostics.filter((item) => item.objectType === "VECTOR" || item.message.includes("not supported")).length,
    fontSubstitutions: diagnostics.filter((item) => item.message.startsWith("Font substituted")).length,
    warnings: diagnostics.filter((item) => item.severity === "WARNING").length,
    errors: diagnostics.filter((item) => item.severity === "ERROR").length,
    editableRecommended: document.pages.filter((page) => page.fidelity?.recommendation === "EDITABLE" && page.fidelity.level === "LOW").length,
    reviewRecommended: document.pages.filter((page) => page.fidelity?.level === "MEDIUM").length,
    exactRecommended: document.pages.filter((page) => page.fidelity?.recommendation === "EXACT_REPLICA").length,
    missingReferenceVisuals: document.pages.filter((page) => page.fidelity?.recommendation === "EXACT_REPLICA" && !page.referenceVisual?.supported).length,
    advancedEffects: diagnostics.filter((item) => /Gradient|BlendMode|Transparency|VECTOR/i.test(`${item.objectType} ${item.message}`)).length,
  };
}

function findEntry(entries: Map<string, ZipEntry>, predicate: (path: string) => boolean) {
  return [...entries.keys()].find(predicate);
}

function findSignature(bytes: Uint8Array, signature: number, start: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = bytes.length - 22; index >= start; index -= 1) if (view.getUint32(index, true) === signature) return index;
  return -1;
}

function safePackagePath(value: string) {
  const path = value.replaceAll("\\", "/");
  if (!path || path.includes("\0") || path.startsWith("/") || /^[a-zA-Z]:\//.test(path) || path.split("/").includes("..")) throw new IdmlImportError(`Unsafe ZIP path rejected: ${value}`);
  return path.split("/").filter(Boolean).join("/");
}

function parseSafeXml(source: string): XmlNode {
  if (source.length > IDML_LIMITS.maxXmlBytes) throw new IdmlImportError("XML exceeds the safety limit.");
  if (/<!DOCTYPE|<!ENTITY|\b(?:SYSTEM|PUBLIC)\b/i.test(source)) throw new IdmlImportError("External XML entities and doctypes are not allowed.");
  const root: XmlNode = { name: "#root", attributes: {}, children: [], text: "" };
  const stack = [root];
  let nodes = 0;
  let cursor = 0;
  const token = /<!--[\s\S]*?-->|<\?xml[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>|[^<]+/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(source))) {
    if (match.index !== cursor && source.slice(cursor, match.index).trim()) throw new IdmlImportError("Malformed XML token stream.");
    cursor = token.lastIndex;
    const value = match[0];
    if (value.startsWith("<!--") || value.startsWith("<?")) continue;
    if (value.startsWith("<![CDATA[")) {
      stack[stack.length - 1].text += value.slice(9, -3);
      continue;
    }
    if (!value.startsWith("<")) {
      stack[stack.length - 1].text += decodeXmlText(value);
      continue;
    }
    if (value.startsWith("</")) {
      const name = localName(value.slice(2, -1).trim());
      if (stack.length === 1 || localName(stack[stack.length - 1].name) !== name) throw new IdmlImportError("Mismatched XML closing tag.");
      stack.pop();
      continue;
    }
    const selfClosing = /\/\s*>$/.test(value);
    const body = value.slice(1, selfClosing ? -2 : -1).trim();
    const nameMatch = /^([^\s/>]+)/.exec(body);
    if (!nameMatch) throw new IdmlImportError("Malformed XML element.");
    const name = nameMatch[1];
    const attributes = parseXmlAttributes(body.slice(name.length));
    const node: XmlNode = { name, attributes, children: [], text: "" };
    stack[stack.length - 1].children.push(node);
    nodes += 1;
    if (nodes > IDML_LIMITS.maxXmlNodes) throw new IdmlImportError("XML contains too many nodes.");
    if (!selfClosing) {
      stack.push(node);
      if (stack.length > IDML_LIMITS.maxXmlDepth) throw new IdmlImportError("XML nesting is too deep.");
    }
  }
  if (cursor !== source.length || stack.length !== 1) throw new IdmlImportError("Malformed XML document.");
  return root;
}

function parseXmlAttributes(source: string) {
  const result: Record<string, string> = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) result[localName(match[1])] = decodeXmlText(match[2] ?? match[3] ?? "");
  return result;
}

function decodeXmlText(value: string) {
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[name] ?? ""));
}

function scanUnsafeLinks(node: XmlNode, sourcePath: string, diagnostics: IdmlDiagnostic[]) {
  for (const [key, value] of Object.entries(node.attributes)) {
    if (!/(?:href|url|uri|link)/i.test(key)) continue;
    if (/^(?:javascript|data|file|vbscript):/i.test(value.trim())) diagnostics.push({ severity: "ERROR", objectType: "HYPERLINK", message: `Unsafe hyperlink rejected in ${sourcePath}.`, suggestedAction: "Use a safe HTTP/HTTPS link or remove the link." });
  }
  node.children.forEach((child) => scanUnsafeLinks(child, sourcePath, diagnostics));
}

function descendants(node: XmlNode, name: string): XmlNode[] {
  const result: XmlNode[] = [];
  for (const child of node.children) {
    if (localName(child.name) === name) result.push(child);
    result.push(...descendants(child, name));
  }
  return result;
}

function localName(name: string) { return name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name; }
function attr(node: XmlNode, name: string) { return node.attributes[name] ?? node.attributes[localName(name)]; }
function textContent(node: XmlNode): string { return `${node.text}${node.children.map(textContent).join("")}`.replace(/\r\n/g, "\n"); }
function parseBounds(value: string | undefined): [number, number, number, number] | null { const values = (value ?? "").trim().split(/[\s,]+/).map(Number); return values.length === 4 && values.every(Number.isFinite) ? values as [number, number, number, number] : null; }
function finite(value: string | undefined, fallback: number) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function rotationFromTransform(value: string | undefined) { const values = (value ?? "").trim().split(/[\s,]+/).map(Number); return values.length >= 4 && values.slice(0, 4).every(Number.isFinite) ? Math.round(Math.atan2(values[1], values[0]) * 180 / Math.PI * 100) / 100 : 0; }
function belongsToPage(node: XmlNode, pageNode: XmlNode, bounds: [number, number, number, number]) { const pageRef = attr(node, "ParentPage") || attr(node, "ParentPageRef"); if (pageRef) return pageRef === attr(pageNode, "Self"); const item = parseBounds(attr(node, "GeometricBounds")); if (!item) return false; const [top, left, bottom, right] = item; const [pageTop, pageLeft, pageBottom, pageRight] = bounds; const centerX = (left + right) / 2; const centerY = (top + bottom) / 2; return centerX >= pageLeft && centerX <= pageRight && centerY >= pageTop && centerY <= pageBottom; }
function findLink(node: XmlNode) { const link = descendants(node, "Link")[0]; return link ? attr(link, "LinkResourceURI") || attr(link, "RelativeURI") || attr(link, "FilePath") || attr(link, "Name") : undefined; }
function resolvePackageReference(base: string, value: string | undefined, files: Map<string, XmlNode>) { if (!value) return null; const normalized = normalizeLinkPath(value); return findEntry(files as unknown as Map<string, ZipEntry>, (path) => normalizeLinkPath(path) === normalizeLinkPath(`${base}/${normalized}`) || normalizeLinkPath(path).endsWith(`/${basename(normalized)}`)) ?? null; }
function normalizeLinkPath(value: string) { try { return decodeURIComponent(value).replaceAll("\\", "/").replace(/^file:\/\//i, "").split("/").filter((part) => part && part !== ".").join("/").toLowerCase(); } catch { return value.replaceAll("\\", "/").toLowerCase(); } }
function basename(path: string) { return path.split("/").pop() ?? path; }
function detectImageType(fileName: string, data: Uint8Array) { const lower = fileName.toLowerCase(); if (data[0] === 0xff && data[1] === 0xd8) return "image/jpeg"; if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "image/png"; if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 && decodeUtf8(data.slice(8, 12)) === "WEBP") return "image/webp"; if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return "image/gif"; if (lower.endsWith(".svg") && /<svg[\s>]/i.test(decodeUtf8(data.slice(0, Math.min(data.length, 4096))) ) && !/<script|<!DOCTYPE|foreignObject/i.test(decodeUtf8(data))) return "image/svg+xml"; return null; }
function safeSourceReference(value: string) {
  const normalized = value.replaceAll("\\", "/");
  if (/^[a-zA-Z]:\//.test(normalized) || normalized.startsWith("/")) return basename(normalized);
  return normalized.split("/").filter((part) => part && part !== "." && part !== "..").join("/");
}

function mapLayer(name: string): "BACKGROUND" | "CONTENT" | "DESIGN" | "INTERACTIVE" { if (/background|backdrop|master/i.test(name)) return "BACKGROUND"; if (/interactive|button|link/i.test(name)) return "INTERACTIVE"; if (/design|decor|graphic|illustration/i.test(name)) return "DESIGN"; return "CONTENT"; }
function mapAlignment(value: string | undefined): "left" | "center" | "right" { if (/center/i.test(value ?? "")) return "center"; if (/right|end/i.test(value ?? "")) return "right"; return "left"; }
function mapDirection(value: string | undefined): "LTR" | "RTL" | "AUTO" { if (/rtl|right.?to.?left/i.test(value ?? "")) return "RTL"; if (/auto/i.test(value ?? "")) return "AUTO"; return "LTR"; }
function mapFont(value: string) { if (/minion|garamond|times|serif/i.test(value)) return "Georgia"; if (/helvetica|arial|univers|sans/i.test(value)) return "Arial, sans-serif"; return "Arial, sans-serif"; }
function safeColor(value: string | undefined) { if (!value || /^None$/i.test(value)) return null; if (/^#[0-9a-f]{3,8}$/i.test(value.trim())) return value.trim(); if (/white/i.test(value)) return "#ffffff"; if (/black/i.test(value)) return "#000000"; return null; }
export function idmlPreviewKey(sourcePath: string) { return `idml-preview:${stableHash(new TextEncoder().encode(sourcePath))}`; }
export function idmlReplicaKey(sourcePath: string) { return `idml-replica:${stableHash(new TextEncoder().encode(sourcePath))}`; }
function stableId(prefix: string, source: string) { return `${prefix}-${stableHash(new TextEncoder().encode(source)).slice(0, 12)}`; }
export function hashJsonValue(value: unknown) { return stableHash(new TextEncoder().encode(JSON.stringify(value ?? null))); }

function stableHash(data: Uint8Array) { return createHash("sha256").update(data).digest("hex"); }
function decodeUtf8(data: Uint8Array) { return new TextDecoder("utf-8", { fatal: false }).decode(data); }