import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { SaxesParser } from "saxes";

import {
  adoptLayoutV2,
  createV2Frame,
  type LayoutV2Frame,
  type LayoutV2Page,
  type LayoutV2VisualMode,
} from "@/lib/content-layout-v2";
import { createContentDocument, createTableBlock, type ContentBlock, type ContentDocument } from "@/lib/content-document";

const MB = 1024 * 1024;

export const IDML_LIMITS = {
  maxOuterPackageCompressedBytes: 300 * MB,
  maxOuterPackageEntries: 10_000,
  maxOuterPackageTotalUncompressedBytes: 750 * MB,
  maxOuterPackageEntryCompressedBytes: 300 * MB,
  maxOuterPackageEntryUncompressedBytes: 300 * MB,
  maxNestedIdmlCompressedBytes: 250 * MB,
  maxNestedIdmlEntries: 10_000,
  maxNestedIdmlTotalUncompressedBytes: 750 * MB,
  maxNestedIdmlEntryCompressedBytes: 250 * MB,
  maxNestedIdmlEntryUncompressedBytes: 300 * MB,
  maxInternalXmlEntryBytes: 250 * MB,
  maxTotalInternalXmlBytes: 500 * MB,
  maxLinkedAssetBytes: 100 * MB,
  maxStoryTextBytes: 50 * MB,
  maxCompressionRatio: 100,
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
  textSpans?: Array<{ text: string; marks?: Array<"bold" | "italic" | "underline" | "superscript" | "subscript">; fontSize?: number; color?: string; fontFamily?: string; fontWeight?: number; fontStyle?: "normal" | "italic"; letterSpacing?: number; baselineShift?: number; horizontalScale?: number; verticalScale?: number; textTransform?: "uppercase" | "lowercase" | "capitalize"; justification?: string; leading?: number }>;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
  textColor?: string;
  alignment?: "left" | "center" | "right" | "justify";
  direction?: "LTR" | "RTL" | "AUTO";
  textInset?: { top: number; right: number; bottom: number; left: number };
  fill?: string;
  border?: string;
  borderWidth?: number;
  shapeType?: "RECTANGLE" | "ELLIPSE" | "LINE";
  asset?: IdmlAsset;
  table?: string[][];
  sourceLabel?: string;
  altText?: string;
  hyperlinks?: IdmlHyperlink[];
  source?: "page" | "master";
  masterId?: string;
  sourceObjectId?: string;
};

export type IdmlHyperlink = {
  url: string;
  active: boolean;
  sourcePath: string;
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
  parent?: XmlNode;
};

type PackageReader = {
  entries: Map<string, ZipEntry>;
  archivePath: string;
  read(path: string): Uint8Array;
};

type PackageReaderOptions = {
  archivePath: string;
  label: string;
  sizeCategory: IdmlSizeErrorDetails["category"];
  maxArchiveBytes: number;
  maxEntries: number;
  maxTotalUncompressedBytes: number;
  maxEntryCompressedBytes: number;
  maxEntryUncompressedBytes: number;
  allowNestedIdml: boolean;
};

export function analyzeIdmlPackage(input: Uint8Array, fileName = "package.zip"): IdmlAnalysis {
  const diagnostics: IdmlDiagnostic[] = [];
  const sourceFileName = basename(fileName);
  const isDirectIdml = sourceFileName.toLowerCase().endsWith(".idml");
  if (sourceFileName.toLowerCase().endsWith(".indd")) {
    throw new IdmlImportError("Please export/package the document with IDML and linked assets.");
  }
  let idmlPath = sourceFileName;
  let reader: PackageReader;
  if (isDirectIdml) {
    reader = createNestedIdmlReader(input, diagnostics, idmlPath);
  } else {
    const outerReader = createOuterPackageReader(input, diagnostics, sourceFileName);
    const idmlEntries = [...outerReader.entries.values()].filter((entry) => entry.path.toLowerCase().endsWith(".idml"));
    if (idmlEntries.length !== 1) throw new IdmlImportError(idmlEntries.length ? "The package must contain exactly one IDML file." : "The package must contain an IDML file.");
    const idmlEntry = idmlEntries[0];
    idmlPath = idmlEntry.path;
    if (idmlEntry.uncompressedSize > IDML_LIMITS.maxNestedIdmlCompressedBytes) {
      throw createIdmlSizeError("NESTED_IDML", idmlPath, `The IDML document exceeds the ${formatIdmlLimit(IDML_LIMITS.maxNestedIdmlCompressedBytes)} import limit.`, IDML_LIMITS.maxNestedIdmlCompressedBytes, idmlEntry.uncompressedSize);
    }
    reader = createNestedIdmlReader(outerReader.read(idmlPath), diagnostics, idmlPath);
  }
  const xmlFiles = new Map<string, XmlNode>();
  const xmlEntries = [...reader.entries.values()]
    .filter((entry) => /\.xml$/i.test(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (!xmlEntries.length) throw new IdmlImportError("The package does not contain IDML XML entries.");
  const oversizedXmlEntry = xmlEntries.find((entry) => entry.uncompressedSize > IDML_LIMITS.maxInternalXmlEntryBytes);
  if (oversizedXmlEntry) {
    throw createIdmlSizeError("INTERNAL_XML", nestedEntryPath(idmlPath, oversizedXmlEntry.path), `This internal XML file exceeds the ${formatIdmlLimit(IDML_LIMITS.maxInternalXmlEntryBytes)} import limit.`, IDML_LIMITS.maxInternalXmlEntryBytes, oversizedXmlEntry.uncompressedSize);
  }
  const totalXmlBytes = xmlEntries.reduce((total, entry) => total + entry.uncompressedSize, 0);
  if (totalXmlBytes > IDML_LIMITS.maxTotalInternalXmlBytes) {
    throw createIdmlSizeError("INTERNAL_XML", idmlPath, `The IDML document's XML content exceeds the ${formatIdmlLimit(IDML_LIMITS.maxTotalInternalXmlBytes)} import limit.`, IDML_LIMITS.maxTotalInternalXmlBytes, totalXmlBytes);
  }
  for (const entry of xmlEntries) {
    const entryPath = nestedEntryPath(idmlPath, entry.path);
    const parsed = parseIdmlXmlEntry(reader.read(entry.path), entryPath);
    scanUnsafeLinks(parsed, entry.path, diagnostics);
    xmlFiles.set(entry.path, parsed);
  }
  const designMap = xmlFiles.get(findEntry(reader.entries, (path) => path.toLowerCase() === "designmap.xml") ?? "");
  if (!designMap) throw new IdmlImportError("The IDML design map could not be read.");

  scanUnsupportedFeatures(xmlFiles, diagnostics);
  const styles = parseStyleCatalog(xmlFiles);
  const stories = parseStories(xmlFiles, diagnostics, idmlPath, styles);
  const pages = parsePages(designMap, xmlFiles, reader, stories, diagnostics, styles);
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
    sourceHash: stableHash(input),
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
          payload: { text: sourceFrame.text ?? "", source: "IDML", sourceLabel: sourceFrame.sourceLabel, ...(sourceFrame.hyperlinks?.length ? { hyperlinks: sourceFrame.hyperlinks } : {}) },
          textSpans: sourceFrame.textSpans,
          fontFamily: sourceFrame.fontFamily,
          fontSize: sourceFrame.fontSize,
          fontWeight: sourceFrame.fontWeight,
          fontStyle: sourceFrame.fontStyle,
          lineHeight: sourceFrame.lineHeight,
          letterSpacing: sourceFrame.letterSpacing,
          alignment: sourceFrame.alignment,
          direction: sourceFrame.direction,
          textColor: sourceFrame.textColor,
          textInset: sourceFrame.textInset,
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
      return createV2Frame("SHAPE", page.id, { ...base, payload: { shapeType: sourceFrame.shapeType ?? "RECTANGLE", fill: sourceFrame.fill ?? "transparent", border: sourceFrame.border ?? "transparent", borderWidth: sourceFrame.borderWidth ?? 1, source: "IDML", sourceLabel: sourceFrame.sourceLabel } });
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

export type IdmlXmlErrorDetails = {
  entryPath: string;
  fileName: string;
  problem: string;
  parserMessage?: string;
  line?: number;
  column?: number;
  context?: string;
};

export type IdmlSizeErrorDetails = {
  category: "OUTER_PACKAGE" | "NESTED_IDML" | "INTERNAL_XML" | "LINKED_ASSET" | "STORY_TEXT";
  entryPath: string;
  fileName: string;
  problem: string;
  allowedBytes: number;
  detectedBytes?: number;
};

export class IdmlImportError extends Error {
  constructor(message: string, readonly xmlError?: IdmlXmlErrorDetails, readonly sizeError?: IdmlSizeErrorDetails) {
    super(message);
    this.name = "IdmlImportError";
  }
}

function formatIdmlLimit(bytes: number) {
  return `${Math.round(bytes / MB)} MB`;
}

function archiveLimitProblem(category: IdmlSizeErrorDetails["category"], limit: number) {
  return category === "OUTER_PACKAGE"
    ? `The uploaded package exceeds the ${formatIdmlLimit(limit)} import limit.`
    : `The IDML document exceeds the ${formatIdmlLimit(limit)} import limit.`;
}

function createIdmlSizeError(category: IdmlSizeErrorDetails["category"], entryPath: string, problem: string, allowedBytes: number, detectedBytes?: number) {
  return new IdmlImportError(`IDML import size limit in ${entryPath}: ${problem}`, undefined, {
    category,
    entryPath,
    fileName: basename(entryPath),
    problem,
    allowedBytes,
    ...(detectedBytes === undefined ? {} : { detectedBytes }),
  });
}

function createOuterPackageReader(input: Uint8Array, diagnostics: IdmlDiagnostic[], archivePath: string) {
  return createPackageReader(input, diagnostics, {
    archivePath,
    label: "outer package",
    sizeCategory: "OUTER_PACKAGE",
    maxArchiveBytes: IDML_LIMITS.maxOuterPackageCompressedBytes,
    maxEntries: IDML_LIMITS.maxOuterPackageEntries,
    maxTotalUncompressedBytes: IDML_LIMITS.maxOuterPackageTotalUncompressedBytes,
    maxEntryCompressedBytes: IDML_LIMITS.maxOuterPackageEntryCompressedBytes,
    maxEntryUncompressedBytes: IDML_LIMITS.maxOuterPackageEntryUncompressedBytes,
    allowNestedIdml: true,
  });
}

function createNestedIdmlReader(input: Uint8Array, diagnostics: IdmlDiagnostic[], archivePath: string) {
  return createPackageReader(input, diagnostics, {
    archivePath,
    label: "IDML document",
    sizeCategory: "NESTED_IDML",
    maxArchiveBytes: IDML_LIMITS.maxNestedIdmlCompressedBytes,
    maxEntries: IDML_LIMITS.maxNestedIdmlEntries,
    maxTotalUncompressedBytes: IDML_LIMITS.maxNestedIdmlTotalUncompressedBytes,
    maxEntryCompressedBytes: IDML_LIMITS.maxNestedIdmlEntryCompressedBytes,
    maxEntryUncompressedBytes: IDML_LIMITS.maxNestedIdmlEntryUncompressedBytes,
    allowNestedIdml: false,
  });
}

function createPackageReader(input: Uint8Array, diagnostics: IdmlDiagnostic[], options: PackageReaderOptions): PackageReader {
  if (input.byteLength === 0) throw new IdmlImportError(`The ${options.label} is empty.`);
  if (input.byteLength > options.maxArchiveBytes) {
    const problem = archiveLimitProblem(options.sizeCategory, options.maxArchiveBytes);
    throw createIdmlSizeError(options.sizeCategory, options.archivePath, problem, options.maxArchiveBytes, input.byteLength);
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findSignature(bytes, 0x06054b50, Math.max(0, bytes.length - 65_557));
  if (eocd < 0) throw new IdmlImportError(`The ${options.label} is not a valid ZIP package.`);
  if (eocd + 22 > bytes.length) throw new IdmlImportError("The ZIP end record is malformed.");
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entriesOnDisk = view.getUint16(eocd + 8, true);
  const entries = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entries || entries > options.maxEntries) throw new IdmlImportError("The ZIP package has too many or unsupported archive parts.");
  if (centralOffset + centralSize > bytes.length) throw new IdmlImportError("The ZIP central directory is malformed.");
  const result = new Map<string, ZipEntry>();
  let offset = centralOffset;
  let totalCompressed = 0;
  let totalUncompressed = 0;
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > centralOffset + centralSize || view.getUint32(offset, true) !== 0x02014b50) throw new IdmlImportError("The ZIP central directory is malformed.");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    const localOffset = view.getUint32(offset + 42, true);
    const recordEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > centralOffset + centralSize) throw new IdmlImportError("The ZIP central directory is malformed.");
    const rawName = decodeUtf8(bytes.slice(offset + 46, offset + 46 + nameLength));
    const path = safePackagePath(rawName);
    if (flags & 0x1) throw new IdmlImportError(`Encrypted ZIP entries are not supported: ${path}`);
    if (method !== 0 && method !== 8) throw new IdmlImportError(`Unsupported ZIP compression for ${path}.`);
    if (compressedSize > options.maxEntryCompressedBytes || uncompressedSize > options.maxEntryUncompressedBytes) {
      throw createIdmlSizeError(options.sizeCategory, nestedEntryPath(options.archivePath, path), `A ZIP entry in the ${options.label} exceeds the current import size limit.`, Math.min(options.maxEntryCompressedBytes, options.maxEntryUncompressedBytes), Math.max(compressedSize, uncompressedSize));
    }
    const allowedNestedIdml = options.allowNestedIdml && path.toLowerCase().endsWith(".idml");
    if (!allowedNestedIdml && uncompressedSize > 0 && (compressedSize === 0 || uncompressedSize / compressedSize > IDML_LIMITS.maxCompressionRatio)) throw new IdmlImportError(`ZIP entry exceeds the ${IDML_LIMITS.maxCompressionRatio}:1 compression-ratio safety limit: ${path}`);
    totalCompressed += compressedSize;
    if (totalCompressed > options.maxArchiveBytes) {
      const problem = archiveLimitProblem(options.sizeCategory, options.maxArchiveBytes);
      throw createIdmlSizeError(options.sizeCategory, options.archivePath, problem, options.maxArchiveBytes, totalCompressed);
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > options.maxTotalUncompressedBytes) {
      const problem = archiveLimitProblem(options.sizeCategory, options.maxTotalUncompressedBytes);
      throw createIdmlSizeError(options.sizeCategory, options.archivePath, problem, options.maxTotalUncompressedBytes, totalUncompressed);
    }
    const nestedArchive = /\.(?:zip|jar|gz|idml)$/i.test(path);
    if (nestedArchive && !(options.allowNestedIdml && path.toLowerCase().endsWith(".idml"))) throw new IdmlImportError(`Nested archives are not supported: ${path}`);
    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0xf000) === 0xa000) throw new IdmlImportError(`Symlink entries are not supported: ${path}`);
    if (!result.has(path)) result.set(path, { path, method, compressedSize, uncompressedSize, localOffset, externalAttributes });
    offset = recordEnd;
  }
  if (result.size === 0) throw new IdmlImportError("The ZIP package is empty.");
  diagnostics.push({ severity: "INFO", objectType: "PACKAGE", message: `Read ${result.size} bounded ${options.label} ZIP entries without extracting them to disk.` });
  return {
    entries: result,
    archivePath: options.archivePath,
    read(path) {
      const entry = result.get(path);
      if (!entry) throw new IdmlImportError(`Package entry not found: ${path}`);
      if (entry.localOffset + 30 > bytes.length || view.getUint32(entry.localOffset, true) !== 0x04034b50) throw new IdmlImportError(`Malformed local ZIP header: ${path}`);
      const nameLength = view.getUint16(entry.localOffset + 26, true);
      const extraLength = view.getUint16(entry.localOffset + 28, true);
      const start = entry.localOffset + 30 + nameLength + extraLength;
      const end = start + entry.compressedSize;
      if (end > bytes.length) throw new IdmlImportError(`Malformed ZIP entry: ${path}`);
      const compressed = bytes.subarray(start, end);
      let output: Uint8Array;
      try {
        output = entry.method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: options.maxEntryUncompressedBytes });
      } catch {
        throw new IdmlImportError(`ZIP entry extraction failed safely: ${path}`);
      }
      if (output.byteLength !== entry.uncompressedSize || output.byteLength > options.maxEntryUncompressedBytes) throw new IdmlImportError(`ZIP entry size validation failed: ${path}`);
      return output;
    },
  };
}

type IdmlStyleCatalog = {
  paragraphStyles: Map<string, Record<string, string>>;
  characterStyles: Map<string, Record<string, string>>;
  objectStyles: Map<string, Record<string, string>>;
  swatches: Map<string, Record<string, string>>;
  defaultParagraph: Record<string, string>;
  substitutedFonts: Set<string>;
};

function parseStyleCatalog(files: Map<string, XmlNode>): IdmlStyleCatalog {
  const catalog: IdmlStyleCatalog = { paragraphStyles: new Map(), characterStyles: new Map(), objectStyles: new Map(), swatches: new Map(), defaultParagraph: {}, substitutedFonts: new Set() };
  for (const root of files.values()) {
    for (const node of descendants(root, "ParagraphStyle")) { const id = attr(node, "Self"); if (id) catalog.paragraphStyles.set(id, styleNodeProperties(node)); }
    for (const node of descendants(root, "CharacterStyle")) { const id = attr(node, "Self"); if (id) catalog.characterStyles.set(id, styleNodeProperties(node)); }
    for (const node of descendants(root, "ObjectStyle")) { const id = attr(node, "Self"); if (id) catalog.objectStyles.set(id, styleNodeProperties(node)); }
    for (const node of descendants(root, "Color")) { const id = attr(node, "Self"); if (id) catalog.swatches.set(id, node.attributes); }
    for (const node of descendants(root, "Font")) if (attr(node, "Status") === "Substituted") catalog.substitutedFonts.add(fontName(attr(node, "FontFamily") ?? attr(node, "Name") ?? ""));
  }
  catalog.defaultParagraph = resolveStyle(catalog.paragraphStyles, "ParagraphStyle/$ID/[No paragraph style]");
  return catalog;
}

function styleNodeProperties(node: XmlNode) { const result = { ...node.attributes }; const properties = node.children.find((child) => localName(child.name) === "Properties"); for (const child of properties?.children ?? []) { const value = textContent(child).trim(); if (value) result[localName(child.name)] = value; } return result; }

function resolveStyle(styles: Map<string, Record<string, string>>, reference: string | undefined, seen = new Set<string>()): Record<string, string> {
  if (!reference || seen.has(reference)) return {};
  const style = styles.get(reference);
  if (!style) return {};
  seen.add(reference);
  const basedOn = style.BasedOn ?? style.Parent;
  return { ...resolveStyle(styles, basedOn, seen), ...style };
}

function nearestAncestor(node: XmlNode, name: string) { let current = node.parent; while (current) { if (localName(current.name) === name) return current; current = current.parent; } return undefined; }
function styleNumber(value: string | undefined) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function positiveStyleNumber(value: string | undefined | number) { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; }
function parseInsetSpacing(value: string | undefined) { const values = (value ?? "").trim().split(/[\s,]+/).map(Number).filter(Number.isFinite); if (!values.length) return undefined; const [top, left = top, bottom = top, right = left] = values; return { top: Math.max(0, top), right: Math.max(0, right), bottom: Math.max(0, bottom), left: Math.max(0, left) }; }
function fontName(value: string) { return value.split("\t")[0].split(",")[0].replace(/^Font\//, "").trim(); }
function resolveIdmlColor(value: string | undefined, styles: IdmlStyleCatalog) { if (!value || /^None$/i.test(value) || /Swatch\/None|Unassigned/i.test(value)) return null; const color = styles.swatches.get(value); if (color) { const values = (color.ColorValue ?? "").trim().split(/[\s,]+/).map(Number); if (color.Space === "RGB" && values.length >= 3 && values.every(Number.isFinite)) return rgbHex(values[0], values[1], values[2]); if (color.Space === "CMYK" && values.length >= 4 && values.every(Number.isFinite)) return cmykHex(values[0], values[1], values[2], values[3]); } return safeColor(value); }
function rgbHex(red: number, green: number, blue: number) { return `#${[red, green, blue].map((value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0")).join("")}`; }
function cmykHex(c: number, m: number, y: number, k: number) { const [cyan, magenta, yellow, black] = [c, m, y, k].map((value) => Math.max(0, Math.min(100, value)) / 100); return rgbHex(...([cyan, magenta, yellow].map((value) => (1 - Math.min(1, value * (1 - black) + black)) * 255) as [number, number, number])); }
function parsePages(designMap: XmlNode, files: Map<string, XmlNode>, reader: PackageReader, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], styles: IdmlStyleCatalog) {
  const spreadRefs = descendants(designMap, "Spread").map((node) => attr(node, "src")).filter(Boolean);
  const spreadPaths = spreadRefs.map((src) => resolvePackageReference("", src, files)).filter((path): path is string => Boolean(path));
  const candidates = spreadPaths.length ? spreadPaths : [...files.keys()].filter((path) => /(?:^|\/)Spreads\/.*\.xml$/i.test(path));
  const masterSpreads = new Map<string, XmlNode>();
  for (const root of files.values()) { const masters = localName(root.name) === "MasterSpread" ? [root] : descendants(root, "MasterSpread"); for (const master of masters) { const masterId = attr(master, "Self"); if (masterId) masterSpreads.set(masterId, master); } }
  const pages: IdmlPage[] = [];
  const usedStoryIds = new Set<string>();
  for (const spreadPath of candidates) {
    const spread = files.get(spreadPath);
    if (!spread) continue;
    const pageNodes = descendants(spread, "Page");
    if (!pageNodes.length) {
      const size = parseBounds(attr(spread, "GeometricBounds")) ?? [0, 0, 792, 612];
      pages.push(parsePage(spread, spreadPath, pages.length, size, spread, masterSpreads, reader, stories, diagnostics, usedStoryIds, styles));
      continue;
    }
    for (const pageNode of pageNodes) {
      const bounds = parseBounds(attr(pageNode, "GeometricBounds")) ?? [0, 0, 792, 612];
      pages.push(parsePage(pageNode, spreadPath, pages.length, bounds, spread, masterSpreads, reader, stories, diagnostics, usedStoryIds, styles));
    }
  }
  return pages;
}

function parsePage(pageNode: XmlNode, spreadPath: string, order: number, bounds: [number, number, number, number], spread: XmlNode, masterSpreads: Map<string, XmlNode>, reader: PackageReader, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], usedStoryIds: Set<string>, styles: IdmlStyleCatalog): IdmlPage {
  const [top, left, bottom, right] = bounds;
  const sourceId = attr(pageNode, "Self") || `${spreadPath}:${order}`;
  const id = stableId("idml-page", sourceId);
  const localNodes = itemDescendants(pageNode);
  const itemNodes = localNodes.length ? localNodes : itemDescendants(spread);
  const ownItems = itemNodes.filter((node) => belongsToPage(node, pageNode, bounds));
  const pageFrames = ownItems.map((node, index) => parseFrame(node, id, order, index, bounds, spread, spreadPath, reader, stories, diagnostics, usedStoryIds, styles, { source: "page", sourceObjectId: attr(node, "Self") })).filter((frame): frame is IdmlIntermediateFrame => Boolean(frame));
  const masterFrames = materializeAppliedMasterFrames(pageNode, id, order, bounds, masterSpreads, reader, stories, diagnostics, styles);
  const frames = [...masterFrames, ...pageFrames.map((frame, index) => ({ ...frame, zIndex: index + masterFrames.length, readingOrder: index + masterFrames.length }))];
  return { id, sourceId, order, width: Math.max(1, right - left), height: Math.max(1, bottom - top), left, top, frames };
}

function materializeAppliedMasterFrames(pageNode: XmlNode, pageId: string, pageNumber: number, pageBounds: [number, number, number, number], masterSpreads: Map<string, XmlNode>, reader: PackageReader, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], styles: IdmlStyleCatalog): IdmlIntermediateFrame[] {
  const masterId = attr(pageNode, "AppliedMaster");
  if (!masterId || masterId === "n") return [];
  const master = masterSpreads.get(masterId);
  if (!master) {
    diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: "MASTER_SPREAD", message: `Applied master ${masterId} was not found; master objects were not materialized.`, suggestedAction: "Review the IDML master-spread references." });
    return [];
  }
  const masterPages = descendants(master, "Page");
  const masterPage = masterPages.find((candidate) => samePageCoordinateSystem(candidate, pageNode)) ?? masterPages.find((candidate) => samePageSize(candidate, pageNode));
  if (!masterPage) {
    diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: "MASTER_SPREAD", message: `Applied master ${masterId} has no matching master page; master objects were not materialized.`, suggestedAction: "Review the master/page geometry in InDesign." });
    return [];
  }
  const masterBounds = parseBounds(attr(masterPage, "GeometricBounds"));
  if (!masterBounds) return [];
  const overrideValue = attr(pageNode, "OverrideList") ?? "";
  const overrideIds = new Set(overrideValue.split(/[\s,;]+/).filter(Boolean));
  const candidates = itemDescendants(master);
  const masterUsedStoryIds = new Set<string>();
  return candidates
    .filter((node) => {
      const sourceId = attr(node, "Self");
      return Boolean(sourceId) && !overrideIds.has(sourceId) && !overrideValue.includes(sourceId) && belongsToPage(node, masterPage, masterBounds);
    })
    .map((node, index) => {
      const sourceBounds = parseBounds(attr(node, "GeometricBounds")) ?? transformedPathBounds(node);
      const bounds = sourceBounds ? transformMasterBoundsToPage(sourceBounds, masterPage, pageNode) : undefined;
      return parseFrame(node, pageId, pageNumber, index, pageBounds, master, `MasterSpreads/${masterId}.xml`, reader, stories, diagnostics, masterUsedStoryIds, styles, { source: "master", masterId, sourceObjectId: attr(node, "Self"), bounds });
    })
    .filter((frame): frame is IdmlIntermediateFrame => Boolean(frame));
}

function samePageCoordinateSystem(masterPage: XmlNode, pageNode: XmlNode) {
  return samePageSize(masterPage, pageNode) && sameTransform(attr(masterPage, "ItemTransform"), attr(pageNode, "ItemTransform"));
}

function samePageSize(left: XmlNode, right: XmlNode) {
  const a = parseBounds(attr(left, "GeometricBounds"));
  const b = parseBounds(attr(right, "GeometricBounds"));
  return Boolean(a && b && Math.abs((a[2] - a[0]) - (b[2] - b[0])) < 0.01 && Math.abs((a[3] - a[1]) - (b[3] - b[1])) < 0.01);
}

function sameTransform(left: string | undefined, right: string | undefined) {
  const a = parseTransform(left);
  const b = parseTransform(right);
  return a.every((value, index) => Math.abs(value - b[index]) < 0.01);
}

function transformMasterBoundsToPage(bounds: [number, number, number, number], masterPage: XmlNode, pageNode: XmlNode): [number, number, number, number] {
  const masterToPage = multiplyTransforms(invertTransform(parseTransform(attr(pageNode, "ItemTransform"))), parseTransform(attr(masterPage, "ItemTransform")));
  return transformBounds(bounds, masterToPage);
}

function transformBounds(bounds: [number, number, number, number], matrix: [number, number, number, number, number, number]): [number, number, number, number] {
  const [top, left, bottom, right] = bounds;
  const points = [[left, top], [right, top], [left, bottom], [right, bottom]].map(([x, y]) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]] as [number, number]);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...ys), Math.min(...xs), Math.max(...ys), Math.max(...xs)];
}

function invertTransform(matrix: [number, number, number, number, number, number]): [number, number, number, number, number, number] {
  const [a, b, c, d, tx, ty] = matrix;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-9) return [1, 0, 0, 1, 0, 0];
  const inverseA = d / determinant;
  const inverseB = -b / determinant;
  const inverseC = -c / determinant;
  const inverseD = a / determinant;
  return [inverseA, inverseB, inverseC, inverseD, -(inverseA * tx + inverseC * ty), -(inverseB * tx + inverseD * ty)];
}
type ParseFrameOptions = { source?: "page" | "master"; masterId?: string; sourceObjectId?: string; bounds?: [number, number, number, number] };

function parseFrame(node: XmlNode, pageId: string, pageNumber: number, index: number, pageBounds: [number, number, number, number], spread: XmlNode, spreadPath: string, reader: PackageReader, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], usedStoryIds: Set<string>, styles: IdmlStyleCatalog, options: ParseFrameOptions = {}): IdmlIntermediateFrame | null {
  const bounds = options.bounds ?? parseBounds(attr(node, "GeometricBounds")) ?? transformedPathBounds(node);
  if (!bounds) {
    diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: localName(node.name), message: "Page item has no usable geometric bounds and was skipped.", suggestedAction: "Review the object in InDesign or use Exact Replica." });
    return null;
  }
  const [top, left, bottom, right] = bounds;
  const [, pageLeft] = pageBounds;
  const sourceId = attr(node, "Self") || `${pageId}:${index}`;
  const typeName = localName(node.name);
  const hyperlinks = collectHyperlinks(node, spreadPath);
  const objectStyle = resolveStyle(styles.objectStyles, attr(node, "AppliedObjectStyle"));
  const appearance = { ...objectStyle, ...node.attributes };
  const base = { id: stableId("idml-frame", sourceId), pageId, x: Math.max(0, left - pageLeft), y: Math.max(0, top - pageBounds[0]), width: Math.max(1, right - left), height: Math.max(1, bottom - top), rotation: rotationFromTransform(attr(node, "ItemTransform")), layerName: attr(node, "ItemLayer") || attr(node, "Layer") || "Content", zIndex: index, readingOrder: index, sourceLabel: attr(node, "Name") || sourceId, source: options.source ?? "page", ...(options.masterId ? { masterId: options.masterId } : {}), sourceObjectId: options.sourceObjectId ?? sourceId, altText: attr(node, "AltText") || attr(node, "Label") || attr(node, "Description") || undefined, ...(hyperlinks.length ? { hyperlinks } : {}) };
  if (typeName === "TextFrame") return parseTextFrame(node, base, stories, diagnostics, pageNumber, usedStoryIds, styles);
  if (typeName === "Rectangle" || typeName === "GraphicLine" || typeName === "Oval" || typeName === "Polygon") {
    const link = findLink(node);
    const graphic = typeName === "Rectangle" && attr(node, "ContentType")?.toLowerCase().includes("graphic");
    if (link || graphic) {
      const asset = link ? resolveAsset(link, reader, diagnostics, pageId, pageNumber) : {
        sourcePath: `${spreadPath}#${sourceId}`,
        entryPath: null,
        fileName: sourceId,
        contentType: null,
        bytes: 0,
        supported: false,
      };
      if (graphic && !link) diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: "IMAGE", message: `Missing linked asset for graphic object ${sourceId}.`, suggestedAction: "Add the linked asset to the package or replace the image manually." });
      return { ...base, type: "IMAGE", asset };
    }
    if (typeName === "Polygon") {
      diagnostics.push({ severity: "WARNING", pageId, pageNumber: pageNumber + 1, objectType: "VECTOR", message: "Complex vector path cannot be edited; use Exact Replica.", suggestedAction: "Replace with a simple rectangle or use the future Exact Replica mode." });
      return null;
    }
    return { ...base, type: "SHAPE", shapeType: typeName === "Oval" ? "ELLIPSE" : typeName === "GraphicLine" ? "LINE" : "RECTANGLE", fill: resolveIdmlColor(appearance.FillColor, styles) ?? "transparent", border: resolveIdmlColor(appearance.StrokeColor, styles) ?? "transparent", borderWidth: finite(appearance.StrokeWeight, 1) };
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

function parseTextFrame(node: XmlNode, base: Omit<IdmlIntermediateFrame, "type">, stories: IdmlStory[], diagnostics: IdmlDiagnostic[], pageNumber: number, usedStoryIds: Set<string>, styles: IdmlStyleCatalog): IdmlIntermediateFrame {
  const storyId = attr(node, "ParentStory");
  const story = storyId ? stories.find((item) => item.id === storyId) : undefined;
  const threaded = Boolean(storyId && usedStoryIds.has(storyId));
  const text = threaded ? "" : story?.text ?? textContent(node);
  const spans = threaded ? [{ text: "" }] : story?.spans ?? [{ text }];
  if (storyId) usedStoryIds.add(storyId);
  const objectStyle = resolveStyle(styles.objectStyles, attr(node, "AppliedObjectStyle"));
  const leading = positiveStyleNumber(spans[0]?.leading) ?? positiveStyleNumber(objectStyle.Leading) ?? 0;
  const fontSize = spans[0]?.fontSize ?? positiveStyleNumber(objectStyle.PointSize) ?? 12;
  const requestedFont = spans[0]?.fontFamily ?? objectStyle.AppliedFont ?? attr(node, "FontFamily") ?? attr(node, "AppliedFont") ?? "Default";
  const mappedFont = mapFont(requestedFont);
  if (styles.substitutedFonts.has(fontName(requestedFont)) || requestedFont === "Default" || mappedFont !== "Arial, sans-serif") diagnostics.push({ severity: "WARNING", pageNumber: pageNumber + 1, objectType: "FONT", message: `Font requires browser fallback. Requested: ${fontName(requestedFont)}. Rendered using: ${mappedFont}.`, suggestedAction: "Review typography in Content Studio." });
  if (attr(node, "NextTextFrame") || attr(node, "PreviousTextFrame") || attr(node, "TextFrameIndex") || threaded) diagnostics.push({ severity: "WARNING", pageNumber: pageNumber + 1, objectType: "TEXT", message: "Linked text frames detected — advanced text threading is not yet editable in Content Studio.", suggestedAction: "Review the imported text and split or reconnect it manually." });
  const preferences = descendants(node, "TextFramePreference")[0] ?? descendants(node, "TextFramePreferences")[0];
  const inset = parseInsetSpacing(attr(preferences ?? node, "InsetSpacing"));
  return {
    ...base,
    type: "TEXT",
    text,
    textSpans: spans,
    fontFamily: mappedFont,
    fontWeight: spans[0]?.fontWeight ?? (/bold|black|semi/i.test(objectStyle.FontStyle ?? "") ? 700 : 400),
    fontStyle: spans[0]?.fontStyle ?? (/italic|oblique/i.test(objectStyle.FontStyle ?? "") ? "italic" : "normal"),
    fontSize,
    lineHeight: leading > 0 ? leading / fontSize : 1.2,
    letterSpacing: spans[0]?.letterSpacing ?? styleNumber(objectStyle.Tracking) ?? 0,
    textColor: spans[0]?.color ?? resolveIdmlColor(objectStyle.FillColor, styles) ?? "#111827",
    alignment: mapAlignment(spans[0]?.justification ?? objectStyle.Justification ?? attr(node, "Justification")),
    direction: mapDirection(objectStyle.ParagraphDirection ?? attr(node, "Direction") ?? attr(node, "ParagraphDirection")),
    ...(inset ? { textInset: inset } : {}),
  };
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

function parseStories(files: Map<string, XmlNode>, diagnostics: IdmlDiagnostic[], idmlPath: string, styles: IdmlStyleCatalog) {
  const stories: IdmlStory[] = [];
  for (const [path, root] of files) {
    if (!/Stories\/.*\.xml$/i.test(path) && localName(root.name) !== "Story") continue;
    for (const storyNode of localName(root.name) === "Story" ? [root] : descendants(root, "Story")) {
      const id = attr(storyNode, "Self") || stableId("story", path);
      const spans = collectStorySpans(storyNode, styles);
      const text = spans.map((span) => span.text).join("") || textContent(storyNode);
      const textBytes = Buffer.byteLength(text, "utf8");
      if (textBytes > IDML_LIMITS.maxStoryTextBytes) {
        throw createIdmlSizeError("STORY_TEXT", nestedEntryPath(idmlPath, path), `Story ${id} exceeds the ${formatIdmlLimit(IDML_LIMITS.maxStoryTextBytes)} extracted-text limit.`, IDML_LIMITS.maxStoryTextBytes, textBytes);
      }

      stories.push({ id, text, spans: spans.length ? spans : [{ text }] });
    }
  }
  return stories;
}

function collectStorySpans(story: XmlNode, styles: IdmlStyleCatalog) {
  const result: NonNullable<IdmlStory["spans"]> = [];
  const ranges = descendants(story, "CharacterStyleRange");
  for (const range of ranges) {
    const text = range.children.map((child) => localName(child.name) === "Content" ? textContent(child) : ["ForcedLineBreak"].includes(localName(child.name)) ? "\n" : "").join("");
    if (!text) continue;
    const paragraph = nearestAncestor(range, "ParagraphStyleRange");
    const paragraphStyle = resolveStyle(styles.paragraphStyles, attr(paragraph ?? range, "AppliedParagraphStyle"));
    const characterStyle = resolveStyle(styles.characterStyles, attr(range, "AppliedCharacterStyle"));
    const resolved = { ...styles.defaultParagraph, ...paragraphStyle, ...characterStyle, ...range.attributes };
    const fontStyle = resolved.FontStyle ?? "";
    const marks: NonNullable<IdmlIntermediateFrame["textSpans"]>[number]["marks"] = [];
    if (/bold|black|semi/i.test(fontStyle)) marks.push("bold");
    if (/italic|oblique/i.test(fontStyle)) marks.push("italic");
    if (resolved.Underline === "true") marks.push("underline");
    if (/super/i.test(resolved.Position ?? "")) marks.push("superscript");
    if (/sub/i.test(resolved.Position ?? "")) marks.push("subscript");
    const capitalization = resolved.Capitalization;
    const textTransform = /allcaps|smallcaps/i.test(capitalization ?? "") ? "uppercase" : /lower/i.test(capitalization ?? "") ? "lowercase" : undefined;
    const requestedFont = resolved.AppliedFont ?? resolved.FontFamily;
    const size = positiveStyleNumber(resolved.PointSize);
    result.push({
      text,
      ...(marks.length ? { marks } : {}),
      ...(size ? { fontSize: size } : {}),
      ...(resolveIdmlColor(resolved.FillColor, styles) ? { color: resolveIdmlColor(resolved.FillColor, styles)! } : {}),
      ...(requestedFont ? { fontFamily: mapFont(requestedFont) } : {}),
      ...(/bold|black|semi/i.test(fontStyle) ? { fontWeight: 700 } : {}),
      ...(/italic|oblique/i.test(fontStyle) ? { fontStyle: "italic" as const } : {}),
      ...(styleNumber(resolved.Tracking) !== undefined ? { letterSpacing: styleNumber(resolved.Tracking)! / 1000 * (size ?? 12) } : {}),
      ...(styleNumber(resolved.BaselineShift) !== undefined ? { baselineShift: styleNumber(resolved.BaselineShift)! } : {}),
      ...(styleNumber(resolved.HorizontalScale) !== undefined ? { horizontalScale: styleNumber(resolved.HorizontalScale)! } : {}),
      ...(styleNumber(resolved.VerticalScale) !== undefined ? { verticalScale: styleNumber(resolved.VerticalScale)! } : {}),
      ...(textTransform ? { textTransform } : {}),
      ...(resolved.Justification ? { justification: resolved.Justification } : {}),
      ...(positiveStyleNumber(resolved.Leading) ? { leading: positiveStyleNumber(resolved.Leading)! } : {}),
    });
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
  const entry = reader.entries.get(entryPath);
  if (entry && entry.uncompressedSize > IDML_LIMITS.maxLinkedAssetBytes) {
    throw createIdmlSizeError("LINKED_ASSET", nestedEntryPath(reader.archivePath, entryPath), `This linked asset exceeds the ${formatIdmlLimit(IDML_LIMITS.maxLinkedAssetBytes)} import limit.`, IDML_LIMITS.maxLinkedAssetBytes, entry.uncompressedSize);
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
    fontSubstitutions: diagnostics.filter((item) => item.objectType === "FONT").length,
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

function nestedEntryPath(archivePath: string, entryPath: string) {
  return archivePath === entryPath ? archivePath : `${archivePath} -> ${entryPath}`;
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

function parseIdmlXmlEntry(data: Uint8Array, entryPath: string) {
  let source: string;
  try {
    source = decodeIdmlXml(data);
  } catch (error) {
    throw createIdmlXmlError(entryPath, error instanceof Error ? error.message : "Unable to decode XML.");
  }
  return parseSafeXml(source, entryPath);
}

function parseSafeXml(source: string, entryPath: string): XmlNode {
  let parser: SaxesParser | null = null;
  try {
    if (/<!DOCTYPE\b|<!ENTITY\b/i.test(source)) throw new Error("External XML entities and doctypes are not allowed.");
    const root: XmlNode = { name: "#root", attributes: {}, children: [], text: "" };
    const stack = [root];
    let nodes = 0;
    parser = new SaxesParser({ position: true, fileName: entryPath });
    parser.on("opentag", (tag) => {
      const node: XmlNode = {
        name: tag.name,
        attributes: Object.fromEntries(Object.entries(tag.attributes).map(([name, value]) => [localName(name), String(value)])),
        children: [],
        text: "",
        parent: stack[stack.length - 1],
      };
      stack[stack.length - 1].children.push(node);
      nodes += 1;
      if (nodes > IDML_LIMITS.maxXmlNodes) throw new Error("XML contains too many nodes.");
      if (!tag.isSelfClosing) {
        stack.push(node);
        if (stack.length > IDML_LIMITS.maxXmlDepth) throw new Error("XML nesting is too deep.");
      }
    });
    parser.on("closetag", (tag) => {
      if (!tag.isSelfClosing) stack.pop();
    });
    parser.on("text", (value) => { stack[stack.length - 1].text += value; });
    parser.on("cdata", (value) => { stack[stack.length - 1].text += value; });
    parser.write(source).close();
    return root;
  } catch (error) {
    throw createIdmlXmlError(
      entryPath,
      error instanceof Error ? error.message : "Malformed XML.",
      source,
      parser ? { line: parser.line, column: parser.column + 1, position: parser.position } : undefined,
    );
  }
}

function decodeIdmlXml(data: Uint8Array) {
  const encoding = xmlEncoding(data);
  let source: string;
  try {
    source = new TextDecoder(encoding, { fatal: true }).decode(data);
  } catch {
    throw new Error(`Unable to decode XML as ${encoding.toUpperCase()}.`);
  }
  const declaration = /^\s*<\?xml\b[^>]*\bencoding\s*=\s*["']([^"']+)["'][^>]*\?>/i.exec(source)?.[1]?.toLowerCase().replaceAll("_", "-");
  if (declaration && !xmlDeclarationMatchesEncoding(declaration, encoding)) throw new Error(`XML declaration encoding ${declaration.toUpperCase()} does not match the entry bytes.`);
  return source;
}

function xmlEncoding(data: Uint8Array): "utf-8" | "utf-16le" | "utf-16be" {
  if (data[0] === 0xff && data[1] === 0xfe) return "utf-16le";
  if (data[0] === 0xfe && data[1] === 0xff) return "utf-16be";
  if (data[0] === 0x3c && data[1] === 0x00) return "utf-16le";
  if (data[0] === 0x00 && data[1] === 0x3c) return "utf-16be";
  return "utf-8";
}

function xmlDeclarationMatchesEncoding(declaration: string, encoding: "utf-8" | "utf-16le" | "utf-16be") {
  if (declaration === "utf-8" || declaration === "utf8") return encoding === "utf-8";
  if (declaration === "utf-16") return encoding === "utf-16le" || encoding === "utf-16be";
  return declaration === encoding;
}

function createIdmlXmlError(entryPath: string, parserMessage: string, source?: string, position?: { line: number; column: number; position: number }) {
  const problem = xmlProblem(parserMessage);
  const line = position && Number.isFinite(position.line) ? position.line : undefined;
  const column = position && Number.isFinite(position.column) ? position.column : undefined;
  const context = source && position ? nearbyXmlContext(source, position.position) : undefined;
  const location = line && column ? `\nat line ${line}, column ${column}.` : "";
  return new IdmlImportError(`IDML XML error in ${entryPath}:\n${problem}${location}`, {
    entryPath,
    fileName: basename(entryPath),
    problem,
    parserMessage: compactXmlMessage(parserMessage),
    ...(line && column ? { line, column } : {}),
    ...(context ? { context } : {}),
  });
}

function xmlProblem(message: string) {
  if (/unexpected close tag|mismatched.*(?:close|end) tag/i.test(message)) return "Mismatched XML closing tag.";
  return compactXmlMessage(message);
}

function compactXmlMessage(message: string) {
  return message.replace(/^.*?:\d+:\d+:\s*/u, "").replace(/\s*\r?\n\s*/gu, " ").trim().slice(0, 320) || "Malformed XML.";
}

function nearbyXmlContext(source: string, position: number) {
  const slice = source.slice(Math.max(0, Math.min(position, source.length) - 240), Math.min(source.length, position + 80));
  const tags = [...slice.matchAll(/<\/?([A-Za-z_][\w:.-]*)\b[^>]*>/g)].map((match) => `${match[0].startsWith("</") ? "</" : "<"}${match[1]}>`).slice(-4);
  return tags.length ? tags.join(" ") : undefined;
}
function scanUnsafeLinks(node: XmlNode, sourcePath: string, diagnostics: IdmlDiagnostic[]) {
  for (const hyperlink of collectHyperlinks(node, sourcePath)) if (!hyperlink.active) diagnostics.push({ severity: "WARNING", objectType: "HYPERLINK", message: `Hyperlink requires review in ${sourcePath}.`, suggestedAction: "Preserved for import; unsafe activation disabled if required." });
  node.children.forEach((child) => scanUnsafeLinks(child, sourcePath, diagnostics));
}

function collectHyperlinks(node: XmlNode, sourcePath: string): IdmlHyperlink[] {
  return Object.entries(node.attributes)
    .filter(([key]) => /(?:href|url|uri|link)/i.test(key))
    .map(([, value]) => value.trim())
    .filter(Boolean)
    .map((url) => ({ url, active: /^https?:\/\//i.test(url), sourcePath }));
}

const IMPORTABLE_ITEM_TYPES = new Set(["TextFrame", "Rectangle", "GraphicLine", "Oval", "Polygon", "Table"]);

function itemDescendants(node: XmlNode): XmlNode[] {
  const result: XmlNode[] = [];
  for (const child of node.children) {
    if (IMPORTABLE_ITEM_TYPES.has(localName(child.name))) result.push(child);
    result.push(...itemDescendants(child));
  }
  return result;
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
function transformedPathBounds(node: XmlNode): [number, number, number, number] | null {
  const matrix = spreadTransform(node);
  const points = descendants(node, "PathPointType")
    .map((point) => (attr(point, "Anchor") ?? "").trim().split(/[\s,]+/).map(Number))
    .filter((point): point is [number, number] => point.length === 2 && point.every(Number.isFinite));
  if (!points.length) return null;
  const transformed = points.map(([x, y]) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]] as [number, number]);
  const xs = transformed.map(([x]) => x);
  const ys = transformed.map(([, y]) => y);
  return [Math.min(...ys), Math.min(...xs), Math.max(...ys), Math.max(...xs)];
}

function spreadTransform(node: XmlNode): [number, number, number, number, number, number] {
  let matrix = parseTransform(attr(node, "ItemTransform"));
  let current = node.parent;
  while (current && localName(current.name) !== "Spread") {
    if (localName(current.name) === "Group") matrix = multiplyTransforms(parseTransform(attr(current, "ItemTransform")), matrix);
    current = current.parent;
  }
  return matrix;
}

function multiplyTransforms(parent: [number, number, number, number, number, number], child: [number, number, number, number, number, number]): [number, number, number, number, number, number] {
  const [a, b, c, d, tx, ty] = parent;
  const [e, f, g, h, ux, uy] = child;
  return [a * e + c * f, b * e + d * f, a * g + c * h, b * g + d * h, a * ux + c * uy + tx, b * ux + d * uy + ty];
}
function parseTransform(value: string | undefined): [number, number, number, number, number, number] {
  const values = (value ?? "").trim().split(/[\s,]+/).map(Number);
  return values.length === 6 && values.every(Number.isFinite) ? values as [number, number, number, number, number, number] : [1, 0, 0, 1, 0, 0];
}
function parseBounds(value: string | undefined): [number, number, number, number] | null { const values = (value ?? "").trim().split(/[\s,]+/).map(Number); return values.length === 4 && values.every(Number.isFinite) ? values as [number, number, number, number] : null; }
function finite(value: string | undefined, fallback: number) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function rotationFromTransform(value: string | undefined) { const values = (value ?? "").trim().split(/[\s,]+/).map(Number); return values.length >= 4 && values.slice(0, 4).every(Number.isFinite) ? Math.round(Math.atan2(values[1], values[0]) * 180 / Math.PI * 100) / 100 : 0; }
function belongsToPage(node: XmlNode, pageNode: XmlNode, bounds: [number, number, number, number]) { const pageRef = attr(node, "ParentPage") || attr(node, "ParentPageRef"); if (pageRef) return pageRef === attr(pageNode, "Self"); const item = parseBounds(attr(node, "GeometricBounds")) ?? transformedPathBounds(node); if (!item) return false; const [top, left, bottom, right] = item; const [pageTop, pageLeft, pageBottom, pageRight] = bounds; const centerX = (left + right) / 2; const centerY = (top + bottom) / 2; return centerX >= pageLeft && centerX <= pageRight && centerY >= pageTop && centerY <= pageBottom; }
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
function mapAlignment(value: string | undefined): "left" | "center" | "right" | "justify" { if (/justify|fully/i.test(value ?? "")) return "justify"; if (/center/i.test(value ?? "")) return "center"; if (/right|end/i.test(value ?? "")) return "right"; return "left"; }
function mapDirection(value: string | undefined): "LTR" | "RTL" | "AUTO" { if (/rtl|right.?to.?left/i.test(value ?? "")) return "RTL"; if (/auto/i.test(value ?? "")) return "AUTO"; return "LTR"; }
function mapFont(value: string) { const requested = fontName(value).replace(/[^A-Za-z0-9 .,-]/g, "").trim(); if (!requested || /^(arial|default)$/i.test(requested)) return "Arial, sans-serif"; const fallback = /minion|garamond|times|serif|bookman|book antiqu/i.test(requested) ? "Georgia, serif" : /trebuchet/i.test(requested) ? "Trebuchet MS, Arial, sans-serif" : "Arial, sans-serif"; return `"${requested}", ${fallback}`; }
function safeColor(value: string | undefined) {
  if (!value || /^None$/i.test(value) || /Swatch\/None|Unassigned/i.test(value)) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(value.trim())) return value.trim();
  if (/white|paper/i.test(value)) return "#ffffff";
  if (/black/i.test(value)) return "#000000";
  const cmyk = value.match(/C\s*=\s*([\d.]+)\s*M\s*=\s*([\d.]+)\s*Y\s*=\s*([\d.]+)\s*K\s*=\s*([\d.]+)/i);
  if (!cmyk) return null;
  const [c, m, y, k] = cmyk.slice(1).map(Number).map((component) => Math.max(0, Math.min(100, component)) / 100);
  return `#${[c, m, y].map((component) => Math.round((1 - Math.min(1, component * (1 - k) + k)) * 255).toString(16).padStart(2, "0")).join("")}`;
}
export function idmlPreviewKey(sourcePath: string) { return `idml-preview:${stableHash(new TextEncoder().encode(sourcePath))}`; }
export function idmlReplicaKey(sourcePath: string) { return `idml-replica:${stableHash(new TextEncoder().encode(sourcePath))}`; }
function stableId(prefix: string, source: string) { return `${prefix}-${stableHash(new TextEncoder().encode(source)).slice(0, 12)}`; }
export function hashJsonValue(value: unknown) { return stableHash(new TextEncoder().encode(JSON.stringify(value ?? null))); }

function stableHash(data: Uint8Array) { return createHash("sha256").update(data).digest("hex"); }
function decodeUtf8(data: Uint8Array) { return new TextDecoder("utf-8", { fatal: false }).decode(data); }
