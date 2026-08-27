import { Prisma } from "@prisma/client";

import {
  isLinkedAssetBlock,
  isMediaBlock,
  normalizeContentDocument,

  type ContentDocument,
} from "@/lib/content-document";
import { getV2AssessmentLauncherPayload } from "@/lib/v2-assessment-launcher";
import { prisma } from "@/lib/prisma";
import { resolveCurrentBookPdfVersion } from "@/lib/book-pdf-version";
import { buildSmartBookProtectedReleasePayloadFromDatabase, parseSmartBookProtectedReleasePayload, validateSafeAssessmentConsistency, validateSafeQuestionConsistency, type SmartBookProtectedReleasePayload } from "@/lib/smart-book-release-protected";
import { isPublisherUploadUrl, uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import type { UploadScope } from "@/lib/storage/types";

export const SMART_BOOK_RELEASE_MANIFEST_SCHEMA_VERSION = 2 as const;

export const SMART_BOOK_MANIFEST_DEPENDENCY_KINDS = [
  "RESOURCE",
  "VIDEO_LESSON",
  "BOOK_CHAPTER",
  "BOOK_MODULE",
  "CHAPTER_ACTIVITY",
  "PUBLISHER_WORKSHEET",
  "PUBLISHER_ASSESSMENT",
  "BOOK_EXERCISE",
  "BOOK_EXERCISE_GROUP",
  "BOOK_QUESTION",
  "CONTENT_SECTION",
] as const;

export type SmartBookManifestDependencyKind = (typeof SMART_BOOK_MANIFEST_DEPENDENCY_KINDS)[number];
export type SmartBookHierarchyKind = "FRONT_MATTER" | "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC" | "EXERCISE";
export type SmartBookStorageReferenceKind = "OBJECT_KEY" | "MANAGED_URL" | "EXTERNAL_REFERENCE" | "LEGACY_URL";

export type SafeManifestJson =
  | string
  | number
  | boolean
  | null
  | SafeManifestJson[]
  | { [key: string]: SafeManifestJson };

export type SmartBookManifestIdentity = {
  publisherId: string;
  bookId: string;
  targetType: "BOOK";
  targetId: string;
  sourceUpdatedAt: string;
};

export type SmartBookManifestBook = {
  title: string;
  slug: string;
  subtitle: string | null;
  edition: string | null;
};

export type SmartBookManifestHierarchyNode = {
  sourceId: string;
  kind: SmartBookHierarchyKind;
  parentSourceId: string | null;
  partSourceId: string | null;
  unitSourceId: string | null;
  chapterSourceId: string | null;
  moduleSourceId: string | null;
  topicSourceId: string | null;
  title: string;
  label: string | null;
  number: number | null;
  displayOrder: number;
  startPage: number | null;
  endPage: number | null;
  releaseVisible: true;
};

export type SmartBookManifestPdf = {
  bookPdfVersionId: string;
  objectKey: string;
  pageCount: number;
  activatedAt: string | null;
};

export type SmartBookManifestStorageReference = {
  kind: SmartBookStorageReferenceKind;
  value: string;
  contentType?: string | null;
  byteLength?: number | null;
};

export type SmartBookManifestResource = {
  sourceId: string;
  title: string;
  description: string | null;
  type: string;
  audience: string;
  mimeType: string | null;
  published: boolean;
  storage: SmartBookManifestStorageReference | null;
};

export type SmartBookManifestMedia = {
  sourceId: string;
  targetType: "RESOURCE" | "VIDEO_LESSON";
  title: string;
  label: string;
  caption: string | null;
  displayMode: string;
  posterResourceId: string | null;
  provider: string | null;
  mediaType: string;
  immutableReference: SmartBookManifestStorageReference | null;
};

export type SmartBookManifestActivity = {
  sourceId: string;
  title: string;
  activityType: string;
  shortDescription: string | null;
  objective: string;
  materials: string | null;
  durationMinutes: number | null;
  groupType: string | null;
  preparation: string | null;
  instructions: string;
  steps: string[];
  observationPrompts: string[];
  reflectionPrompts: string[];
  expectedLearning: string | null;
  assessment: string | null;
  safetyNotes: string | null;
  studentInstructions: string | null;
  attachmentResourceIds: string[];
  imageResourceId?: string | null;
  videoResourceId?: string | null;
  diagramResourceId?: string | null;
  audience: string;
  difficulty: string | null;
};

export type SmartBookManifestWorksheet = {
  sourceId: string;
  title: string;
  type: string;
  instructions: string | null;
  estimatedMinutes: number | null;
  difficulty: string | null;
  audience: string;
  totalMarks: number | null;
  allowOnlineAttempt: boolean;
  allowPrint: boolean;
  runtimeExerciseId: string | null;
  questionIds: string[];
  printableResourceId: string | null;
  supportingResourceIds: string[];
};

export type SmartBookManifestAssessment = {
  sourceId: string;
  kind: string;
  displayLabel: string;
  deliveryMode?: string;
  instructions?: string | null;
  durationMinutes?: number | null;
  totalMarks?: number | null;
  allowOnlineAttempt?: boolean;
  allowPrint?: boolean;
  chapterId?: string | null;
  moduleId?: string | null;
  unitId?: string | null;
  partId?: string | null;
  chapterIds?: string[];
  sectionInstructions?: Array<{ questionType: string; instruction: string }>;
  itemSourceIds?: string[];
  questionIds?: string[];
  sourceUpdatedAt: string;
  releaseVersionId: string | null;
};

export type SmartBookManifestQuestion = {
  sourceId: string;
  questionType: string;
  questionText: string;
  options: SafeManifestJson | null;
  marks: number;
  displayOrder: number;
  imageResourceId: string | null;
};

export type SmartBookManifestDependency = {
  manifestId: string;
  kind: SmartBookManifestDependencyKind;
  sourceId: string;
};

export type SmartBookManifestAssets = {
  resources: SmartBookManifestResource[];
  media: SmartBookManifestMedia[];
  activities: SmartBookManifestActivity[];
  worksheets: SmartBookManifestWorksheet[];
  assessments: SmartBookManifestAssessment[];
  questions: SmartBookManifestQuestion[];
};

export type SmartBookReleaseManifestV2 = {
  schemaVersion: 2;
  identity: SmartBookManifestIdentity;
  book: SmartBookManifestBook;
  hierarchy: SmartBookManifestHierarchyNode[];
  contentDocument: ContentDocument;
  pdf: SmartBookManifestPdf;
  dependencies: SmartBookManifestDependency[];
  assets: SmartBookManifestAssets;
};

export type SmartBookStoredReleaseManifestV2 = SmartBookReleaseManifestV2 & {
  protected: SmartBookProtectedReleasePayload;
};




export class SmartBookManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmartBookManifestError";
  }
}

type HierarchySource = Omit<SmartBookManifestHierarchyNode, "releaseVisible"> & { bookId: string };

export type SmartBookManifestBuildSource = {
  publisherId: string;
  bookId: string;
  book: SmartBookManifestBook & { updatedAt: Date };
  document: ContentDocument;
  hierarchy: HierarchySource[];
  pdf: SmartBookManifestPdf;
  assets: SmartBookManifestAssets;
};

export function buildSmartBookReleaseManifest(source: SmartBookManifestBuildSource): SmartBookReleaseManifestV2 {
  assertId(source.publisherId, "publisherId");
  assertId(source.bookId, "bookId");
  if (!source.pdf) throw new SmartBookManifestError("An active immutable BookPdfVersion is required for a V2 Smart Book manifest.");
  if (source.book.updatedAt.toString() === "Invalid Date") throw new SmartBookManifestError("Book source timestamp is invalid.");
  const hierarchy = normalizeAndValidateHierarchy(source.hierarchy, source.bookId);
  const contentDocument = sanitizePublishedDocument(source.document);
  const assets = normalizeAssets(source.assets);
  const dependencies = buildDependencyCollection(contentDocument, hierarchy, assets);
  const manifest: SmartBookReleaseManifestV2 = {
    schemaVersion: SMART_BOOK_RELEASE_MANIFEST_SCHEMA_VERSION,
    identity: {
      publisherId: source.publisherId,
      bookId: source.bookId,
      targetType: "BOOK",
      targetId: source.bookId,
      sourceUpdatedAt: source.book.updatedAt.toISOString(),
    },
    book: {
      title: requiredText(source.book.title, "Book title"),
      slug: requiredText(source.book.slug, "Book slug"),
      subtitle: optionalText(source.book.subtitle),
      edition: optionalText(source.book.edition),
    },
    hierarchy: hierarchy.map(({ bookId: _bookId, ...node }) => ({ ...node, releaseVisible: true })),
    contentDocument,
    pdf: { ...source.pdf },
    dependencies,
    assets,
  };
  return parseSmartBookReleaseManifest(manifest);
}

export async function buildSmartBookReleaseManifestFromDatabase(input: {
  publisherId: string;
  bookId: string;
  document: ContentDocument;
}): Promise<SmartBookStoredReleaseManifestV2> {
  assertId(input.publisherId, "publisherId");
  assertId(input.bookId, "bookId");
  const refs = collectDocumentReferences(input.document);
  const [book, parts, units, chapters, modules, topics, exercises, referencedExercises, referencedGroups, frontMatter] = await Promise.all([
    prisma.book.findFirst({
      where: { id: input.bookId, publisherId: input.publisherId },
      select: { id: true, title: true, slug: true, subtitle: true, edition: true, updatedAt: true },
    }),
    prisma.bookPart.findMany({ where: { bookId: input.bookId, archived: false }, select: { id: true, bookId: true, title: true, startPage: true, endPage: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    prisma.bookUnit.findMany({ where: { bookId: input.bookId, archived: false }, select: { id: true, bookId: true, partId: true, title: true, startPage: true, endPage: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    prisma.bookChapter.findMany({ where: { bookId: input.bookId, archived: false }, select: { id: true, bookId: true, partId: true, unitId: true, title: true, chapterNumber: true, startPage: true, endPage: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }, { id: "asc" }] }),
    prisma.bookModule.findMany({ where: { bookId: input.bookId, archived: false }, select: { id: true, bookId: true, chapterId: true, title: true, startPage: true, endPage: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    prisma.bookTopic.findMany({ where: { bookId: input.bookId, archived: false }, select: { id: true, bookId: true, chapterId: true, moduleId: true, title: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    prisma.bookExercise.findMany({ where: { bookId: input.bookId, archived: false, type: "PRACTICE" }, select: { id: true, bookId: true, chapterId: true, moduleId: true, topicId: true, title: true, startPage: true, endPage: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    prisma.bookExercise.findMany({ where: { id: { in: refs.exerciseIds }, bookId: input.bookId, published: true, archived: false }, select: { id: true } }),
    prisma.bookExerciseQuestionGroup.findMany({ where: { id: { in: refs.groupIds }, active: true, exercise: { bookId: input.bookId, published: true, archived: false } }, select: { id: true } }),
    prisma.bookFrontMatterItem.findMany({ where: { bookId: input.bookId }, select: { id: true, bookId: true, title: true, startPage: true, endPage: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
  ]);
  if (!book) throw new SmartBookManifestError("Book is not owned by the authorized publisher.");
  const resolvedPdf = await resolveCurrentBookPdfVersion(prisma, { publisherId: input.publisherId, bookId: input.bookId });
  if (!resolvedPdf.ok) throw new SmartBookManifestError(resolvedPdf.message);
  const pdf = resolvedPdf.version;
  const hierarchy: HierarchySource[] = [
    ...frontMatter.map((row) => node(row.id, "FRONT_MATTER", null, null, null, null, null, null, row.title, null, null, row.displayOrder, row.startPage, row.endPage, row.bookId)),
    ...parts.map((row) => node(row.id, "PART", null, row.id, null, null, null, null, row.title, null, null, row.displayOrder, row.startPage, row.endPage, row.bookId)),
    ...units.map((row) => node(row.id, "UNIT", row.partId, row.partId, row.id, null, null, null, row.title, null, null, row.displayOrder, row.startPage, row.endPage, row.bookId)),
    ...chapters.map((row) => node(row.id, "CHAPTER", row.unitId ?? row.partId, row.partId, row.unitId, null, null, null, row.title, `Chapter ${row.chapterNumber}`, row.chapterNumber, row.sortOrder, row.startPage, row.endPage, row.bookId)),
    ...modules.map((row) => node(row.id, "MODULE", row.chapterId, null, null, row.chapterId, null, null, row.title, null, null, row.displayOrder, row.startPage, row.endPage, row.bookId)),
    ...topics.map((row) => node(row.id, "TOPIC", row.moduleId ?? row.chapterId, null, null, row.chapterId, row.moduleId, null, row.title, null, null, row.displayOrder, null, null, row.bookId)),
    ...exercises.map((row) => node(row.id, "EXERCISE", row.topicId ?? row.moduleId ?? row.chapterId, null, null, row.chapterId, row.moduleId, row.topicId, row.title, null, null, row.displayOrder, row.startPage, row.endPage, row.bookId)),
  ];
  const [resources, activities, worksheets, assessments, questions, media] = await Promise.all([
    loadResources(input.publisherId, input.bookId, refs.resourceIds),
    loadActivities(input.publisherId, input.bookId, refs.activityIds),
    loadWorksheets(input.publisherId, input.bookId, refs.worksheetIds),
    loadAssessments(input.publisherId, input.bookId, refs.assessmentIds),
    loadQuestions(input.publisherId, input.bookId, refs.questionIds),
    loadMedia(input.publisherId, input.bookId, refs.media),
  ]);
  const releaseResourceIds = [...new Set([
    ...refs.resourceIds,
    ...activities.flatMap((activity) => [
      ...activity.attachmentResourceIds,
      activity.imageResourceId ?? "",
      activity.videoResourceId ?? "",
      activity.diagramResourceId ?? "",
    ]),
    ...worksheets.flatMap((worksheet) => [worksheet.printableResourceId ?? "", ...worksheet.supportingResourceIds]),
    ...questions.flatMap((question) => [question.imageResourceId ?? ""]),
  ].filter(Boolean))].sort();
  const releaseResources = await loadResources(input.publisherId, input.bookId, releaseResourceIds);
  assertCompleteReferences({ ...refs, resourceIds: releaseResourceIds }, { resources: releaseResources, activities, worksheets, assessments, questions, media, exercises: referencedExercises.map((row) => row.id), groups: referencedGroups.map((row) => row.id) });
  const assetSet: SmartBookManifestAssets = { resources: releaseResources, activities, worksheets, assessments, questions, media };
  const manifest = buildSmartBookReleaseManifest({
    publisherId: input.publisherId,
    bookId: input.bookId,
    book: { title: book.title, slug: book.slug, subtitle: book.subtitle, edition: book.edition, updatedAt: book.updatedAt },
    document: input.document,
    hierarchy,
    pdf: { bookPdfVersionId: pdf.id, objectKey: pdf.objectKey, pageCount: pdf.pageCount, activatedAt: pdf.activatedAt?.toISOString() ?? null },
    assets: assetSet,
  });
  const protectedPayload = await buildSmartBookProtectedReleasePayloadFromDatabase({ publisherId: input.publisherId, bookId: input.bookId, manifest });
  return { ...manifest, protected: protectedPayload };
}

export function parseSmartBookReleaseManifest(value: unknown): SmartBookReleaseManifestV2 {
  if (!isObject(value) || value.schemaVersion !== SMART_BOOK_RELEASE_MANIFEST_SCHEMA_VERSION) {
    throw new SmartBookManifestError("Unsupported Smart Book release manifest schema version.");
  }
  const identity = value.identity;
  if (!isObject(identity) || identity.targetType !== "BOOK") throw new SmartBookManifestError("Manifest identity is invalid.");
  assertIdField(identity.publisherId, "identity.publisherId");
  assertIdField(identity.bookId, "identity.bookId");
  assertIdField(identity.targetId, "identity.targetId");
  if (identity.bookId !== identity.targetId || typeof identity.sourceUpdatedAt !== "string" || !isIsoDate(identity.sourceUpdatedAt)) throw new SmartBookManifestError("Manifest lineage is invalid.");
  if (!isObject(value.book) || typeof value.book.title !== "string" || !value.book.title.trim() || typeof value.book.slug !== "string" || !value.book.slug.trim()) throw new SmartBookManifestError("Manifest Book metadata is invalid.");
  if (!Array.isArray(value.hierarchy) || value.hierarchy.length > 10000) throw new SmartBookManifestError("Manifest hierarchy is invalid or exceeds the structural bound.");
  if (!Array.isArray(value.dependencies) || value.dependencies.length > 50000) throw new SmartBookManifestError("Manifest dependencies are invalid or exceed the structural bound.");
  if (!isContentDocument(value.contentDocument)) throw new SmartBookManifestError("Manifest document is invalid.");
  if (!isPdf(value.pdf)) throw new SmartBookManifestError("Manifest PDF reference is invalid.");
  const hierarchy = parseHierarchy(value.hierarchy, identity.bookId);
  const dependencies = parseDependencies(value.dependencies);
  const assets = parseAssets(value.assets);
  if ("protected" in value) {
    try { parseSmartBookProtectedReleasePayload(value.protected); } catch { throw new SmartBookManifestError("Protected Smart Book release payload is invalid."); }
  }
  if (!hierarchy.length) throw new SmartBookManifestError("Manifest hierarchy cannot be empty.");
  return {
    schemaVersion: 2,
    identity: { publisherId: identity.publisherId, bookId: identity.bookId, targetType: "BOOK", targetId: identity.targetId, sourceUpdatedAt: identity.sourceUpdatedAt },
    book: { title: value.book.title, slug: value.book.slug, subtitle: nullableString(value.book.subtitle), edition: nullableString(value.book.edition) },
    hierarchy,
    contentDocument: value.contentDocument,
    pdf: value.pdf,
    dependencies,
    assets,
  };
}

export function parseStoredSmartBookReleaseManifest(value: unknown): SmartBookStoredReleaseManifestV2 {
  const manifest = parseSmartBookReleaseManifest(value);
  if (!isObject(value) || !("protected" in value)) throw new SmartBookManifestError("Protected Smart Book release payload is missing.");
  try {
    const protectedPayload = parseSmartBookProtectedReleasePayload(value.protected);
    validateSafeQuestionConsistency(manifest.assets.questions, protectedPayload.questions);
    validateSafeAssessmentConsistency(manifest.assets.assessments, protectedPayload.assessments);
    const safeResourceIds = new Set(manifest.assets.resources.map((resource) => resource.sourceId));
    if (protectedPayload.worksheets.some((worksheet) => worksheet.answerKeyResourceId && safeResourceIds.has(worksheet.answerKeyResourceId))) throw new SmartBookManifestError("Protected answer-key asset leaked into the safe manifest.");
    if (protectedPayload.worksheets.some((worksheet) => worksheet.answerKeyStorage?.kind === "EXTERNAL_REFERENCE")) throw new SmartBookManifestError("Protected answer-key storage must be managed.");
    if (protectedPayload.questions.some((question) => question.bookId !== manifest.identity.bookId) || protectedPayload.worksheets.some((worksheet) => worksheet.bookId !== manifest.identity.bookId || worksheet.publisherId !== manifest.identity.publisherId) || protectedPayload.assessments.some((assessment) => assessment.bookId !== manifest.identity.bookId || assessment.publisherId !== manifest.identity.publisherId)) throw new SmartBookManifestError("Protected Smart Book release lineage is invalid.");
    return { ...manifest, protected: protectedPayload };
  } catch {
    throw new SmartBookManifestError("Protected Smart Book release payload is invalid.");
  }
}




type ReferenceCollection = {
  resourceIds: string[];
  activityIds: string[];
  worksheetIds: string[];
  assessmentIds: string[];
  questionIds: string[];
  exerciseIds: string[];
  groupIds: string[];
  media: Array<{ targetType: "RESOURCE" | "VIDEO_LESSON"; sourceId: string; posterResourceId: string | null }>;
};

function collectDocumentReferences(document: ContentDocument): ReferenceCollection {
  const refs: ReferenceCollection = { resourceIds: [], activityIds: [], worksheetIds: [], assessmentIds: [], questionIds: [], exerciseIds: [], groupIds: [], media: [] };
  const add = (list: string[], value: string | undefined) => { if (value?.trim()) list.push(value.trim()); };
  const walkFrame = (frame: NonNullable<NonNullable<ContentDocument["pageLayout"]>["pages"]>[number]["frames"][number]) => {
    if (frame.type === "ASSESSMENT_LAUNCHER") {
      const payload = getV2AssessmentLauncherPayload(frame);
      if (!payload) throw new SmartBookManifestError(`Unsupported assessment launcher payload on frame ${frame.id}.`);
      if (payload.launcherType === "publisher-assessment") add(refs.assessmentIds, payload.assessmentId);
      else {
        add(refs.exerciseIds, payload.target.exerciseId);
        add(refs.groupIds, payload.target.groupId);
        for (const questionId of payload.target.questionIds ?? []) add(refs.questionIds, questionId);
      }
    }
    add(refs.resourceIds, frame.resourceId);
    add(refs.resourceIds, frame.contentRef?.resourceId);
    for (const child of frame.children ?? []) walkFrame(child);
  };
  for (const block of document.blocks) {
    if (isLinkedAssetBlock(block)) {
      if (block.targetType === "RESOURCE") add(refs.resourceIds, block.targetId);
      if (block.targetType === "CHAPTER_ACTIVITY") add(refs.activityIds, block.targetId);
      if (block.targetType === "PUBLISHER_WORKSHEET") add(refs.worksheetIds, block.targetId);
      if (block.targetType === "BOOK_EXERCISE") add(refs.exerciseIds, block.targetId);
    }
    if (isMediaBlock(block)) {
      refs.media.push({ targetType: block.targetType, sourceId: block.targetId, posterResourceId: block.posterResourceId?.trim() || null });
      if (block.targetType === "RESOURCE") add(refs.resourceIds, block.targetId);
      add(refs.resourceIds, block.posterResourceId);
    }
    if (block.type === "activity") for (const field of block.fields) add(refs.resourceIds, field.resourceId);
    if (block.type === "worksheet") for (const question of block.questions) add(refs.resourceIds, question.resourceId);
    if (block.type === "image" || block.type === "diagram") add(refs.resourceIds, block.resourceId);
    if (block.type === "imageGallery") for (const image of block.images) add(refs.resourceIds, image.resourceId);
  }
  for (const page of document.pageLayout?.pages ?? []) {
    add(refs.resourceIds, page.background?.resourceId);
    add(refs.resourceIds, page.replica?.resourceId);
    add(refs.resourceIds, page.narration?.resourceId);
    for (const segment of page.narration?.segments ?? []) add(refs.resourceIds, segment.resourceId);
    for (const frame of page.frames) walkFrame(frame);
  }
  return {
    resourceIds: [...new Set(refs.resourceIds)].sort(),
    activityIds: [...new Set(refs.activityIds)].sort(),
    worksheetIds: [...new Set(refs.worksheetIds)].sort(),
    assessmentIds: [...new Set(refs.assessmentIds)].sort(),
    questionIds: [...new Set(refs.questionIds)].sort(),
    exerciseIds: [...new Set(refs.exerciseIds)].sort(),
    groupIds: [...new Set(refs.groupIds)].sort(),
    media: [...new Map(refs.media.map((item) => [`${item.targetType}:${item.sourceId}`, item])).values()].sort((left, right) => `${left.targetType}:${left.sourceId}`.localeCompare(`${right.targetType}:${right.sourceId}`)),
  };
}

function normalizeAndValidateHierarchy(nodes: HierarchySource[], bookId: string): HierarchySource[] {
  const byId = new Map<string, HierarchySource>();
  for (const node of nodes) {
    assertId(node.sourceId, "hierarchy sourceId");
    if (node.bookId !== bookId) throw new SmartBookManifestError(`Hierarchy node ${node.sourceId} belongs to another Book.`);
    if (byId.has(node.sourceId)) throw new SmartBookManifestError(`Duplicate hierarchy ID ${node.sourceId}.`);
    assertPageRange(node.startPage, node.endPage, node.sourceId);
    if (!Number.isInteger(node.displayOrder) || node.displayOrder < 0) throw new SmartBookManifestError(`Invalid display order for ${node.sourceId}.`);
    byId.set(node.sourceId, node);
  }
  for (const node of nodes) {
    if (node.parentSourceId && !byId.has(node.parentSourceId)) throw new SmartBookManifestError(`Orphan hierarchy node ${node.sourceId}.`);
    const parent = node.parentSourceId ? byId.get(node.parentSourceId) : null;
    const expectedParent = { FRONT_MATTER: null, PART: null, UNIT: "PART", CHAPTER: ["UNIT", "PART"], MODULE: "CHAPTER", TOPIC: ["MODULE", "CHAPTER"], EXERCISE: ["TOPIC", "MODULE", "CHAPTER"] }[node.kind];
    if (parent && (!Array.isArray(expectedParent) ? parent.kind !== expectedParent : !expectedParent.includes(parent.kind))) throw new SmartBookManifestError(`Invalid parent type for hierarchy node ${node.sourceId}.`);
    if (node.kind === "UNIT" && !node.partSourceId) throw new SmartBookManifestError(`Unit ${node.sourceId} has no Part parent.`);
    if (node.kind === "MODULE" && !node.chapterSourceId) throw new SmartBookManifestError(`Module ${node.sourceId} has no Chapter parent.`);
    if (node.kind === "TOPIC" && !node.chapterSourceId) throw new SmartBookManifestError(`Topic ${node.sourceId} has no Chapter parent.`);
    if (node.kind === "EXERCISE" && !node.chapterSourceId) throw new SmartBookManifestError(`Exercise ${node.sourceId} has no Chapter parent.`);
    if (node.unitSourceId) {
      const unit = byId.get(node.unitSourceId);
      if (!unit || unit.kind !== "UNIT") throw new SmartBookManifestError(`Invalid Unit relationship for ${node.sourceId}.`);
    }
    if (node.chapterSourceId) {
      const chapter = byId.get(node.chapterSourceId);
      if (!chapter || chapter.kind !== "CHAPTER") throw new SmartBookManifestError(`Invalid Chapter relationship for ${node.sourceId}.`);
    }
    if (node.moduleSourceId) {
      const module = byId.get(node.moduleSourceId);
      if (!module || module.kind !== "MODULE") throw new SmartBookManifestError(`Invalid Module relationship for ${node.sourceId}.`);
    }
    if (node.topicSourceId) {
      const topic = byId.get(node.topicSourceId);
      if (!topic || topic.kind !== "TOPIC") throw new SmartBookManifestError(`Invalid Topic relationship for ${node.sourceId}.`);
    }
  }
  return [...nodes].sort((left, right) => `${left.kind}:${left.displayOrder}:${left.sourceId}`.localeCompare(`${right.kind}:${right.displayOrder}:${right.sourceId}`));
}

function normalizeAssets(assets: SmartBookManifestAssets): SmartBookManifestAssets {
  const copy = cloneJson(assets) as SmartBookManifestAssets;
  return {
    resources: [...copy.resources].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    media: [...copy.media].sort((left, right) => `${left.targetType}:${left.sourceId}`.localeCompare(`${right.targetType}:${right.sourceId}`)),
    activities: [...copy.activities].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    worksheets: [...copy.worksheets].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    assessments: [...copy.assessments].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    questions: [...copy.questions].sort((left, right) => `${left.sourceId}:${left.displayOrder}`.localeCompare(`${right.sourceId}:${right.displayOrder}`)),
  };
}

function buildDependencyCollection(document: ContentDocument, hierarchy: HierarchySource[], assets: SmartBookManifestAssets): SmartBookManifestDependency[] {
  const dependencies: SmartBookManifestDependency[] = [];
  const add = (kind: SmartBookManifestDependencyKind, sourceId: string) => dependencies.push({ kind, sourceId, manifestId: `${kind}:${sourceId}` });
  for (const node of hierarchy) {
    if (node.kind === "CHAPTER") add("BOOK_CHAPTER", node.sourceId);
    if (node.kind === "MODULE") add("BOOK_MODULE", node.sourceId);
    if (node.kind === "EXERCISE") add("BOOK_EXERCISE", node.sourceId);
  }
  for (const resource of assets.resources) add("RESOURCE", resource.sourceId);
  for (const media of assets.media) add(media.targetType, media.sourceId);
  for (const activity of assets.activities) add("CHAPTER_ACTIVITY", activity.sourceId);
  for (const worksheet of assets.worksheets) add("PUBLISHER_WORKSHEET", worksheet.sourceId);
  for (const assessment of assets.assessments) add("PUBLISHER_ASSESSMENT", assessment.sourceId);
  for (const question of assets.questions) add("BOOK_QUESTION", question.sourceId);
  const refs = collectDocumentReferences(document);
  for (const exerciseId of refs.exerciseIds) add("BOOK_EXERCISE", exerciseId);
  for (const groupId of refs.groupIds) add("BOOK_EXERCISE_GROUP", groupId);
  for (const questionId of refs.questionIds) add("BOOK_QUESTION", questionId);
  for (const block of document.blocks) if (isLinkedAssetBlock(block) && block.sectionDefinitionId) add("CONTENT_SECTION", block.sectionDefinitionId);
  return [...new Map(dependencies.map((dependency) => [dependency.manifestId, dependency])).values()].sort((left, right) => left.manifestId.localeCompare(right.manifestId));
}

function sanitizePublishedDocument(document: ContentDocument): ContentDocument {
  const sanitized = sanitizeValue(document);
  if (!isObject(sanitized)) throw new SmartBookManifestError("Published document is invalid.");
  return normalizeContentDocument(sanitized);
}

const forbiddenManifestKeys = new Set(["correctAnswer", "correctOption", "correctAssertionOption", "trueFalseAnswer", "answerKey", "answerKeyEnabled", "teacherNote", "teacherNotes", "teacherGuidance", "privateNote", "privateNotes", "studentResponses", "attempts", "feedback", "credentials", "studentData", "studentPii"]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!isObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) if (!forbiddenManifestKeys.has(key)) result[key] = sanitizeValue(child);
  return result;
}

function node(sourceId: string, kind: SmartBookHierarchyKind, parentSourceId: string | null, partSourceId: string | null, unitSourceId: string | null, chapterSourceId: string | null, moduleSourceId: string | null, topicSourceId: string | null, title: string, label: string | null, number: number | null, displayOrder: number, startPage: number | null, endPage: number | null, bookId: string): HierarchySource {
  return { sourceId, kind, parentSourceId, partSourceId, unitSourceId, chapterSourceId, moduleSourceId, topicSourceId, title, label, number, displayOrder, startPage, endPage, bookId };
}

function assertCompleteReferences(refs: ReferenceCollection, loaded: { resources: SmartBookManifestResource[]; activities: SmartBookManifestActivity[]; worksheets: SmartBookManifestWorksheet[]; assessments: SmartBookManifestAssessment[]; questions: SmartBookManifestQuestion[]; media: SmartBookManifestMedia[]; exercises: string[]; groups: string[] }) {
  assertComplete(refs.resourceIds, loaded.resources.map((item) => item.sourceId), "resource");
  assertComplete(refs.activityIds, loaded.activities.map((item) => item.sourceId), "activity");
  assertComplete(refs.worksheetIds, loaded.worksheets.map((item) => item.sourceId), "worksheet");
  assertComplete(refs.assessmentIds, loaded.assessments.map((item) => item.sourceId), "assessment");
  assertComplete(refs.questionIds, loaded.questions.map((item) => item.sourceId), "question");
  assertComplete(refs.exerciseIds, loaded.exercises, "exercise");
  assertComplete(refs.groupIds, loaded.groups, "exercise group");
  assertComplete(refs.media.map((item) => item.sourceId), loaded.media.map((item) => item.sourceId), "media");
}

function assertComplete(expected: string[], actual: string[], label: string) {
  const actualSet = new Set(actual);
  const missing = expected.filter((id) => !actualSet.has(id));
  if (missing.length) throw new SmartBookManifestError(`Referenced ${label} dependency is unavailable: ${missing[0]}.`);
}

async function loadResources(publisherId: string, bookId: string, ids: string[]): Promise<SmartBookManifestResource[]> {
  if (!ids.length) return [];
  const rows = await prisma.resource.findMany({ where: { id: { in: ids }, publisherId, archived: false, published: true, OR: [{ bookId }, { bookId: null }, { bookResourceLinks: { some: { bookId, active: true } } }] }, select: { id: true, title: true, description: true, type: true, audience: true, mimeType: true, published: true, fileUrl: true } });
  return rows.map((row) => ({ sourceId: row.id, title: row.title, description: row.description, type: row.type, audience: row.audience, mimeType: row.mimeType, published: row.published, storage: row.fileUrl ? createSmartBookStorageReference(row.fileUrl, publisherId, "resource-file", row.mimeType, null) : null }));
}

async function loadActivities(publisherId: string, bookId: string, ids: string[]): Promise<SmartBookManifestActivity[]> {
  if (!ids.length) return [];
  const rows = await prisma.chapterActivity.findMany({ where: { id: { in: ids }, chapter: { bookId, book: { publisherId } }, archivedAt: null, active: true, published: true }, select: { id: true, title: true, activityType: true, shortDescription: true, objective: true, materials: true, durationMinutes: true, groupType: true, preparation: true, instructions: true, steps: true, observationPrompts: true, reflectionPrompts: true, expectedLearning: true, assessment: true, safetyNotes: true, studentInstructions: true, attachmentResourceIds: true, imageResourceId: true, videoResourceId: true, diagramResourceId: true, audience: true, difficulty: true } });
  return rows.map((row) => ({ sourceId: row.id, title: row.title, activityType: row.activityType, shortDescription: row.shortDescription, objective: row.objective, materials: row.materials, durationMinutes: row.durationMinutes, groupType: row.groupType, preparation: row.preparation, instructions: row.instructions, steps: stringArray(row.steps), observationPrompts: stringArray(row.observationPrompts), reflectionPrompts: stringArray(row.reflectionPrompts), expectedLearning: row.expectedLearning, assessment: row.assessment, safetyNotes: row.safetyNotes, studentInstructions: row.studentInstructions, attachmentResourceIds: stringArray(row.attachmentResourceIds), imageResourceId: row.imageResourceId, videoResourceId: row.videoResourceId, diagramResourceId: row.diagramResourceId, audience: row.audience, difficulty: row.difficulty }));
}

async function loadWorksheets(publisherId: string, bookId: string, ids: string[]): Promise<SmartBookManifestWorksheet[]> {
  if (!ids.length) return [];
  const rows = await prisma.publisherWorksheet.findMany({ where: { id: { in: ids }, publisherId, bookId, archivedAt: null, active: true, published: true }, select: { id: true, title: true, type: true, instructions: true, estimatedMinutes: true, difficulty: true, audience: true, totalMarks: true, allowOnlineAttempt: true, allowPrint: true, exerciseId: true, printableResourceId: true, supportingResourceIds: true, items: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { questionId: true } } } });
  return rows.map((row) => ({ sourceId: row.id, title: row.title, type: row.type, instructions: row.instructions, estimatedMinutes: row.estimatedMinutes, difficulty: row.difficulty, audience: row.audience, totalMarks: row.totalMarks, allowOnlineAttempt: row.allowOnlineAttempt, allowPrint: row.allowPrint, runtimeExerciseId: row.exerciseId, questionIds: row.items.map((item) => item.questionId), printableResourceId: row.printableResourceId, supportingResourceIds: [...row.supportingResourceIds].sort() }));
}

async function loadAssessments(publisherId: string, bookId: string, ids: string[]): Promise<SmartBookManifestAssessment[]> {
  if (!ids.length) return [];
  const rows = await prisma.publisherAssessment.findMany({
    where: { id: { in: ids }, publisherId, bookId, status: "PUBLISHED", archivedAt: null },
    select: {
      id: true, kind: true, deliveryMode: true, instructions: true, durationMinutes: true, totalMarks: true,
      allowOnlineAttempt: true, allowPrint: true, chapterId: true, moduleId: true, unitId: true, partId: true, updatedAt: true,
      chapterScopes: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { chapterId: true } },
      sectionInstructions: { orderBy: [{ questionType: "asc" }, { id: "asc" }], select: { questionType: true, instruction: true } },
      items: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, questionId: true } },
    },
  });
  return rows.map((row) => ({
    sourceId: row.id,
    kind: row.kind,
    displayLabel: row.kind.replaceAll("_", " "),
    deliveryMode: row.deliveryMode,
    instructions: row.instructions,
    durationMinutes: row.durationMinutes,
    totalMarks: row.totalMarks,
    allowOnlineAttempt: row.allowOnlineAttempt,
    allowPrint: row.allowPrint,
    chapterId: row.chapterId,
    moduleId: row.moduleId,
    unitId: row.unitId,
    partId: row.partId,
    chapterIds: row.chapterScopes.map((scope) => scope.chapterId),
    sectionInstructions: row.sectionInstructions,
    itemSourceIds: row.items.map((item) => item.id),
    questionIds: row.items.map((item) => item.questionId),
    sourceUpdatedAt: row.updatedAt.toISOString(),
    releaseVersionId: null,
  }));
}

async function loadQuestions(publisherId: string, bookId: string, ids: string[]): Promise<SmartBookManifestQuestion[]> {
  if (!ids.length) return [];
  const rows = await prisma.bookQuestion.findMany({ where: { id: { in: ids }, bookId, archived: false, approved: true, book: { publisherId } }, select: { id: true, questionType: true, questionText: true, options: true, marks: true, displayOrder: true, imageResourceId: true } });
  return rows.map((row) => ({ sourceId: row.id, questionType: row.questionType, questionText: row.questionText, options: toSafeJson(row.options), marks: row.marks, displayOrder: row.displayOrder, imageResourceId: row.imageResourceId }));
}

async function loadMedia(publisherId: string, bookId: string, refs: ReferenceCollection["media"]): Promise<SmartBookManifestMedia[]> {
  const resourceIds = refs.filter((ref) => ref.targetType === "RESOURCE").map((ref) => ref.sourceId);
  const videoIds = refs.filter((ref) => ref.targetType === "VIDEO_LESSON").map((ref) => ref.sourceId);
  const posterByMedia = new Map(refs.map((ref) => [`${ref.targetType}:${ref.sourceId}`, ref.posterResourceId ?? null]));
  const [resources, videos] = await Promise.all([
    resourceIds.length ? prisma.resource.findMany({ where: { id: { in: resourceIds }, publisherId, archived: false, published: true, OR: [{ bookId }, { bookId: null }, { bookResourceLinks: { some: { bookId, active: true } } }] }, select: { id: true, title: true, type: true, fileUrl: true } }) : Promise.resolve([]),
    videoIds.length ? prisma.videoLesson.findMany({ where: { id: { in: videoIds }, publisherId, bookId, archived: false, published: true }, select: { id: true, title: true, videoUrl: true, provider: true } }) : Promise.resolve([]),
  ]);
  return [
    ...resources.map((row) => ({ sourceId: row.id, targetType: "RESOURCE" as const, title: row.title, label: row.title, caption: null, displayMode: "inline", posterResourceId: posterByMedia.get(`RESOURCE:${row.id}`) ?? null, provider: null, mediaType: row.type, immutableReference: row.fileUrl ? createSmartBookStorageReference(row.fileUrl, publisherId, "resource-file", null, null) : null })),
    ...videos.map((row) => ({ sourceId: row.id, targetType: "VIDEO_LESSON" as const, title: row.title, label: row.title, caption: null, displayMode: "inline", posterResourceId: posterByMedia.get(`VIDEO_LESSON:${row.id}`) ?? null, provider: row.provider, mediaType: "VIDEO", immutableReference: { kind: "EXTERNAL_REFERENCE" as const, value: row.videoUrl } })),
  ];
}

export function createSmartBookStorageReference(
  value: string,
  publisherId: string,
  scope: UploadScope,
  contentType: string | null = null,
  byteLength: number | null = null,
  enforceScope = true,
): SmartBookManifestStorageReference {
  const trimmed = value.trim();
  if (isPublisherUploadUrl(trimmed, publisherId, [scope])) return { kind: "MANAGED_URL", value: trimmed, contentType, byteLength };
  if (/^https:\/\//i.test(trimmed)) {
    assertSafeHttpsUrl(trimmed, "External media reference");
    return { kind: "EXTERNAL_REFERENCE", value: trimmed, contentType, byteLength };
  }
  let key: string;
  try { key = normalizeAndValidateObjectKey(trimmed); } catch { throw new SmartBookManifestError("Managed storage identity is invalid."); }
  const prefix = `${uploadPrefixForScope(scope)}/${publisherId}/`;
  if (enforceScope && !key.startsWith(prefix)) throw new SmartBookManifestError("Managed storage identity is outside the Publisher storage scope.");
  return { kind: "OBJECT_KEY", value: key, contentType, byteLength };
}

export function collectSmartBookManagedObjectKeys(manifest: SmartBookStoredReleaseManifestV2): string[] {
  const keys = new Set<string>();
  const add = (reference: SmartBookManifestStorageReference | null | undefined, label: string) => {
    if (!reference || reference.kind !== "OBJECT_KEY") return;
    try { keys.add(normalizeAndValidateObjectKey(reference.value)); } catch { throw new SmartBookManifestError(`${label} has an invalid managed object key.`); }
  };
  add({ kind: "OBJECT_KEY", value: manifest.pdf.objectKey }, "PDF");
  for (const resource of manifest.assets.resources) add(resource.storage, `Resource ${resource.sourceId}`);
  for (const media of manifest.assets.media) add(media.immutableReference, `Media ${media.sourceId}`);
  for (const worksheet of manifest.protected.worksheets) add(worksheet.answerKeyStorage, `Answer key ${worksheet.sourceId}`);
  return [...keys];
}

function parseHierarchy(value: unknown[], bookId: string): SmartBookManifestHierarchyNode[] {
  const nodes: SmartBookManifestHierarchyNode[] = [];
  for (const item of value) {
    if (!isObject(item)) throw new SmartBookManifestError("Manifest hierarchy node is invalid.");
    const kind = item.kind;
    if (!["FRONT_MATTER", "PART", "UNIT", "CHAPTER", "MODULE", "TOPIC", "EXERCISE"].includes(String(kind))) throw new SmartBookManifestError("Manifest hierarchy kind is unsupported.");
    const nodeValue = item as Record<string, unknown>;
    for (const field of ["sourceId", "title"]) if (typeof nodeValue[field] !== "string" || !nodeValue[field]) throw new SmartBookManifestError(`Manifest hierarchy ${field} is invalid.`);
    if (nodeValue.releaseVisible !== true) throw new SmartBookManifestError("Manifest hierarchy visibility is invalid.");
    const node: SmartBookManifestHierarchyNode = { sourceId: String(nodeValue.sourceId), kind: kind as SmartBookHierarchyKind, parentSourceId: nullableId(nodeValue.parentSourceId), partSourceId: nullableId(nodeValue.partSourceId), unitSourceId: nullableId(nodeValue.unitSourceId), chapterSourceId: nullableId(nodeValue.chapterSourceId), moduleSourceId: nullableId(nodeValue.moduleSourceId), topicSourceId: nullableId(nodeValue.topicSourceId), title: String(nodeValue.title), label: nullableString(nodeValue.label), number: nullableInteger(nodeValue.number), displayOrder: integer(nodeValue.displayOrder, "displayOrder"), startPage: nullablePositiveInteger(nodeValue.startPage, "startPage"), endPage: nullablePositiveInteger(nodeValue.endPage, "endPage"), releaseVisible: true };
    assertPageRange(node.startPage, node.endPage, node.sourceId);
    nodes.push(node);
  }
  const source: HierarchySource[] = nodes.map((node) => ({ ...node, bookId }));
  return normalizeAndValidateHierarchy(source, bookId).map(({ bookId: _bookId, ...node }) => ({ ...node, releaseVisible: true }));
}

function parseDependencies(value: unknown[]): SmartBookManifestDependency[] {
  return value.map((item) => {
    if (!isObject(item) || typeof item.manifestId !== "string" || typeof item.sourceId !== "string" || !SMART_BOOK_MANIFEST_DEPENDENCY_KINDS.includes(item.kind as SmartBookManifestDependencyKind)) throw new SmartBookManifestError("Manifest dependency is invalid or unsupported.");
    assertId(item.sourceId, "Manifest dependency sourceId");
    assertId(item.manifestId, "Manifest dependency manifestId");
    if (item.manifestId !== `${item.kind}:${item.sourceId}`) throw new SmartBookManifestError("Manifest dependency identity is invalid.");
    return { manifestId: item.manifestId, kind: item.kind as SmartBookManifestDependencyKind, sourceId: item.sourceId };
  }).sort((left, right) => left.manifestId.localeCompare(right.manifestId));
}

function parseAssets(value: unknown): SmartBookManifestAssets {
  if (!isObject(value)) throw new SmartBookManifestError("Manifest assets are invalid.");
  const keys = ["resources", "media", "activities", "worksheets", "assessments", "questions"] as const;
  for (const key of keys) {
    if (!Array.isArray(value[key]) || value[key].length > 50000) throw new SmartBookManifestError(`Manifest asset collection ${key} is invalid.`);
    for (const [index, item] of value[key].entries()) {
      if (!isObject(item)) throw new SmartBookManifestError(`Manifest ${key}[${index}] is invalid.`);
      assertIdField(item.sourceId, `Manifest ${key}[${index}].sourceId`);
      assertNoForbiddenKeys(item, `Manifest ${key}[${index}]`);
    }
    assertUniqueAssetIdentities(value[key] as unknown[], key);
  }
  for (const item of value.resources as unknown[]) {
    const row = item as Record<string, unknown>;
    runtimeString(row.title, "resource title"); runtimeString(row.type, "resource type"); runtimeString(row.audience, "resource audience");
    if (typeof row.published !== "boolean") throw new SmartBookManifestError("Manifest resource publication state is invalid.");
    validateStorage(row.storage, "resource storage");
  }
  for (const item of value.media as unknown[]) {
    const row = item as Record<string, unknown>;
    if (row.targetType !== "RESOURCE" && row.targetType !== "VIDEO_LESSON") throw new SmartBookManifestError("Manifest media target type is invalid.");
    runtimeString(row.title, "media title"); runtimeString(row.label, "media label"); runtimeString(row.displayMode, "media display mode"); runtimeString(row.mediaType, "media type");
    validateStorage(row.immutableReference, "media reference");
  }
  for (const item of value.activities as unknown[]) {
    const row = item as Record<string, unknown>;
    runtimeString(row.title, "activity title"); runtimeString(row.instructions, "activity instructions"); runtimeStringArray(row.steps, "activity steps"); runtimeStringArray(row.observationPrompts, "activity observation prompts"); runtimeStringArray(row.reflectionPrompts, "activity reflection prompts"); runtimeStringArray(row.attachmentResourceIds, "activity attachments");
    for (const field of ["imageResourceId", "videoResourceId", "diagramResourceId"] as const) if (row[field] !== null && row[field] !== undefined) assertIdField(row[field], `activity ${field}`);
  }
  for (const item of value.worksheets as unknown[]) {
    const row = item as Record<string, unknown>;
    runtimeString(row.title, "worksheet title"); runtimeStringArray(row.questionIds, "worksheet questions");
    if (typeof row.allowOnlineAttempt !== "boolean" || typeof row.allowPrint !== "boolean") throw new SmartBookManifestError("Manifest worksheet flags are invalid.");
  }
  for (const item of value.assessments as unknown[]) {
    const row = item as Record<string, unknown>;
    runtimeString(row.kind, "assessment kind"); runtimeString(row.displayLabel, "assessment label"); runtimeString(row.sourceUpdatedAt, "assessment timestamp");
    if (!isIsoDate(row.sourceUpdatedAt as string)) throw new SmartBookManifestError("Manifest assessment timestamp is invalid.");
    const executionFields = ["deliveryMode", "instructions", "durationMinutes", "totalMarks", "allowOnlineAttempt", "allowPrint", "chapterId", "moduleId", "unitId", "partId", "chapterIds", "sectionInstructions", "itemSourceIds", "questionIds"] as const;
    const executionFieldCount = executionFields.filter((field) => Object.hasOwn(row, field)).length;
    if (executionFieldCount === 0) continue;
    if (executionFieldCount !== executionFields.length) throw new SmartBookManifestError("Manifest assessment execution snapshot is incomplete.");
    runtimeString(row.deliveryMode, "assessment delivery mode");
    if (row.instructions !== null && typeof row.instructions !== "string") throw new SmartBookManifestError("Manifest assessment instructions are invalid.");
    for (const field of ["durationMinutes", "totalMarks"] as const) if (row[field] !== null && (!Number.isInteger(row[field]) || Number(row[field]) < 0)) throw new SmartBookManifestError(`Manifest assessment ${field} is invalid.`);
    if (typeof row.allowOnlineAttempt !== "boolean" || typeof row.allowPrint !== "boolean") throw new SmartBookManifestError("Manifest assessment delivery flags are invalid.");
    for (const field of ["chapterId", "moduleId", "unitId", "partId"] as const) if (row[field] !== null && typeof row[field] !== "string") throw new SmartBookManifestError(`Manifest assessment ${field} is invalid.`);
    runtimeStringArray(row.chapterIds, "assessment chapter scope"); runtimeStringArray(row.itemSourceIds, "assessment item order"); runtimeStringArray(row.questionIds, "assessment question order");
    if (!Array.isArray(row.sectionInstructions) || row.sectionInstructions.some((entry) => !isObject(entry) || typeof entry.questionType !== "string" || typeof entry.instruction !== "string")) throw new SmartBookManifestError("Manifest assessment section instructions are invalid.");
    if (row.releaseVersionId !== null && row.releaseVersionId !== undefined) assertIdField(row.releaseVersionId, "assessment release version");
  }
  for (const item of value.questions as unknown[]) {
    const row = item as Record<string, unknown>;
    runtimeString(row.questionType, "question type"); runtimeString(row.questionText, "question text");
    if (!Number.isInteger(row.marks) || (row.marks as number) < 0 || !Number.isInteger(row.displayOrder) || (row.displayOrder as number) < 0) throw new SmartBookManifestError("Manifest question bounds are invalid.");
    if (row.imageResourceId !== null && row.imageResourceId !== undefined) assertIdField(row.imageResourceId, "question image resource");
  }
  return normalizeAssets(value as unknown as SmartBookManifestAssets);
}

function assertUniqueAssetIdentities(items: unknown[], label: string) {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!isObject(item) || typeof item.sourceId !== "string") continue;
    const serialized = JSON.stringify(item);
    const previous = seen.get(item.sourceId);
    if (previous !== undefined && previous !== serialized) throw new SmartBookManifestError(`Manifest ${label} contains conflicting duplicate identities.`);
    seen.set(item.sourceId, serialized);
  }
}

function assertNoForbiddenKeys(value: unknown, path: string): void {
  if (Array.isArray(value)) { for (const item of value) assertNoForbiddenKeys(item, path); return; }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenManifestKeys.has(key) || [...forbiddenManifestKeys].some((forbidden) => forbidden.toLowerCase() === key.toLowerCase())) throw new SmartBookManifestError(`${path} contains private or answer data.`);
    assertNoForbiddenKeys(child, `${path}.${key}`);
  }
}

function validateStorage(value: unknown, label: string): void {
  if (value === null || value === undefined) return;
  if (!isObject(value) || !["OBJECT_KEY", "MANAGED_URL", "EXTERNAL_REFERENCE", "LEGACY_URL"].includes(String(value.kind)) || typeof value.value !== "string" || !value.value.trim()) throw new SmartBookManifestError(`${label} is invalid.`);
  if (value.kind === "MANAGED_URL" || value.kind === "EXTERNAL_REFERENCE" || value.kind === "LEGACY_URL") assertSafeHttpsUrl(value.value, label);
  if (value.contentType !== undefined && value.contentType !== null && (typeof value.contentType !== "string" || !value.contentType.trim())) throw new SmartBookManifestError(`${label} content type is invalid.`);
  if (value.byteLength !== undefined && value.byteLength !== null && (!Number.isSafeInteger(value.byteLength) || Number(value.byteLength) < 0)) throw new SmartBookManifestError(`${label} byte length is invalid.`);
}

function assertSafeHttpsUrl(value: string, label: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error("unsafe URL");
  } catch {
    throw new SmartBookManifestError(`${label} is invalid.`);
  }
}

function runtimeString(value: unknown, label: string): asserts value is string { if (typeof value !== "string" || !value.trim()) throw new SmartBookManifestError(`Manifest ${label} is invalid.`); }
function runtimeStringArray(value: unknown, label: string): asserts value is string[] { if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) throw new SmartBookManifestError(`Manifest ${label} is invalid.`); }
function cloneJson(value: unknown): unknown { if (Array.isArray(value)) return value.map(cloneJson); if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneJson(child)])); return value; }
function isPdf(value: unknown): value is SmartBookManifestPdf { return isObject(value) && typeof value.bookPdfVersionId === "string" && value.bookPdfVersionId.trim().length > 0 && typeof value.objectKey === "string" && value.objectKey.trim().length > 0 && typeof value.pageCount === "number" && Number.isInteger(value.pageCount) && value.pageCount > 0 && value.pageCount <= 100000 && (value.activatedAt === null || (typeof value.activatedAt === "string" && isIsoDate(value.activatedAt))); }
function isContentDocument(value: unknown): value is ContentDocument { return isObject(value) && value.version === 4 && Array.isArray(value.blocks) && Array.isArray(value.periods) && isObject(value.canvas); }
function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function assertId(value: string, label: string) { if (!value.trim() || value.length > 200 || /[\u0000-\u001f\u007f]/u.test(value)) throw new SmartBookManifestError(`${label} is invalid.`); }
function assertIdField(value: unknown, label: string): asserts value is string { if (typeof value !== "string") throw new SmartBookManifestError(`${label} is invalid.`); assertId(value, label); }
function nullableId(value: unknown): string | null { if (value === null || value === undefined || value === "") return null; if (typeof value !== "string") throw new SmartBookManifestError("Manifest hierarchy relationship is invalid."); assertId(value, "hierarchy relationship"); return value; }
function requiredText(value: string, label: string): string { const text = value.trim(); if (!text) throw new SmartBookManifestError(`${label} is required.`); return text; }
function optionalText(value: string | null | undefined): string | null { const text = value?.trim() ?? ""; return text || null; }
function nullableString(value: unknown): string | null { return value === null || value === undefined || value === "" ? null : typeof value === "string" ? value : (() => { throw new SmartBookManifestError("Manifest text field is invalid."); })(); }
function nullableInteger(value: unknown): number | null { return value === null || value === undefined ? null : integer(value, "number"); }
function integer(value: unknown, label: string): number { if (!Number.isInteger(value) || (value as number) < 0) throw new SmartBookManifestError(`Manifest ${label} is invalid.`); return value as number; }
function nullablePositiveInteger(value: unknown, label: string): number | null { return value === null || value === undefined ? null : positiveInteger(value, label); }
function positiveInteger(value: unknown, label: string): number { if (!Number.isInteger(value) || (value as number) < 1) throw new SmartBookManifestError(`Manifest ${label} is invalid.`); return value as number; }
function assertPageRange(startPage: number | null, endPage: number | null, sourceId: string) { if ((startPage === null) !== (endPage === null) || (startPage !== null && endPage !== null && startPage > endPage)) throw new SmartBookManifestError(`Invalid page range for ${sourceId}.`); }
function isIsoDate(value: string) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !Number.isNaN(Date.parse(value)); }
function stringArray(value: Prisma.JsonValue | null): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : []; }
function toSafeJson(value: Prisma.JsonValue | null | undefined): SafeManifestJson | null { if (value === null || value === undefined) return null; if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value; if (Array.isArray(value)) return value.map((item) => toSafeJson(item) as SafeManifestJson); return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toSafeJson(item) as SafeManifestJson])); }
