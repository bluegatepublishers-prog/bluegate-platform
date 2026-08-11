import "server-only";

import { PublisherWorksheetType, ResourceAudience, ResourceType } from "@prisma/client";

import type { ContentRenderMode } from "@/lib/content-audience";
import { prisma } from "@/lib/prisma";
import {
  WORKSHEET_AUDIENCES,
  WORKSHEET_DIFFICULTIES,
  WORKSHEET_TYPES,
  type ResolvedWorksheetBlock,
  type WorksheetAudience,
  type WorksheetDifficulty,
  type WorksheetStudioRecord,
} from "@/lib/worksheet-studio-types";

export type WorksheetActor = {
  userId: string;
  publisherId: string;
};

export type WorksheetWriteInput = {
  id?: string | null;
  chapterId: string;
  moduleId?: string | null;
  topicId?: string | null;
  exerciseId?: string | null;
  printableResourceId?: string | null;
  answerKeyResourceId?: string | null;
  supportingResourceIds?: string[];
  title: string;
  slug?: string | null;
  type: PublisherWorksheetType;
  instructions?: string | null;
  estimatedMinutes?: number | null;
  difficulty?: WorksheetDifficulty | null;
  audience: WorksheetAudience;
  totalMarks?: number | null;
  allowOnlineAttempt: boolean;
  allowPrint: boolean;
  showAnswersAfterSubmit: boolean;
  active: boolean;
  published: boolean;
  sortOrder?: number | null;
};

export async function loadWorksheetStudio(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
  moduleId?: string | null;
  topicId?: string | null;
}) {
  const rows = await prisma.publisherWorksheet.findMany({
    where: {
      publisherId: input.publisherId,
      bookId: input.bookId,
      chapterId: input.chapterId,
      ...(input.topicId ? { topicId: input.topicId } : input.moduleId ? { moduleId: input.moduleId, topicId: null } : {}),
      archivedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
  });
  return rows.map(toWorksheetStudioRecord);
}

export async function loadWorksheetStudioLookups(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
  moduleId?: string | null;
  topicId?: string | null;
}) {
  const [modules, topics, exercises, resources] = await Promise.all([
    prisma.bookModule.findMany({
      where: { bookId: input.bookId, chapterId: input.chapterId, archived: false },
      select: { id: true, title: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
    prisma.bookTopic.findMany({
      where: { bookId: input.bookId, chapterId: input.chapterId, archived: false },
      select: { id: true, title: true, moduleId: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
    prisma.bookExercise.findMany({
      where: {
        bookId: input.bookId,
        chapterId: input.chapterId,
        archived: false,
        ...(input.topicId ? { topicId: input.topicId } : input.moduleId ? { moduleId: input.moduleId, topicId: null } : {}),
      },
      select: { id: true, title: true, published: true, marks: true, _count: { select: { questions: true } } },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
    prisma.resource.findMany({
      where: {
        publisherId: input.publisherId,
        archived: false,
        OR: [
          { bookId: input.bookId },
          { chapterId: input.chapterId },
          { bookResourceLinks: { some: { bookId: input.bookId, active: true } } },
        ],
        type: { in: [ResourceType.PDF, ResourceType.DOC, ResourceType.WORKSHEET, ResourceType.ANSWER_KEY] },
      },
      select: { id: true, title: true, type: true, audience: true, published: true },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take: 200,
    }),
  ]);
  return { modules, topics, exercises, resources };
}

export async function resolveWorksheetsForLinkedAssetDocument(input: {
  publisherId: string;
  bookId: string;
  mode: ContentRenderMode;
  blocks: { id: string; targetType: string; targetId: string }[];
}) {
  const targetIds = Array.from(
    new Set(input.blocks.filter((block) => block.targetType === "PUBLISHER_WORKSHEET").map((block) => block.targetId)),
  );
  if (!targetIds.length) return {};
  const rows = await prisma.publisherWorksheet.findMany({
    where: {
      id: { in: targetIds },
      publisherId: input.publisherId,
      bookId: input.bookId,
      archivedAt: null,
      ...(input.mode === "STUDENT" ? { active: true, published: true } : {}),
    },
    include: {
      exercise: { select: { id: true, title: true, marks: true, published: true, _count: { select: { questions: true } } } },
      printableResource: { select: resourceSummarySelect },
      answerKeyResource: { select: resourceSummarySelect },
    },
  });
  const supporting = await loadSupportingResources(input.publisherId, input.bookId, rows);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return Object.fromEntries(
    input.blocks
      .filter((block) => block.targetType === "PUBLISHER_WORKSHEET")
      .map((block) => {
        const row = byId.get(block.targetId);
        if (!row) return [block.id, null];
        return [block.id, resolveWorksheet(row, supporting.get(row.id) ?? [], input.mode)];
      }),
  );
}

export async function saveWorksheetStudioRecord(input: {
  actor: WorksheetActor;
  bookId: string;
  data: WorksheetWriteInput;
}) {
  const data = normalizeWorksheetWrite(input.data);
  await assertWorksheetScope(input.actor.publisherId, input.bookId, data);
  await assertWorksheetExercise(input.actor.publisherId, input.bookId, data);
  await assertWorksheetResources(input.actor.publisherId, input.bookId, data);
  const duplicate = await prisma.publisherWorksheet.findFirst({
    where: {
      publisherId: input.actor.publisherId,
      bookId: input.bookId,
      slug: data.slug,
      archivedAt: null,
      ...(data.id ? { NOT: { id: data.id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("A worksheet with this slug already exists in this book.");

  if (data.id) {
    const found = await prisma.publisherWorksheet.findFirst({
      where: { id: data.id, publisherId: input.actor.publisherId, bookId: input.bookId, archivedAt: null },
      select: { id: true },
    });
    if (!found) throw new Error("Worksheet not found.");
    await prisma.publisherWorksheet.update({
      where: { id: data.id },
      data: worksheetMutationData(data),
    });
    return data.id;
  }

  const created = await prisma.publisherWorksheet.create({
    data: {
      publisherId: input.actor.publisherId,
      bookId: input.bookId,
      chapterId: data.chapterId,
      ...worksheetMutationData(data),
    },
    select: { id: true },
  });
  return created.id;
}

export async function archiveWorksheetStudioRecord(input: {
  actor: WorksheetActor;
  bookId: string;
  worksheetId: string;
}) {
  await prisma.publisherWorksheet.updateMany({
    where: { id: input.worksheetId, publisherId: input.actor.publisherId, bookId: input.bookId, archivedAt: null },
    data: { active: false, published: false, archivedAt: new Date() },
  });
}

export async function restoreWorksheetStudioRecord(input: {
  actor: WorksheetActor;
  bookId: string;
  worksheetId: string;
}) {
  const restored = await prisma.publisherWorksheet.updateMany({
    where: { id: input.worksheetId, publisherId: input.actor.publisherId, bookId: input.bookId, archivedAt: { not: null } },
    data: { archivedAt: null, active: true, published: false },
  });
  if (restored.count !== 1) throw new Error("Archived worksheet not found.");
}
export async function duplicateWorksheetStudioRecord(input: {
  actor: WorksheetActor;
  bookId: string;
  worksheetId: string;
}) {
  const row = await prisma.publisherWorksheet.findFirst({
    where: { id: input.worksheetId, publisherId: input.actor.publisherId, bookId: input.bookId, archivedAt: null },
  });
  if (!row) throw new Error("Worksheet not found.");
  const slug = await uniqueWorksheetSlug(input.actor.publisherId, input.bookId, `${row.slug}-copy`);
  await prisma.publisherWorksheet.create({
    data: {
      publisherId: row.publisherId,
      bookId: row.bookId,
      chapterId: row.chapterId,
      moduleId: row.moduleId,
      topicId: row.topicId,
      exerciseId: row.exerciseId,
      printableResourceId: row.printableResourceId,
      answerKeyResourceId: row.answerKeyResourceId,
      supportingResourceIds: row.supportingResourceIds,
      title: `${row.title} Copy`,
      slug,
      type: row.type,
      instructions: row.instructions,
      estimatedMinutes: row.estimatedMinutes,
      difficulty: row.difficulty,
      audience: row.audience,
      totalMarks: row.totalMarks,
      allowOnlineAttempt: row.allowOnlineAttempt,
      allowPrint: row.allowPrint,
      showAnswersAfterSubmit: row.showAnswersAfterSubmit,
      active: row.active,
      published: false,
      sortOrder: row.sortOrder + 1,
    },
  });
}

export async function moveWorksheetStudioRecord(input: {
  actor: WorksheetActor;
  bookId: string;
  chapterId: string;
  moduleId?: string | null;
  topicId?: string | null;
  worksheetId: string;
  direction: -1 | 1;
}) {
  const rows = await prisma.publisherWorksheet.findMany({
    where: {
      publisherId: input.actor.publisherId,
      bookId: input.bookId,
      chapterId: input.chapterId,
      ...(input.topicId ? { topicId: input.topicId } : input.moduleId ? { moduleId: input.moduleId, topicId: null } : {}),
      archivedAt: null,
    },
    select: { id: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
  });
  const index = rows.findIndex((row) => row.id === input.worksheetId);
  const current = rows[index];
  const sibling = rows[index + input.direction];
  if (!current || !sibling) return;
  await prisma.$transaction([
    prisma.publisherWorksheet.update({ where: { id: current.id }, data: { sortOrder: sibling.sortOrder } }),
    prisma.publisherWorksheet.update({ where: { id: sibling.id }, data: { sortOrder: current.sortOrder } }),
  ]);
}

export async function createWorksheetExercise(input: {
  actor: WorksheetActor;
  bookId: string;
  chapterId: string;
  title: string;
  moduleId?: string | null;
  topicId?: string | null;
}) {
  await assertWorksheetScope(input.actor.publisherId, input.bookId, {
    chapterId: input.chapterId,
    moduleId: input.moduleId ?? null,
    topicId: input.topicId ?? null,
  });
  const created = await prisma.bookExercise.create({
    data: {
      bookId: input.bookId,
      chapterId: input.chapterId,
      moduleId: input.moduleId ?? null,
      topicId: input.topicId ?? null,
      title: input.title.trim().slice(0, 200) || "Worksheet Exercise",
      type: "WORKSHEET",
      published: false,
      archived: false,
    },
    select: { id: true },
  });
  return created.id;
}

const resourceSummarySelect = {
  id: true,
  title: true,
  type: true,
  audience: true,
  published: true,
} as const;

async function loadSupportingResources(
  publisherId: string,
  bookId: string,
  worksheets: { id: string; supportingResourceIds: string[] }[],
) {
  const ids = Array.from(new Set(worksheets.flatMap((worksheet) => worksheet.supportingResourceIds)));
  if (!ids.length) return new Map<string, ReturnType<typeof resourceSummary>[]>();
  const rows = await prisma.resource.findMany({
    where: {
      id: { in: ids },
      publisherId,
      archived: false,
      OR: [{ bookId }, { bookResourceLinks: { some: { bookId, active: true } } }],
    },
    select: resourceSummarySelect,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const result = new Map<string, ReturnType<typeof resourceSummary>[]>();
  for (const worksheet of worksheets) {
    result.set(
      worksheet.id,
      worksheet.supportingResourceIds.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row)).map(resourceSummary),
    );
  }
  return result;
}

function resolveWorksheet(
  row: Parameters<typeof toWorksheetStudioRecord>[0] & {
    exercise: { id: string; title: string; marks: number | null; published: boolean; _count: { questions: number } } | null;
    printableResource: Parameters<typeof resourceSummary>[0] | null;
    answerKeyResource: Parameters<typeof resourceSummary>[0] | null;
  },
  supportingResources: ReturnType<typeof resourceSummary>[],
  mode: ContentRenderMode,
): ResolvedWorksheetBlock {
  return {
    worksheet: toWorksheetStudioRecord(row),
    exercise: row.exercise
      ? {
          id: row.exercise.id,
          title: row.exercise.title,
          marks: row.exercise.marks,
          published: row.exercise.published,
          questionCount: row.exercise._count.questions,
          route: { href: "#", openMode: "route" as const },
        }
      : null,
    printableResource: row.printableResource && row.allowPrint ? remapResource(resourceSummary(row.printableResource), mode) : null,
    answerKeyResource: mode === "STUDENT" ? null : row.answerKeyResource ? resourceSummary(row.answerKeyResource) : null,
    supportingResources: supportingResources
      .filter((resource) => mode !== "STUDENT" || (resource.published && !resource.teacherOnly))
      .map((resource) => remapResource(resource, mode)),
  };
}

function resourceSummary(row: { id: string; title: string; type: ResourceType; audience: ResourceAudience; published: boolean }) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    route: { href: `/api/resources/${encodeURIComponent(row.id)}/download`, openMode: "route" as const },
    published: row.published,
    teacherOnly: row.audience === ResourceAudience.TEACHER_ONLY,
  };
}

function remapResource(resource: ReturnType<typeof resourceSummary>, mode: ContentRenderMode) {
  if (mode !== "STUDENT") return resource;
  return {
    ...resource,
    route: { href: `/api/student/resources/${encodeURIComponent(resource.id)}/open`, openMode: "route" as const },
  };
}

async function assertWorksheetScope(
  publisherId: string,
  bookId: string,
  data: { chapterId: string; moduleId?: string | null; topicId?: string | null },
) {
  const chapter = await prisma.bookChapter.findFirst({
    where: { id: data.chapterId, bookId, book: { publisherId } },
    select: { id: true },
  });
  if (!chapter) throw new Error("Chapter not found.");
  if (data.moduleId) {
    const moduleNode = await prisma.bookModule.findFirst({
      where: { id: data.moduleId, bookId, chapterId: data.chapterId, book: { publisherId } },
      select: { id: true },
    });
    if (!moduleNode) throw new Error("Module scope is invalid.");
  }
  if (data.topicId) {
    const topic = await prisma.bookTopic.findFirst({
      where: { id: data.topicId, bookId, chapterId: data.chapterId, book: { publisherId } },
      select: { id: true, moduleId: true },
    });
    if (!topic) throw new Error("Topic scope is invalid.");
    if (data.moduleId && topic.moduleId && topic.moduleId !== data.moduleId) throw new Error("Topic scope is invalid.");
  }
}

async function assertWorksheetExercise(
  publisherId: string,
  bookId: string,
  data: WorksheetWriteInput,
) {
  if (!data.exerciseId) return;
  const exercise = await prisma.bookExercise.findFirst({
    where: { id: data.exerciseId, bookId, chapterId: data.chapterId, book: { publisherId }, archived: false },
    select: { id: true },
  });
  if (!exercise) throw new Error("Linked exercise is unavailable for this worksheet scope.");
}

async function assertWorksheetResources(
  publisherId: string,
  bookId: string,
  data: WorksheetWriteInput,
) {
  const ids = Array.from(new Set([
    data.printableResourceId,
    data.answerKeyResourceId,
    ...(data.supportingResourceIds ?? []),
  ].filter((id): id is string => Boolean(id))));
  if (!ids.length) return;
  const rows = await prisma.resource.findMany({
    where: {
      id: { in: ids },
      publisherId,
      archived: false,
      OR: [{ bookId }, { chapterId: data.chapterId }, { bookResourceLinks: { some: { bookId, active: true } } }],
      type: { in: [ResourceType.PDF, ResourceType.DOC, ResourceType.WORKSHEET, ResourceType.ANSWER_KEY] },
    },
    select: { id: true, type: true },
  });
  if (rows.length !== ids.length) throw new Error("One or more worksheet resources are unavailable for this publisher or book.");
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (data.answerKeyResourceId && byId.get(data.answerKeyResourceId)?.type !== ResourceType.ANSWER_KEY) {
    throw new Error("Answer key must use an answer-key Resource.");
  }
}

function normalizeWorksheetWrite(data: WorksheetWriteInput): WorksheetWriteInput & { slug: string } {
  const title = cleanRequired(data.title, "Worksheet title is required.").slice(0, 200);
  const slug = slugify(data.slug || title);
  if (!slug) throw new Error("Worksheet slug is required.");
  const type = WORKSHEET_TYPES.includes(data.type) ? data.type : "CLASSROOM";
  return {
    ...data,
    id: cleanOptional(data.id, 120),
    chapterId: cleanRequired(data.chapterId, "Chapter is required."),
    moduleId: cleanOptional(data.moduleId, 120),
    topicId: cleanOptional(data.topicId, 120),
    exerciseId: cleanOptional(data.exerciseId, 120),
    printableResourceId: cleanOptional(data.printableResourceId, 120),
    answerKeyResourceId: cleanOptional(data.answerKeyResourceId, 120),
    supportingResourceIds: cleanList(data.supportingResourceIds, 30, 120),
    title,
    slug,
    type,
    instructions: cleanOptional(data.instructions, 6000),
    estimatedMinutes: data.estimatedMinutes && data.estimatedMinutes > 0 ? Math.floor(data.estimatedMinutes) : null,
    difficulty: data.difficulty && WORKSHEET_DIFFICULTIES.includes(data.difficulty) ? data.difficulty : null,
    audience: WORKSHEET_AUDIENCES.includes(data.audience) ? data.audience : "BOTH",
    totalMarks: data.totalMarks && data.totalMarks > 0 ? Math.floor(data.totalMarks) : null,
    allowOnlineAttempt: Boolean(data.allowOnlineAttempt),
    allowPrint: Boolean(data.allowPrint),
    showAnswersAfterSubmit: Boolean(data.showAnswersAfterSubmit),
    active: Boolean(data.active),
    published: Boolean(data.published),
    sortOrder: data.sortOrder && data.sortOrder > 0 ? Math.floor(data.sortOrder) : 0,
  };
}

function worksheetMutationData(data: WorksheetWriteInput & { slug: string }) {
  return {
    moduleId: data.moduleId ?? null,
    topicId: data.topicId ?? null,
    exerciseId: data.exerciseId ?? null,
    printableResourceId: data.printableResourceId ?? null,
    answerKeyResourceId: data.answerKeyResourceId ?? null,
    supportingResourceIds: data.supportingResourceIds ?? [],
    title: data.title,
    slug: data.slug,
    type: data.type,
    instructions: data.instructions ?? null,
    estimatedMinutes: data.estimatedMinutes ?? null,
    difficulty: data.difficulty ?? null,
    audience: data.audience,
    totalMarks: data.totalMarks ?? null,
    allowOnlineAttempt: data.allowOnlineAttempt,
    allowPrint: data.allowPrint,
    showAnswersAfterSubmit: data.showAnswersAfterSubmit,
    active: data.active,
    published: data.published,
    sortOrder: data.sortOrder ?? 0,
  };
}

function toWorksheetStudioRecord(row: {
  id: string;
  publisherId: string;
  bookId: string;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  exerciseId: string | null;
  printableResourceId: string | null;
  answerKeyResourceId: string | null;
  supportingResourceIds: string[];
  title: string;
  slug: string;
  type: PublisherWorksheetType;
  instructions: string | null;
  estimatedMinutes: number | null;
  difficulty: string | null;
  audience: string;
  totalMarks: number | null;
  allowOnlineAttempt: boolean;
  allowPrint: boolean;
  showAnswersAfterSubmit: boolean;
  active: boolean;
  published: boolean;
  sortOrder: number;
  archivedAt: Date | null;
  updatedAt: Date;
}): WorksheetStudioRecord {
  return {
    id: row.id,
    publisherId: row.publisherId,
    bookId: row.bookId,
    chapterId: row.chapterId,
    moduleId: row.moduleId,
    topicId: row.topicId,
    exerciseId: row.exerciseId,
    printableResourceId: row.printableResourceId,
    answerKeyResourceId: row.answerKeyResourceId,
    supportingResourceIds: row.supportingResourceIds,
    title: row.title,
    slug: row.slug,
    type: row.type,
    instructions: row.instructions,
    estimatedMinutes: row.estimatedMinutes,
    difficulty: row.difficulty && WORKSHEET_DIFFICULTIES.includes(row.difficulty as WorksheetDifficulty) ? row.difficulty as WorksheetDifficulty : null,
    audience: WORKSHEET_AUDIENCES.includes(row.audience as WorksheetAudience) ? row.audience as WorksheetAudience : "BOTH",
    totalMarks: row.totalMarks,
    allowOnlineAttempt: row.allowOnlineAttempt,
    allowPrint: row.allowPrint,
    showAnswersAfterSubmit: row.showAnswersAfterSubmit,
    active: row.active,
    published: row.published,
    sortOrder: row.sortOrder,
    archived: Boolean(row.archivedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function uniqueWorksheetSlug(publisherId: string, bookId: string, base: string) {
  const root = slugify(base) || "worksheet";
  for (let index = 1; index < 100; index += 1) {
    const slug = index === 1 ? root : `${root}-${index}`;
    const existing = await prisma.publisherWorksheet.findFirst({
      where: { publisherId, bookId, slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function cleanRequired(value: string, message: string) {
  const next = value.replace(/\u0000/g, "").trim();
  if (!next) throw new Error(message);
  return next;
}

function cleanOptional(value: string | null | undefined, maxLength = 4000) {
  const next = (value ?? "").replace(/\u0000/g, "").trim().slice(0, maxLength);
  return next || null;
}

function cleanList(value: string[] | undefined, maxItems: number, maxLength: number) {
  return Array.from(new Set((value ?? []).map((item) => item.trim().slice(0, maxLength)).filter(Boolean))).slice(0, maxItems);
}
