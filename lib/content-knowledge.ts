import "server-only";

import type { Prisma } from "@prisma/client";

import {
  isTextBlock,
  type ContentDocument,
} from "@/lib/content-document";
import {
  KNOWLEDGE_REFERENCE_TYPES,
  type KnowledgeDefinitionSummary,
  type KnowledgeReference,
  type KnowledgeReferenceType,
} from "@/lib/content-knowledge-types";
import { prisma } from "@/lib/prisma";

type KnowledgeScope = {
  publisherId: string;
  bookId: string;
};

type KnowledgeValidationError = {
  blockId: string;
  message: string;
};

export function slugifyKnowledge(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeKnowledgeText(value: unknown, max = 12000) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizeKnowledgeTags(value: string) {
  return value
    .split(",")
    .map((entry) => normalizeKnowledgeText(entry, 48).toLowerCase())
    .filter(Boolean)
    .slice(0, 24);
}

export async function requireKnowledgeBookScope(
  publisherId: string,
  bookId: string,
): Promise<KnowledgeScope> {
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId },
    select: { id: true },
  });
  if (!book) throw new Error("Book not found.");
  return { publisherId, bookId };
}

export async function ensurePublisherResource(
  publisherId: string,
  bookId: string,
  resourceId: string | null,
) {
  if (!resourceId) return null;
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      publisherId,
      archived: false,
      OR: [{ bookId }, { bookId: null }],
    },
    select: { id: true },
  });
  if (!resource) throw new Error("Resource not found for this publisher or book.");
  return resource.id;
}

export async function searchKnowledgeDefinitions(
  scope: KnowledgeScope,
  query: string,
): Promise<KnowledgeDefinitionSummary[]> {
  const q = normalizeKnowledgeText(query, 80);
  const whereScope = {
    publisherId: scope.publisherId,
    OR: [{ bookId: scope.bookId }, { bookId: null }],
  };
  const matchVocabulary: Prisma.PublisherVocabularyWhereInput = q
    ? {
        OR: [
          { term: { contains: q, mode: "insensitive" } },
          { slug: { contains: slugifyKnowledge(q), mode: "insensitive" } },
          { tags: { has: q.toLowerCase() } },
        ],
      }
    : {};
  const matchConcept: Prisma.PublisherConceptWhereInput = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: slugifyKnowledge(q), mode: "insensitive" } },
          { relatedTopics: { has: q.toLowerCase() } },
        ],
      }
    : {};

  const [vocabulary, concepts] = await Promise.all([
    prisma.publisherVocabulary.findMany({
      where: { ...whereScope, ...matchVocabulary },
      select: vocabularySelect,
      orderBy: [{ updatedAt: "desc" }, { term: "asc" }],
      take: 20,
    }),
    prisma.publisherConcept.findMany({
      where: { ...whereScope, ...matchConcept },
      select: conceptSelect,
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take: 20,
    }),
  ]);

  return [
    ...vocabulary.map(mapVocabulary),
    ...concepts.map(mapConcept),
  ].slice(0, 30);
}

export async function resolveKnowledgeDefinitionsForDocument(
  scope: KnowledgeScope,
  document: ContentDocument,
) {
  const ids = collectKnowledgeIds(document);
  const [vocabulary, concepts] = await Promise.all([
    ids.VOCABULARY.length
      ? prisma.publisherVocabulary.findMany({
          where: {
            id: { in: ids.VOCABULARY },
            publisherId: scope.publisherId,
            OR: [{ bookId: scope.bookId }, { bookId: null }],
          },
          select: vocabularySelect,
        })
      : [],
    ids.CONCEPT.length
      ? prisma.publisherConcept.findMany({
          where: {
            id: { in: ids.CONCEPT },
            publisherId: scope.publisherId,
            OR: [{ bookId: scope.bookId }, { bookId: null }],
          },
          select: conceptSelect,
        })
      : [],
  ]);

  const resolved: Record<string, KnowledgeDefinitionSummary | null> = {};
  for (const item of vocabulary) resolved[`VOCABULARY:${item.id}`] = mapVocabulary(item);
  for (const item of concepts) resolved[`CONCEPT:${item.id}`] = mapConcept(item);
  for (const id of ids.VOCABULARY) resolved[`VOCABULARY:${id}`] ??= null;
  for (const id of ids.CONCEPT) resolved[`CONCEPT:${id}`] ??= null;
  return resolved;
}

export async function validateKnowledgeDocument(scope: KnowledgeScope, document: ContentDocument) {
  const resolved = await resolveKnowledgeDefinitionsForDocument(scope, document);
  const errors: KnowledgeValidationError[] = [];
  const blocks = document.blocks.map((block) => {
    if (!isTextBlock(block) || !block.knowledgeReferences?.length) return block;
    const references = normalizeKnowledgeReferences(block.knowledgeReferences, block.text);
    const valid = references.filter((reference) => {
      if (!resolved[knowledgeKey(reference.type, reference.targetId)]) {
        errors.push({ blockId: block.id, message: "Knowledge reference is unavailable for this publisher or book." });
        return false;
      }
      return true;
    });
    return { ...block, knowledgeReferences: valid };
  });

  if (errors.length) {
    throw new Error(errors[0]?.message ?? "Knowledge reference validation failed.");
  }
  return { ...document, blocks };
}

export function normalizeKnowledgeReferences(
  references: KnowledgeReference[] | undefined,
  text: string,
) {
  if (!references?.length) return [];
  const length = text.length;
  return references
    .map((reference) => ({
      id: normalizeKnowledgeText(reference.id, 80) || stableKnowledgeReferenceId(),
      type: normalizeKnowledgeType(reference.type),
      targetId: normalizeKnowledgeText(reference.targetId, 120),
      label: normalizeKnowledgeText(reference.label, 200),
      start: clampNumber(reference.start, 0, length),
      end: clampNumber(reference.end, 0, length),
    }))
    .filter(
      (reference): reference is KnowledgeReference =>
        Boolean(reference.type && reference.targetId && reference.label && reference.end > reference.start),
    );
}

export function knowledgeKey(type: KnowledgeReferenceType, id: string) {
  return `${type}:${id}`;
}

function collectKnowledgeIds(document: ContentDocument) {
  const ids: Record<KnowledgeReferenceType, string[]> = {
    VOCABULARY: [],
    CONCEPT: [],
  };
  for (const block of document.blocks) {
    if (!isTextBlock(block)) continue;
    for (const reference of block.knowledgeReferences ?? []) {
      if (!KNOWLEDGE_REFERENCE_TYPES.includes(reference.type)) continue;
      ids[reference.type].push(reference.targetId);
    }
  }
  return {
    VOCABULARY: [...new Set(ids.VOCABULARY)],
    CONCEPT: [...new Set(ids.CONCEPT)],
  };
}

const resourceSelect = {
  fileUrl: true,
} satisfies Prisma.ResourceSelect;

const vocabularySelect = {
  id: true,
  bookId: true,
  term: true,
  slug: true,
  meaning: true,
  simpleMeaning: true,
  pronunciation: true,
  example: true,
  tags: true,
  active: true,
  published: true,
  imageResource: { select: resourceSelect },
  audioResource: { select: resourceSelect },
} satisfies Prisma.PublisherVocabularySelect;

const conceptSelect = {
  id: true,
  bookId: true,
  title: true,
  slug: true,
  definition: true,
  summary: true,
  relatedTopics: true,
  active: true,
  published: true,
  imageResource: { select: resourceSelect },
  videoResource: { select: resourceSelect },
  diagramResource: { select: resourceSelect },
} satisfies Prisma.PublisherConceptSelect;

function mapVocabulary(row: Prisma.PublisherVocabularyGetPayload<{ select: typeof vocabularySelect }>): KnowledgeDefinitionSummary {
  return {
    id: row.id,
    type: "VOCABULARY",
    label: row.term,
    slug: row.slug,
    primaryText: row.meaning,
    secondaryText: row.simpleMeaning,
    pronunciation: row.pronunciation,
    example: row.example,
    tags: row.tags,
    bookId: row.bookId,
    active: row.active,
    published: row.published,
    imageUrl: row.imageResource?.fileUrl ?? null,
    audioUrl: row.audioResource?.fileUrl ?? null,
    videoUrl: null,
    diagramUrl: null,
  };
}

function mapConcept(row: Prisma.PublisherConceptGetPayload<{ select: typeof conceptSelect }>): KnowledgeDefinitionSummary {
  return {
    id: row.id,
    type: "CONCEPT",
    label: row.title,
    slug: row.slug,
    primaryText: row.definition,
    secondaryText: row.summary,
    pronunciation: null,
    example: null,
    tags: row.relatedTopics,
    bookId: row.bookId,
    active: row.active,
    published: row.published,
    imageUrl: row.imageResource?.fileUrl ?? null,
    audioUrl: null,
    videoUrl: row.videoResource?.fileUrl ?? null,
    diagramUrl: row.diagramResource?.fileUrl ?? null,
  };
}

function normalizeKnowledgeType(value: unknown): KnowledgeReferenceType | null {
  return typeof value === "string" && KNOWLEDGE_REFERENCE_TYPES.includes(value as KnowledgeReferenceType)
    ? value as KnowledgeReferenceType
    : null;
}

function clampNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function stableKnowledgeReferenceId() {
  return `kr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
