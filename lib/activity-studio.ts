import "server-only";

import { Prisma, PublisherActivityType, ResourceAudience } from "@prisma/client";

import type { ContentRenderMode } from "@/lib/content-audience";
import {
  ACTIVITY_AUDIENCES,
  ACTIVITY_DIFFICULTIES,
  ACTIVITY_TYPES,
  type ActivityAudience,
  type ActivityDifficulty,
  type ActivityResourceAttachment,
  type ActivityStudioRecord,
} from "@/lib/activity-studio-types";
import { prisma } from "@/lib/prisma";

export type ActivityActor = {
  userId: string;
  publisherId: string;
};

export type ActivityWriteInput = {
  id?: string | null;
  chapterId: string;
  moduleId?: string | null;
  topicId?: string | null;
  title: string;
  activityType: PublisherActivityType;
  shortDescription?: string | null;
  objective: string;
  materials?: string | null;
  durationMinutes?: number | null;
  groupType?: string | null;
  preparation?: string | null;
  instructions: string;
  steps?: string[];
  observationPrompts?: string[];
  reflectionPrompts?: string[];
  expectedLearning?: string | null;
  assessment?: string | null;
  safetyNotes?: string | null;
  teacherGuidance?: string | null;
  studentInstructions?: string | null;
  attachmentResourceIds?: string[];
  imageResourceId?: string | null;
  videoResourceId?: string | null;
  diagramResourceId?: string | null;
  audience: ActivityAudience;
  difficulty?: ActivityDifficulty | null;
  active: boolean;
  published: boolean;
  sortOrder?: number | null;
};

export async function loadActivityStudio(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
}) {
  const rows = await prisma.chapterActivity.findMany({
    where: {
      chapterId: input.chapterId,
      chapter: { bookId: input.bookId, book: { publisherId: input.publisherId } },
      archivedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
  });
  return rows.map(toActivityStudioRecord);
}

export async function loadActivityResourceOptions(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
}) {
  const rows = await prisma.resource.findMany({
    where: {
      publisherId: input.publisherId,
      archived: false,
      OR: [
        { bookId: input.bookId },
        { chapterId: input.chapterId },
        { bookResourceLinks: { some: { bookId: input.bookId, active: true } } },
      ],
    },
    select: {
      id: true,
      title: true,
      type: true,
      audience: true,
      published: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    audience: row.audience,
    published: row.published,
  }));
}

export async function resolveActivitiesForLinkedAssetDocument(input: {
  publisherId: string;
  bookId: string;
  mode: ContentRenderMode;
  blocks: { id: string; targetType: string; targetId: string }[];
}) {
  const targetIds = Array.from(
    new Set(
      input.blocks
        .filter((block) => block.targetType === "CHAPTER_ACTIVITY")
        .map((block) => block.targetId)
        .filter(Boolean),
    ),
  );
  if (!targetIds.length) return {};
  const rows = await prisma.chapterActivity.findMany({
    where: {
      id: { in: targetIds },
      chapter: { bookId: input.bookId, book: { publisherId: input.publisherId } },
      archivedAt: null,
      ...(input.mode === "STUDENT" ? { active: true, published: true } : {}),
    },
  });
  const resources = await loadActivityAttachments(input.publisherId, input.bookId, rows);
  const byId = new Map(rows.map((row) => [row.id, { row, attachments: resources.get(row.id) ?? [] }]));
  return Object.fromEntries(
    input.blocks
      .filter((block) => block.targetType === "CHAPTER_ACTIVITY")
      .map((block) => {
        const entry = byId.get(block.targetId);
        if (!entry) return [block.id, null];
        return [
          block.id,
          {
            activity: toActivityStudioRecord(entry.row),
            attachments: filterAttachmentsForMode(entry.attachments, input.mode),
          },
        ];
      }),
  );
}

export async function saveActivityStudioRecord(input: {
  actor: ActivityActor;
  bookId: string;
  data: ActivityWriteInput;
}) {
  const normalized = normalizeActivityWrite(input.data);
  const scope = await assertActivityScope(input.actor.publisherId, input.bookId, normalized);
  await assertActivityResources(input.actor.publisherId, input.bookId, normalized);
  if (normalized.id) {
    const found = await prisma.chapterActivity.findFirst({
      where: {
        id: normalized.id,
        chapter: { bookId: input.bookId, book: { publisherId: input.actor.publisherId } },
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!found) throw new Error("Activity not found.");
    await prisma.chapterActivity.update({
      where: { id: normalized.id },
      data: activityMutationData(normalized),
    });
    return normalized.id;
  }
  const created = await prisma.chapterActivity.create({
    data: {
      ...activityMutationData(normalized),
      chapterId: scope.chapterId,
      moduleId: scope.moduleId,
      topicId: scope.topicId,
    },
    select: { id: true },
  });
  return created.id;
}

export async function archiveActivityStudioRecord(input: {
  actor: ActivityActor;
  bookId: string;
  activityId: string;
}) {
  await prisma.chapterActivity.updateMany({
    where: {
      id: input.activityId,
      chapter: { bookId: input.bookId, book: { publisherId: input.actor.publisherId } },
      archivedAt: null,
    },
    data: {
      active: false,
      published: false,
      archivedAt: new Date(),
    },
  });
}

export async function duplicateActivityStudioRecord(input: {
  actor: ActivityActor;
  bookId: string;
  activityId: string;
}) {
  const row = await prisma.chapterActivity.findFirst({
    where: {
      id: input.activityId,
      chapter: { bookId: input.bookId, book: { publisherId: input.actor.publisherId } },
      archivedAt: null,
    },
  });
  if (!row) throw new Error("Activity not found.");
  const copy = await prisma.chapterActivity.create({
    data: {
      chapterId: row.chapterId,
      moduleId: row.moduleId,
      topicId: row.topicId,
      exerciseId: row.exerciseId,
      title: `${row.title} Copy`,
      activityType: row.activityType,
      shortDescription: row.shortDescription,
      objective: row.objective,
      materials: row.materials,
      durationMinutes: row.durationMinutes,
      groupType: row.groupType,
      preparation: row.preparation,
      instructions: row.instructions,
      steps: row.steps ?? Prisma.JsonNull,
      observationPrompts: row.observationPrompts ?? Prisma.JsonNull,
      reflectionPrompts: row.reflectionPrompts ?? Prisma.JsonNull,
      expectedLearning: row.expectedLearning,
      assessment: row.assessment,
      safetyNotes: row.safetyNotes,
      teacherGuidance: row.teacherGuidance,
      studentInstructions: row.studentInstructions,
      attachmentResourceIds: row.attachmentResourceIds ?? Prisma.JsonNull,
      imageResourceId: row.imageResourceId,
      videoResourceId: row.videoResourceId,
      diagramResourceId: row.diagramResourceId,
      audience: row.audience,
      difficulty: row.difficulty,
      active: row.active,
      published: false,
      approved: false,
      sortOrder: row.sortOrder + 1,
    },
    select: { id: true },
  });
  return copy.id;
}

export async function moveActivityStudioRecord(input: {
  actor: ActivityActor;
  bookId: string;
  chapterId: string;
  activityId: string;
  direction: -1 | 1;
}) {
  const rows = await prisma.chapterActivity.findMany({
    where: {
      chapterId: input.chapterId,
      chapter: { bookId: input.bookId, book: { publisherId: input.actor.publisherId } },
      archivedAt: null,
    },
    select: { id: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
  });
  const index = rows.findIndex((row) => row.id === input.activityId);
  const sibling = rows[index + input.direction];
  const current = rows[index];
  if (!current || !sibling) return;
  await prisma.$transaction([
    prisma.chapterActivity.update({ where: { id: current.id }, data: { sortOrder: sibling.sortOrder } }),
    prisma.chapterActivity.update({ where: { id: sibling.id }, data: { sortOrder: current.sortOrder } }),
  ]);
}

async function assertActivityScope(
  publisherId: string,
  bookId: string,
  data: ActivityWriteInput,
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
      where: {
        id: data.topicId,
        bookId,
        chapterId: data.chapterId,
        ...(data.moduleId ? { moduleId: data.moduleId } : {}),
        book: { publisherId },
      },
      select: { id: true, moduleId: true },
    });
    if (!topic) throw new Error("Topic scope is invalid.");
    if (topic.moduleId && data.moduleId && topic.moduleId !== data.moduleId) throw new Error("Topic scope is invalid.");
  }
  return {
    chapterId: data.chapterId,
    moduleId: data.moduleId ?? null,
    topicId: data.topicId ?? null,
  };
}

async function assertActivityResources(
  publisherId: string,
  bookId: string,
  data: ActivityWriteInput,
) {
  const ids = Array.from(
    new Set([
      ...(data.attachmentResourceIds ?? []),
      data.imageResourceId,
      data.videoResourceId,
      data.diagramResourceId,
    ].filter((id): id is string => Boolean(id))),
  );
  if (!ids.length) return;
  const rows = await prisma.resource.findMany({
    where: {
      id: { in: ids },
      publisherId,
      archived: false,
      OR: [
        { bookId },
        { chapterId: data.chapterId },
        { bookResourceLinks: { some: { bookId, active: true } } },
      ],
    },
    select: { id: true },
  });
  if (rows.length !== ids.length) throw new Error("One or more activity resources are unavailable for this publisher or book.");
}

async function loadActivityAttachments(
  publisherId: string,
  bookId: string,
  activities: Awaited<ReturnType<typeof prisma.chapterActivity.findMany>>,
) {
  const pairs = activities.flatMap((activity) =>
    normalizeStringArray(activity.attachmentResourceIds).map((resourceId) => ({ activityId: activity.id, resourceId })),
  );
  const ids = Array.from(new Set(pairs.map((pair) => pair.resourceId)));
  if (!ids.length) return new Map<string, ActivityResourceAttachment[]>();
  const resources = await prisma.resource.findMany({
    where: {
      id: { in: ids },
      publisherId,
      archived: false,
      OR: [
        { bookId },
        { bookResourceLinks: { some: { bookId, active: true } } },
      ],
    },
    select: {
      id: true,
      title: true,
      type: true,
      audience: true,
      published: true,
    },
  });
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  const result = new Map<string, ActivityResourceAttachment[]>();
  for (const pair of pairs) {
    const resource = byId.get(pair.resourceId);
    if (!resource) continue;
    const list = result.get(pair.activityId) ?? [];
    list.push({
      id: resource.id,
      title: resource.title,
      type: resource.type,
      route: { href: `/api/resources/${encodeURIComponent(resource.id)}/download`, openMode: "route" },
      teacherOnly: resource.audience === ResourceAudience.TEACHER_ONLY,
      published: resource.published,
    });
    result.set(pair.activityId, list);
  }
  return result;
}

function filterAttachmentsForMode(
  attachments: ActivityResourceAttachment[],
  mode: ContentRenderMode,
) {
  if (mode === "ADMIN_PREVIEW" || mode === "TEACHER") return attachments;
  return attachments.filter((attachment) => attachment.published && !attachment.teacherOnly).map((attachment) => ({
    ...attachment,
    route: { href: `/api/student/resources/${encodeURIComponent(attachment.id)}/open`, openMode: "route" as const },
  }));
}

function activityMutationData(data: ActivityWriteInput) {
  return {
    title: data.title,
    activityType: data.activityType,
    shortDescription: data.shortDescription ?? null,
    objective: data.objective,
    materials: data.materials ?? null,
    durationMinutes: data.durationMinutes ?? null,
    groupType: data.groupType ?? null,
    preparation: data.preparation ?? null,
    instructions: data.instructions,
    steps: data.steps?.length ? data.steps : Prisma.JsonNull,
    observationPrompts: data.observationPrompts?.length ? data.observationPrompts : Prisma.JsonNull,
    reflectionPrompts: data.reflectionPrompts?.length ? data.reflectionPrompts : Prisma.JsonNull,
    expectedLearning: data.expectedLearning ?? null,
    assessment: data.assessment ?? null,
    safetyNotes: data.safetyNotes ?? null,
    teacherGuidance: data.teacherGuidance ?? null,
    studentInstructions: data.studentInstructions ?? null,
    attachmentResourceIds: data.attachmentResourceIds?.length ? data.attachmentResourceIds : Prisma.JsonNull,
    imageResourceId: data.imageResourceId ?? null,
    videoResourceId: data.videoResourceId ?? null,
    diagramResourceId: data.diagramResourceId ?? null,
    audience: data.audience,
    difficulty: data.difficulty ?? null,
    active: data.active,
    published: data.published,
    approved: data.published,
    sortOrder: data.sortOrder ?? 0,
  };
}

function normalizeActivityWrite(data: ActivityWriteInput): ActivityWriteInput {
  const activityType = ACTIVITY_TYPES.includes(data.activityType) ? data.activityType : "CLASSROOM_ACTIVITY";
  return {
    ...data,
    id: cleanOptional(data.id),
    chapterId: cleanRequired(data.chapterId),
    moduleId: cleanOptional(data.moduleId),
    topicId: cleanOptional(data.topicId),
    title: cleanRequired(data.title).slice(0, 200),
    activityType,
    shortDescription: cleanOptional(data.shortDescription, 500),
    objective: cleanRequired(data.objective).slice(0, 2000),
    materials: cleanOptional(data.materials, 2000),
    durationMinutes: data.durationMinutes && data.durationMinutes > 0 ? Math.floor(data.durationMinutes) : null,
    groupType: cleanOptional(data.groupType, 80),
    preparation: cleanOptional(data.preparation, 2000),
    instructions: cleanRequired(data.instructions).slice(0, 6000),
    steps: cleanStringList(data.steps, 30, 800),
    observationPrompts: cleanStringList(data.observationPrompts, 20, 800),
    reflectionPrompts: cleanStringList(data.reflectionPrompts, 20, 800),
    expectedLearning: cleanOptional(data.expectedLearning, 2000),
    assessment: cleanOptional(data.assessment, 2000),
    safetyNotes: cleanOptional(data.safetyNotes, 2000),
    teacherGuidance: cleanOptional(data.teacherGuidance, 3000),
    studentInstructions: cleanOptional(data.studentInstructions, 3000),
    attachmentResourceIds: cleanStringList(data.attachmentResourceIds, 20, 120),
    imageResourceId: cleanOptional(data.imageResourceId, 120),
    videoResourceId: cleanOptional(data.videoResourceId, 120),
    diagramResourceId: cleanOptional(data.diagramResourceId, 120),
    audience: ACTIVITY_AUDIENCES.includes(data.audience) ? data.audience : "BOTH",
    difficulty: data.difficulty && ACTIVITY_DIFFICULTIES.includes(data.difficulty) ? data.difficulty : null,
    active: Boolean(data.active),
    published: Boolean(data.published),
    sortOrder: data.sortOrder && data.sortOrder > 0 ? Math.floor(data.sortOrder) : 0,
  };
}

function toActivityStudioRecord(row: {
  id: string;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  title: string;
  activityType: PublisherActivityType;
  shortDescription: string | null;
  objective: string;
  materials: string | null;
  durationMinutes: number | null;
  groupType: string | null;
  preparation: string | null;
  instructions: string;
  steps: Prisma.JsonValue | null;
  observationPrompts: Prisma.JsonValue | null;
  reflectionPrompts: Prisma.JsonValue | null;
  expectedLearning: string | null;
  assessment: string | null;
  safetyNotes: string | null;
  teacherGuidance: string | null;
  studentInstructions: string | null;
  attachmentResourceIds: Prisma.JsonValue | null;
  imageResourceId: string | null;
  videoResourceId: string | null;
  diagramResourceId: string | null;
  audience: string;
  difficulty: string | null;
  active: boolean;
  published: boolean;
  archivedAt: Date | null;
  sortOrder: number;
  updatedAt: Date;
}): ActivityStudioRecord {
  return {
    id: row.id,
    chapterId: row.chapterId,
    moduleId: row.moduleId,
    topicId: row.topicId,
    title: row.title,
    activityType: row.activityType,
    shortDescription: row.shortDescription,
    objective: row.objective,
    materials: row.materials,
    durationMinutes: row.durationMinutes,
    groupType: row.groupType,
    preparation: row.preparation,
    instructions: row.instructions,
    steps: normalizeStringArray(row.steps),
    observationPrompts: normalizeStringArray(row.observationPrompts),
    reflectionPrompts: normalizeStringArray(row.reflectionPrompts),
    expectedLearning: row.expectedLearning,
    assessment: row.assessment,
    safetyNotes: row.safetyNotes,
    teacherGuidance: row.teacherGuidance,
    studentInstructions: row.studentInstructions,
    attachmentResourceIds: normalizeStringArray(row.attachmentResourceIds),
    imageResourceId: row.imageResourceId,
    videoResourceId: row.videoResourceId,
    diagramResourceId: row.diagramResourceId,
    audience: ACTIVITY_AUDIENCES.includes(row.audience as ActivityAudience) ? row.audience as ActivityAudience : "BOTH",
    difficulty: row.difficulty && ACTIVITY_DIFFICULTIES.includes(row.difficulty as ActivityDifficulty)
      ? row.difficulty as ActivityDifficulty
      : null,
    active: row.active,
    published: row.published,
    archived: Boolean(row.archivedAt),
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function cleanStringList(value: string[] | undefined, maxItems: number, maxLength: number) {
  return Array.from(new Set((value ?? []).map((item) => item.trim().slice(0, maxLength)).filter(Boolean))).slice(0, maxItems);
}

function cleanRequired(value: string) {
  const next = value.replace(/\u0000/g, "").trim();
  if (!next) throw new Error("Activity title, chapter, objective, and instructions are required.");
  return next;
}

function cleanOptional(value: string | null | undefined, maxLength = 4000) {
  const next = (value ?? "").replace(/\u0000/g, "").trim().slice(0, maxLength);
  return next || null;
}
