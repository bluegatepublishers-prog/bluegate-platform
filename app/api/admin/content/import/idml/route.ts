import { NextResponse } from "next/server";
import { Prisma, ResourceAudience, ResourceType } from "@prisma/client";

import { analyzeIdmlPackage, hashJsonValue, IDML_LIMITS, idmlPreviewKey, idmlReplicaKey, IdmlImportError, mapIntermediateToV2, type IdmlAnalysis, type IdmlSizeErrorDetails, type IdmlXmlErrorDetails } from "@/lib/idml-import";
import { normalizeContentDocument, type ContentDocument } from "@/lib/content-document";
import { getContentLayoutVersion, type LayoutV2VisualMode } from "@/lib/content-layout-v2";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { saveBookStructureNode, type BookStructureNodeType, type BookStructureWriteInput } from "@/lib/book-structure-management";
import { getStorageProvider } from "@/lib/storage/provider";
import { sanitizeUploadFilename } from "@/lib/storage/upload-policy";

const NODE_TYPES: BookStructureNodeType[] = ["PART", "UNIT", "CHAPTER", "MODULE", "TOPIC"];

export async function POST(request: Request) {
  try {
    const actor = await requireLivePublisherAdmin();
    const form = await request.formData();
    const action = String(form.get("action") ?? "analyze");
    const bookId = String(form.get("bookId") ?? "");
    const nodeId = String(form.get("nodeId") ?? "");
    const nodeType = String(form.get("nodeType") ?? "") as BookStructureNodeType;
    if (!bookId || !nodeId || !NODE_TYPES.includes(nodeType)) return jsonError("A valid Content Studio target is required.", 400);
    const file = form.get("package");
    if (!(file instanceof File)) return jsonError("Upload an InDesign package ZIP or IDML file.", 400);
    const lowerFileName = file.name.toLowerCase();
    if (lowerFileName.endsWith(".indd")) return jsonError("Please export/package the document with IDML and linked assets.", 400);
    if (!lowerFileName.endsWith(".zip") && !lowerFileName.endsWith(".idml")) return jsonError("Upload an InDesign package ZIP or IDML file.", 400);
    const directIdml = lowerFileName.endsWith(".idml");
    const uploadLimit = directIdml ? IDML_LIMITS.maxNestedIdmlCompressedBytes : IDML_LIMITS.maxOuterPackageCompressedBytes;
    if (file.size > uploadLimit) {
      const sizeError: IdmlSizeErrorDetails = {
        category: directIdml ? "NESTED_IDML" : "OUTER_PACKAGE",
        entryPath: file.name,
        fileName: file.name,
        problem: directIdml ? "The IDML document exceeds the 250 MB import limit." : "The uploaded package exceeds the 300 MB import limit.",
        allowedBytes: uploadLimit,
        detectedBytes: file.size,
      };
      return jsonError("Import analysis stopped because the uploaded file exceeds the current safe size limit.", 400, undefined, sizeError);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const target = await loadImportTarget(actor.publisherId, bookId, nodeType, nodeId);
    if (!target) return jsonError("The selected Content Studio item was not found.", 404);
    const analysis = analyzeIdmlPackage(bytes, file.name);
    const currentContentHash = hashJsonValue(target.content);
    if (action !== "confirm") {
      return NextResponse.json({ ok: true, phase: "ANALYZED", analysis: responseAnalysis(analysis), currentContentHash, hasExistingV2: getContentLayoutVersion(normalizeContentDocument(target.content)) === 2 });
    }
    if (analysis.summary.errors > 0) return jsonError("Resolve import errors before confirming this package.", 400);
    const pageModes = parsePageModes(form.get("pageModes"));
    const unavailableExact = Object.entries(pageModes).find(([pageId, mode]) => mode === "EXACT_REPLICA" && !analysis.intermediate.pages.find((page) => page.id === pageId)?.referenceVisual?.supported);
    if (unavailableExact) return jsonError("Exact Replica is unavailable for one or more selected pages; provide a matching reference PDF/page image or choose Editable.", 400);
    const expectedContentHash = String(form.get("currentContentHash") ?? "");
    if (!expectedContentHash || expectedContentHash !== currentContentHash) return jsonError("The Content Studio item changed after analysis. Analyze it again before confirming.", 409);
    const mode = form.get("mode") === "APPEND" ? "APPEND" : "REPLACE";
    const createdKeys: string[] = [];
    const createdResourceIds: string[] = [];
    try {
      const resourceIds = await persistAssets(actor.publisherId, bookId, nodeId, analysis, createdKeys, createdResourceIds);
      Object.assign(resourceIds, await persistReferenceVisuals(actor.publisherId, bookId, nodeId, analysis, createdKeys, createdResourceIds));
      const imported = patchImportedResources(mapIntermediateToV2(analysis.intermediate, pageModes), resourceIds);
      const applied = mode === "APPEND" ? appendPages(normalizeContentDocument(target.content), imported) : imported;
      const saved = await saveBookStructureNode(bookId, { ...target.writeInput, content: applied as unknown as Prisma.InputJsonValue });
      return NextResponse.json({ ok: true, phase: "CONFIRMED", nodeId: saved.id, document: applied, createdResourceIds });
    } catch (error) {
      await Promise.allSettled(createdKeys.map((key) => getStorageProvider().deleteObject({ key })));
      if (createdResourceIds.length) await prisma.resource.deleteMany({ where: { id: { in: createdResourceIds }, publisherId: actor.publisherId, bookId } });
      throw error;
    }
  } catch (error) {
    const xmlError = error instanceof IdmlImportError ? error.xmlError : undefined;
    const sizeError = error instanceof IdmlImportError ? error.sizeError : undefined;
    if (xmlError) {
      console.error("IDML XML analysis failed", {
        entryPath: xmlError.entryPath,
        line: xmlError.line,
        column: xmlError.column,
        context: xmlError.context,
        parserMessage: xmlError.parserMessage,
      });
    }
    if (sizeError) console.error("IDML import stopped at a size limit", sizeError);
    const status = error instanceof IdmlImportError || error instanceof Error && /safety limit|not a valid ZIP|must contain|Malformed|external XML|Unsafe ZIP|not supported|Please export/i.test(error.message) ? 400 : 500;
    return jsonError(error instanceof Error ? error.message : "Import failed safely. Existing content was not changed.", status, xmlError, sizeError);
  }
}

function responseAnalysis(analysis: IdmlAnalysis) {
  return {
    document: analysis.document,
    diagnostics: analysis.diagnostics,
    previewResourceUrls: analysis.previewResourceUrls,
    assets: analysis.assets,
    referenceVisuals: analysis.referenceVisuals,
    pageRecommendations: analysis.pageRecommendations,
    summary: analysis.summary,
    sourceHash: analysis.sourceHash,
  };
}

async function persistAssets(publisherId: string, bookId: string, nodeId: string, analysis: IdmlAnalysis, createdKeys: string[], createdResourceIds: string[]) {
  const resourceIds: Record<string, string> = {};
  for (const asset of analysis.intermediate.assets) {
    if (!asset.supported || !asset.data || !asset.entryPath) continue;
    const safeName = sanitizeUploadFilename(asset.fileName);
    const key = `resources/files/${publisherId}/idml-import/${bookId}/${nodeId}/${analysis.sourceHash}-${safeName}`;
    const existing = await prisma.resource.findFirst({ where: { publisherId, bookId, fileUrl: key, archived: false }, select: { id: true } });
    if (existing) {
      resourceIds[idmlPreviewKey(asset.sourcePath)] = existing.id;
      continue;
    }
    await getStorageProvider().putObject({ key, body: asset.data, contentType: asset.contentType ?? "application/octet-stream", customMetadata: { source: "IDML", sourcePath: asset.sourcePath } });
    createdKeys.push(key);
    const resource = await prisma.resource.create({
      data: {
        title: asset.fileName,
        publisherId,
        description: "Imported linked asset from an InDesign Package.",
        subject: "",
        classLevel: "",
        bookId,
        chapterId: null,
        moduleId: null,
        type: ResourceType.IMAGE,
        audience: ResourceAudience.BOTH,
        fileUrl: key,
        originalFileName: asset.fileName,
        mimeType: asset.contentType,
        fileSizeBytes: BigInt(asset.data.byteLength),
        published: false,
        archived: false,
      },
      select: { id: true },
    });
    createdResourceIds.push(resource.id);
    resourceIds[idmlPreviewKey(asset.sourcePath)] = resource.id;
  }
  return resourceIds;
}

async function persistReferenceVisuals(publisherId: string, bookId: string, nodeId: string, analysis: IdmlAnalysis, createdKeys: string[], createdResourceIds: string[]) {
  const resourceIds: Record<string, string> = {};
  for (const visual of analysis.intermediate.referenceVisuals) {
    if (!visual.supported || !visual.data) continue;
    const replicaKey = idmlReplicaKey(visual.sourcePath);
    if (resourceIds[replicaKey]) continue;
    const safeName = sanitizeUploadFilename(visual.fileName);
    const key = `resources/files/${publisherId}/idml-replica/${bookId}/${nodeId}/${visual.sourceHash}-${safeName}`;
    const existing = await prisma.resource.findFirst({ where: { publisherId, bookId, fileUrl: key, archived: false }, select: { id: true } });
    if (existing) {
      resourceIds[replicaKey] = existing.id;
      continue;
    }
    await getStorageProvider().putObject({ key, body: visual.data, contentType: visual.contentType, customMetadata: { source: "IDML_REPLICA", sourceHash: visual.sourceHash } });
    createdKeys.push(key);
    const resource = await prisma.resource.create({
      data: {
        title: `Replica visual — ${visual.fileName}`,
        publisherId,
        description: "Protected reference visual imported from an InDesign Package.",
        subject: "",
        classLevel: "",
        bookId,
        chapterId: null,
        moduleId: null,
        type: visual.sourceKind === "PDF" ? ResourceType.PDF : ResourceType.IMAGE,
        audience: ResourceAudience.BOTH,
        fileUrl: key,
        originalFileName: visual.fileName,
        mimeType: visual.contentType,
        fileSizeBytes: BigInt(visual.data.byteLength),
        published: false,
        archived: false,
      },
      select: { id: true },
    });
    createdResourceIds.push(resource.id);
    resourceIds[replicaKey] = resource.id;
  }
  return resourceIds;
}
function parsePageModes(value: FormDataEntryValue | null): Record<string, LayoutV2VisualMode> {
  if (typeof value !== "string" || value.length > 20_000) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter(([, mode]) => mode === "EDITABLE" || mode === "EXACT_REPLICA")) as Record<string, LayoutV2VisualMode>;
  } catch { return {}; }
}

function patchImportedResources(document: ContentDocument, resourceIds: Record<string, string>) {
  const next = JSON.parse(JSON.stringify(document)) as ContentDocument;
  for (const page of next.pageLayout?.pages ?? []) {
    if (page.replica?.resourceId?.startsWith("idml-replica:")) page.replica.resourceId = resourceIds[page.replica.resourceId];
    for (const frame of page.frames) patchFrame(frame, resourceIds);
  }
  return next;
}

function patchFrame(frame: NonNullable<ContentDocument["pageLayout"]>["pages"][number]["frames"][number], resourceIds: Record<string, string>) {
  if (frame.resourceId?.startsWith("idml-preview:")) {
    frame.resourceId = resourceIds[frame.resourceId];
  }
  if (frame.payload && typeof frame.payload === "object") {
    const payload = frame.payload as Record<string, unknown>;
    if (typeof payload.previewResourceKey === "string") {
      const resourceId = resourceIds[payload.previewResourceKey];
      if (resourceId) frame.resourceId = resourceId;
      delete payload.previewResourceKey;
    }
  }
  frame.children?.forEach((child) => patchFrame(child, resourceIds));
}

function appendPages(current: ContentDocument, imported: ContentDocument) {
  if (getContentLayoutVersion(current) !== 2 || !current.pageLayout || !imported.pageLayout) return imported;
  const existingIds = new Set(current.pageLayout.pages.map((page) => page.id));
  const existingBlockIds = new Set(current.blocks.map((block) => block.id));
  const blockIdMap = new Map<string, string>();
  const importedBlocks = imported.blocks.map((block) => {
    let id = block.id;
    if (existingBlockIds.has(id)) id = `${id}-append-${current.pageLayout!.pages.length + 1}`;
    existingBlockIds.add(id);
    blockIdMap.set(block.id, id);
    return { ...block, id };
  });
  const pages = imported.pageLayout.pages.map((page, index) => {
    let id = page.id;
    if (existingIds.has(id)) id = `${id}-append-${current.pageLayout!.pages.length + index + 1}`;
    existingIds.add(id);
    return { ...page, id, order: current.pageLayout!.pages.length + index, frames: page.frames.map((frame) => setFramePageId(frame, id, blockIdMap)) };
  });
  return { ...current, layoutVersion: 2, blocks: [...current.blocks, ...importedBlocks], pageLayout: { ...current.pageLayout, pages: [...current.pageLayout.pages, ...pages] } };
}

async function loadImportTarget(publisherId: string, bookId: string, type: BookStructureNodeType, id: string) {
  const book = await prisma.book.findFirst({ where: { id: bookId, publisherId }, select: { id: true } });
  if (!book) return null;
  const common = { id: true, title: true, subtitle: true, shortTitle: true, slug: true, description: true, estimatedMinutes: true, published: true, content: true } as const;
  if (type === "PART") {
    const row = await prisma.bookPart.findFirst({ where: { id, bookId }, select: { ...common, kind: true, code: true } });
    return row && { content: row.content, writeInput: { type, id, title: row.title, subtitle: row.subtitle, shortTitle: row.shortTitle, code: row.code, slug: row.slug, description: row.description, estimatedMinutes: row.estimatedMinutes, published: row.published, partKind: row.kind } satisfies BookStructureWriteInput };
  }
  if (type === "UNIT") {
    const row = await prisma.bookUnit.findFirst({ where: { id, bookId }, select: { ...common, partId: true, number: true, code: true } });
    return row && { content: row.content, writeInput: { type, id, parentId: row.partId, title: row.title, subtitle: row.subtitle, shortTitle: row.shortTitle, code: row.code, slug: row.slug, label: row.number, description: row.description, estimatedMinutes: row.estimatedMinutes, published: row.published } satisfies BookStructureWriteInput };
  }
  if (type === "CHAPTER") {
    const row = await prisma.bookChapter.findFirst({ where: { id, bookId }, select: { ...common, unitId: true, partId: true, chapterNumber: true, thumbnail: true, startPage: true, endPage: true } });
    return row && { content: row.content, writeInput: { type, id, parentId: row.unitId, secondaryParentId: row.partId, title: row.title, subtitle: row.subtitle, shortTitle: row.shortTitle, slug: row.slug, label: String(row.chapterNumber), description: row.description, estimatedMinutes: row.estimatedMinutes, imageUrl: row.thumbnail, pageStart: row.startPage, pageEnd: row.endPage, published: row.published } satisfies BookStructureWriteInput };
  }
  if (type === "MODULE") {
    const row = await prisma.bookModule.findFirst({ where: { id, bookId }, select: { ...common, chapterId: true, number: true, code: true } });
    return row && { content: row.content, writeInput: { type, id, parentId: row.chapterId, title: row.title, subtitle: row.subtitle, shortTitle: row.shortTitle, code: row.code, slug: row.slug, label: row.number, description: row.description, estimatedMinutes: row.estimatedMinutes, published: row.published } satisfies BookStructureWriteInput };
  }
  const row = await prisma.bookTopic.findFirst({ where: { id, bookId }, select: { ...common, chapterId: true, moduleId: true, number: true, code: true } });
  return row && { content: row.content, writeInput: { type, id, parentId: row.chapterId, secondaryParentId: row.moduleId, title: row.title, subtitle: row.subtitle, shortTitle: row.shortTitle, code: row.code, slug: row.slug, label: row.number, description: row.description, estimatedMinutes: row.estimatedMinutes, published: row.published } satisfies BookStructureWriteInput };
}

function setFramePageId(frame: NonNullable<ContentDocument["pageLayout"]>["pages"][number]["frames"][number], pageId: string, blockIdMap = new Map<string, string>()): NonNullable<ContentDocument["pageLayout"]>["pages"][number]["frames"][number] {
  const contentRef = frame.contentRef?.blockId && blockIdMap.has(frame.contentRef.blockId) ? { ...frame.contentRef, blockId: blockIdMap.get(frame.contentRef.blockId) } : frame.contentRef;
  return { ...frame, pageId, ...(contentRef ? { contentRef } : {}), children: frame.children?.map((child) => ({ ...setFramePageId(child, pageId, blockIdMap), parentId: frame.id })) };
}

function jsonError(message: string, status: number, xmlError?: IdmlXmlErrorDetails, sizeError?: IdmlSizeErrorDetails) {
  const idmlXmlError = xmlError ? {
    entryPath: xmlError.entryPath,
    fileName: xmlError.fileName,
    problem: xmlError.problem,
    ...(xmlError.line && xmlError.column ? { line: xmlError.line, column: xmlError.column } : {}),
  } : undefined;
  const idmlSizeError = sizeError ? {
    category: sizeError.category,
    entryPath: sizeError.entryPath,
    fileName: sizeError.fileName,
    problem: sizeError.problem,
    allowedBytes: sizeError.allowedBytes,
    ...(sizeError.detectedBytes === undefined ? {} : { detectedBytes: sizeError.detectedBytes }),
  } : undefined;
  return NextResponse.json({ ok: false, message, ...(idmlXmlError ? { idmlXmlError } : {}), ...(idmlSizeError ? { idmlSizeError } : {}) }, { status });
}
