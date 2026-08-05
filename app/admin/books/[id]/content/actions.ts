"use server";

import {
  BookPartKind,
  ContentReleaseTargetType,
  CurriculumDifficultyLevel,
  CurriculumExerciseType,
  Prisma,
  PublisherActivityType,
  PublisherWorksheetType,
  SecurityAuditOutcome,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  duplicateBookStructureNode,
  moveBookStructureNode,
  reorderBookStructureNodes,
  saveBookStructureNode,
  setBookStructureNodeArchived,
  type BookStructureNodeType,
} from "@/lib/book-structure-management";
import { normalizeContentDocument } from "@/lib/content-document";
import {
  ensurePublisherResource,
  normalizeKnowledgeTags,
  normalizeKnowledgeText,
  requireKnowledgeBookScope,
  searchKnowledgeDefinitions,
  slugifyKnowledge,
  validateKnowledgeDocument,
} from "@/lib/content-knowledge";
import type { KnowledgeReferenceType } from "@/lib/content-knowledge-types";
import {
  assertExerciseScope,
  assertQuestionPayload,
  assertQuestionRelations,
  normalizeQuestionOptions,
} from "@/lib/exercise-authoring";
import {
  EXERCISE_QUESTION_TYPES,
  type ExerciseQuestionType,
} from "@/lib/exercise-authoring-types";
import {
  getContentNodeScope,
  normalizeAllowedAssetKinds,
  normalizeContentSectionAudience,
  normalizeContentSectionIcon,
  normalizeSectionContexts,
  validateLinkedAssetDocument,
} from "@/lib/content-linked-assets";
import { validateMediaDocument } from "@/lib/content-media";
import {
  bulkPublishRelease,
  rollbackRelease,
  transitionRelease,
} from "@/lib/content-release";
import {
  CONTENT_SECTION_AUDIENCES,
  CONTENT_SECTION_ICONS,
} from "@/lib/content-linked-asset-types";
import {
  archiveActivityStudioRecord,
  duplicateActivityStudioRecord,
  moveActivityStudioRecord,
  saveActivityStudioRecord,
} from "@/lib/activity-studio";
import {
  ACTIVITY_AUDIENCES,
  ACTIVITY_DIFFICULTIES,
  ACTIVITY_TYPES,
  type ActivityAudience,
  type ActivityDifficulty,
} from "@/lib/activity-studio-types";
import {
  archiveWorksheetStudioRecord,
  createWorksheetExercise,
  duplicateWorksheetStudioRecord,
  moveWorksheetStudioRecord,
  saveWorksheetStudioRecord,
} from "@/lib/worksheet-studio";
import {
  WORKSHEET_AUDIENCES,
  WORKSHEET_DIFFICULTIES,
  WORKSHEET_TYPES,
  type WorksheetAudience,
  type WorksheetDifficulty,
} from "@/lib/worksheet-studio-types";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

const text = (form: FormData, key: string, max = 4000) =>
  String(form.get(key) ?? "").trim().slice(0, max);

const nullable = (form: FormData, key: string, max?: number) =>
  text(form, key, max) || null;

const integer = (form: FormData, key: string) => {
  const value = Number(form.get(key));
  return Number.isInteger(value) && value >= 0 ? value : null;
};

const signedInteger = (form: FormData, key: string) => {
  const value = Number(form.get(key));
  return Number.isInteger(value) ? value : null;
};

function refresh(bookId: string) {
  revalidatePath(`/admin/books/${bookId}/content`);
}

function slugCode(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stringList(form: FormData, key: string) {
  return form
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function newlineList(form: FormData, key: string) {
  return text(form, key, 12000)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function oneOf<const Values extends readonly string[]>(
  value: string,
  allowed: Values,
  fallback: Values[number],
): Values[number] {
  return allowed.includes(value) ? value as Values[number] : fallback;
}

async function requireOwnedBook(bookId: string, publisherId: string) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId },
    select: { id: true },
  });
  if (!book) throw new Error("Book not found.");
  return book;
}

async function recordActivityStudioAudit(
  actor: Awaited<ReturnType<typeof requireLivePublisherAdmin>>,
  bookId: string,
  action: "publisher.book.update" | "publisher.book.delete",
  changedFields: string[],
) {
  await prisma.$transaction(async (tx) => {
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action,
      targetType: "Book",
      targetId: bookId,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields },
    });
  });
}

async function recordContentReleaseAudit(
  actor: Awaited<ReturnType<typeof requireLivePublisherAdmin>>,
  bookId: string,
  targetType: string,
  targetId: string,
  releaseAction: string,
) {
  await prisma.$transaction(async (tx) => {
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: "publisher.book.update",
      targetType: "Book",
      targetId: bookId,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        changedFields: ["contentRelease"],
        releaseAction,
        releaseTargetType: targetType,
        releaseTargetId: targetId,
      },
    });
  });
}

async function normalizeFormContent(
  scope: Awaited<ReturnType<typeof getContentNodeScope>>,
  form: FormData,
  preserved: Prisma.JsonValue | null,
): Promise<Prisma.InputJsonValue | null> {
  const raw = form.get("content");
  if (raw === null) return preserved;
  const document = normalizeContentDocument(String(raw));
  const linkedAssetDocument = await validateLinkedAssetDocument(scope, document);
  const mediaDocument = await validateMediaDocument(scope, linkedAssetDocument);
  return (await validateKnowledgeDocument(scope, mediaDocument)) as unknown as Prisma.InputJsonValue;
}

export async function saveContentNodeAction(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
  form: FormData,
) {
  const actor = await requireLivePublisherAdmin();
  let preserved: {
    parentId?: string | null;
    secondaryParentId?: string | null;
    shortTitle: string | null;
    code: string | null;
    content: Prisma.JsonValue | null;
    imageUrl: string | null;
    pageStart?: number | null;
    pageEnd?: number | null;
    partKind?: BookPartKind;
  };

  if (type === "PART") {
    const row = await prisma.bookPart.findFirst({
      where: { id, bookId },
      select: { shortTitle: true, code: true, content: true, imageUrl: true, kind: true },
    });
    if (!row) throw new Error("Part not found.");
    preserved = { ...row, partKind: row.kind };
  } else if (type === "UNIT") {
    const row = await prisma.bookUnit.findFirst({
      where: { id, bookId },
      select: { partId: true, shortTitle: true, code: true, content: true, imageUrl: true },
    });
    if (!row) throw new Error("Unit not found.");
    preserved = { ...row, parentId: row.partId };
  } else if (type === "CHAPTER") {
    const row = await prisma.bookChapter.findFirst({
      where: { id, bookId },
      select: {
        unitId: true,
        partId: true,
        shortTitle: true,
        content: true,
        thumbnail: true,
        startPage: true,
        endPage: true,
      },
    });
    if (!row) throw new Error("Chapter not found.");
    preserved = {
      parentId: row.unitId,
      secondaryParentId: row.partId,
      shortTitle: row.shortTitle,
      code: null,
      content: row.content,
      imageUrl: row.thumbnail,
      pageStart: row.startPage,
      pageEnd: row.endPage,
    };
  } else if (type === "MODULE") {
    const row = await prisma.bookModule.findFirst({
      where: { id, bookId },
      select: { chapterId: true, shortTitle: true, code: true, content: true, imageUrl: true },
    });
    if (!row) throw new Error("Module not found.");
    preserved = { ...row, parentId: row.chapterId };
  } else {
    const row = await prisma.bookTopic.findFirst({
      where: { id, bookId },
      select: {
        chapterId: true,
        moduleId: true,
        shortTitle: true,
        code: true,
        content: true,
        imageUrl: true,
      },
    });
    if (!row) throw new Error("Topic not found.");
    preserved = { ...row, parentId: row.chapterId, secondaryParentId: row.moduleId };
  }

  const scope = await getContentNodeScope(actor.publisherId, bookId, type, id);

  await saveBookStructureNode(bookId, {
    type,
    id,
    parentId: preserved.parentId,
    secondaryParentId: preserved.secondaryParentId,
    title: text(form, "title", 200),
    subtitle: nullable(form, "subtitle", 240),
    shortTitle: preserved.shortTitle,
    code: preserved.code,
    slug: nullable(form, "slug", 180),
    label: nullable(form, "label", 80),
    description: nullable(form, "description", 2000),
    content: await normalizeFormContent(scope, form, preserved.content),
    estimatedMinutes: integer(form, "estimatedMinutes"),
    pageStart: preserved.pageStart,
    pageEnd: preserved.pageEnd,
    imageUrl: preserved.imageUrl,
    published: form.get("published") === "on",
    partKind: preserved.partKind,
  });
  refresh(bookId);
  return {
    savedAt: new Date().toISOString(),
    nodeId: id,
  };
}

export async function changeContentReleaseAction(
  bookId: string,
  targetType: ContentReleaseTargetType,
  targetId: string,
  action: "SUBMIT_REVIEW" | "RETURN_DRAFT" | "APPROVE" | "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "RESTORE",
  form: FormData,
) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  if (!Object.values(ContentReleaseTargetType).includes(targetType)) {
    throw new Error("Unsupported release target.");
  }
  await transitionRelease({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    targetType,
    targetId,
    action,
    releaseNotes: nullable(form, "releaseNotes", 2000),
    confirm: form.get("confirm") === "on",
  });
  await recordContentReleaseAudit(
    actor,
    bookId,
    targetType,
    targetId,
    `publisher.content.release.${action.toLowerCase()}`,
  );
  refresh(bookId);
}

export async function rollbackContentReleaseAction(
  bookId: string,
  targetType: ContentReleaseTargetType,
  targetId: string,
  versionId: string,
  form: FormData,
) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await rollbackRelease({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    targetType,
    targetId,
    versionId,
    releaseNotes: nullable(form, "releaseNotes", 2000),
    confirm: form.get("confirm") === "on",
  });
  await recordContentReleaseAudit(
    actor,
    bookId,
    targetType,
    targetId,
    "publisher.content.release.rollback",
  );
  refresh(bookId);
}

export async function bulkPublishContentReleaseAction(
  bookId: string,
  targetType: "BOOK" | "CHAPTER",
  targetId: string,
  form: FormData,
) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await bulkPublishRelease({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    targetType,
    targetId,
    releaseNotes: nullable(form, "releaseNotes", 2000),
    confirm: form.get("confirm") === "on",
  });
  await recordContentReleaseAudit(
    actor,
    bookId,
    targetType,
    targetId,
    "publisher.content.release.bulk_publish",
  );
  refresh(bookId);
}

export async function saveActivityStudioAction(bookId: string, chapterId: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  const activityType = oneOf(text(form, "activityType", 40), ACTIVITY_TYPES, "CLASSROOM_ACTIVITY");
  const audience = oneOf(text(form, "audience", 20), ACTIVITY_AUDIENCES, "BOTH");
  const rawDifficulty = text(form, "difficulty", 40);
  const difficulty = rawDifficulty
    ? oneOf(rawDifficulty, ACTIVITY_DIFFICULTIES, "MODERATE")
    : null;
  const activityId = await saveActivityStudioRecord({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    data: {
      id: nullable(form, "id", 100),
      chapterId,
      moduleId: nullable(form, "moduleId", 100),
      topicId: nullable(form, "topicId", 100),
      title: text(form, "title", 200),
      activityType: activityType as PublisherActivityType,
      shortDescription: nullable(form, "shortDescription", 500),
      objective: text(form, "objective", 2000),
      materials: nullable(form, "materials", 2000),
      durationMinutes: integer(form, "durationMinutes"),
      groupType: nullable(form, "groupType", 80),
      preparation: nullable(form, "preparation", 2000),
      instructions: text(form, "instructions", 6000),
      steps: newlineList(form, "steps"),
      observationPrompts: newlineList(form, "observationPrompts"),
      reflectionPrompts: newlineList(form, "reflectionPrompts"),
      expectedLearning: nullable(form, "expectedLearning", 2000),
      assessment: nullable(form, "assessment", 2000),
      safetyNotes: nullable(form, "safetyNotes", 2000),
      teacherGuidance: nullable(form, "teacherGuidance", 3000),
      studentInstructions: nullable(form, "studentInstructions", 3000),
      attachmentResourceIds: stringList(form, "attachmentResourceIds"),
      imageResourceId: nullable(form, "imageResourceId", 100),
      videoResourceId: nullable(form, "videoResourceId", 100),
      diagramResourceId: nullable(form, "diagramResourceId", 100),
      audience: audience as ActivityAudience,
      difficulty: difficulty as ActivityDifficulty | null,
      active: form.get("active") === "on",
      published: form.get("published") === "on",
      sortOrder: integer(form, "sortOrder"),
    },
  });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.update", ["book_content", "activity"]);
  refresh(bookId);
  revalidatePath(`/admin/books/${bookId}/activities`);
  return activityId;
}

export async function archiveActivityStudioAction(bookId: string, activityId: string) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await archiveActivityStudioRecord({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    activityId,
  });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.delete", ["book_content", "activity", "archive"]);
  refresh(bookId);
  revalidatePath(`/admin/books/${bookId}/activities`);
}

export async function duplicateActivityStudioAction(bookId: string, activityId: string) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await duplicateActivityStudioRecord({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    activityId,
  });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.update", ["book_content", "activity", "duplicate"]);
  refresh(bookId);
  revalidatePath(`/admin/books/${bookId}/activities`);
}

export async function moveActivityStudioAction(
  bookId: string,
  chapterId: string,
  moduleId: string | null,
  topicId: string | null,
  activityId: string,
  direction: -1 | 1,
) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await moveActivityStudioRecord({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    chapterId,
    moduleId,
    topicId,
    activityId,
    direction,
  });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.update", ["book_content", "activity", "reorder"]);
  refresh(bookId);
  revalidatePath(`/admin/books/${bookId}/activities`);
}

export async function saveWorksheetStudioAction(bookId: string, chapterId: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  const worksheetType = oneOf(text(form, "type", 40), WORKSHEET_TYPES, "CLASSROOM");
  const audience = oneOf(text(form, "audience", 20), WORKSHEET_AUDIENCES, "BOTH");
  const rawDifficulty = text(form, "difficulty", 40);
  const difficulty = rawDifficulty ? oneOf(rawDifficulty, WORKSHEET_DIFFICULTIES, "MODERATE") : null;
  const worksheetId = await saveWorksheetStudioRecord({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    data: {
      id: nullable(form, "id", 100),
      chapterId,
      moduleId: nullable(form, "moduleId", 100),
      topicId: nullable(form, "topicId", 100),
      exerciseId: nullable(form, "exerciseId", 100),
      printableResourceId: nullable(form, "printableResourceId", 100),
      answerKeyResourceId: nullable(form, "answerKeyResourceId", 100),
      supportingResourceIds: stringList(form, "supportingResourceIds"),
      title: text(form, "title", 200),
      slug: nullable(form, "slug", 120),
      type: worksheetType as PublisherWorksheetType,
      instructions: nullable(form, "instructions", 6000),
      estimatedMinutes: integer(form, "estimatedMinutes"),
      difficulty: difficulty as WorksheetDifficulty | null,
      audience: audience as WorksheetAudience,
      totalMarks: integer(form, "totalMarks"),
      allowOnlineAttempt: form.get("allowOnlineAttempt") === "on",
      allowPrint: form.get("allowPrint") === "on",
      showAnswersAfterSubmit: form.get("showAnswersAfterSubmit") === "on",
      active: form.get("active") === "on",
      published: form.get("published") === "on",
      sortOrder: integer(form, "sortOrder"),
    },
  });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.update", ["book_content", "worksheet"]);
  refresh(bookId);
  return worksheetId;
}

export async function archiveWorksheetStudioAction(bookId: string, worksheetId: string) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await archiveWorksheetStudioRecord({ actor: { userId: actor.userId, publisherId: actor.publisherId }, bookId, worksheetId });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.delete", ["book_content", "worksheet", "archive"]);
  refresh(bookId);
}

export async function duplicateWorksheetStudioAction(bookId: string, worksheetId: string) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await duplicateWorksheetStudioRecord({ actor: { userId: actor.userId, publisherId: actor.publisherId }, bookId, worksheetId });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.update", ["book_content", "worksheet", "duplicate"]);
  refresh(bookId);
}

export async function moveWorksheetStudioAction(
  bookId: string,
  chapterId: string,
  moduleId: string | null,
  topicId: string | null,
  worksheetId: string,
  direction: -1 | 1,
) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  await moveWorksheetStudioRecord({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    chapterId,
    moduleId,
    topicId,
    worksheetId,
    direction,
  });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.update", ["book_content", "worksheet", "reorder"]);
  refresh(bookId);
}

export async function createWorksheetExerciseAction(bookId: string, chapterId: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);
  const exerciseId = await createWorksheetExercise({
    actor: { userId: actor.userId, publisherId: actor.publisherId },
    bookId,
    chapterId,
    title: text(form, "title", 200) || "Worksheet Exercise",
    moduleId: nullable(form, "moduleId", 100),
    topicId: nullable(form, "topicId", 100),
  });
  await recordActivityStudioAudit(actor, bookId, "publisher.book.update", ["book_content", "worksheet", "exercise"]);
  refresh(bookId);
  return exerciseId;
}

export async function saveContentSectionDefinitionAction(bookId: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);

  const id = nullable(form, "id", 100);
  const label = text(form, "label", 160);
  if (!label) throw new Error("Section label is required.");

  const rawCode = text(form, "code", 80) || label;
  const code = slugCode(rawCode);
  if (!code) throw new Error("Section code is required.");

  const audience = normalizeContentSectionAudience(
    oneOf(text(form, "audience", 20), CONTENT_SECTION_AUDIENCES, "BOTH"),
  );
  const icon = normalizeContentSectionIcon(
    oneOf(text(form, "icon", 40), CONTENT_SECTION_ICONS, "layers"),
  );
  const allowedAssetKinds = normalizeAllowedAssetKinds(stringList(form, "allowedAssetKinds"));
  const visibleIn = normalizeSectionContexts(stringList(form, "visibleIn"));
  const requestedSortOrder = integer(form, "sortOrder");

  if (id) {
    const existing = await prisma.contentSectionDefinition.findFirst({
      where: {
        id,
        publisherId: actor.publisherId,
        OR: [{ bookId }, { bookId: null }],
      },
      select: { id: true, bookId: true, archivedAt: true },
    });
    if (!existing || existing.archivedAt) throw new Error("Section definition not found.");

    await prisma.contentSectionDefinition.update({
      where: { id },
      data: {
        code,
        label,
        icon,
        audience,
        allowedAssetKinds,
        visibleIn,
        sortOrder: requestedSortOrder ?? 0,
        active: form.get("active") === "on",
        published: form.get("published") === "on",
      },
    });
    refresh(bookId);
    return;
  }

  const last = await prisma.contentSectionDefinition.findFirst({
    where: {
      publisherId: actor.publisherId,
      bookId,
      archivedAt: null,
    },
    select: { sortOrder: true },
    orderBy: [{ sortOrder: "desc" }, { id: "desc" }],
  });

  await prisma.contentSectionDefinition.create({
    data: {
      publisherId: actor.publisherId,
      bookId,
      code,
      label,
      icon,
      audience,
      allowedAssetKinds,
      visibleIn,
      sortOrder: requestedSortOrder ?? (last?.sortOrder ?? -10) + 10,
      active: form.get("active") === "on",
      published: form.get("published") === "on",
    },
  });
  refresh(bookId);
}

export async function moveContentSectionDefinitionAction(
  bookId: string,
  id: string,
  direction: -1 | 1,
) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);

  const current = await prisma.contentSectionDefinition.findFirst({
    where: {
      id,
      publisherId: actor.publisherId,
      OR: [{ bookId }, { bookId: null }],
      archivedAt: null,
    },
    select: { id: true, bookId: true },
  });
  if (!current) throw new Error("Section definition not found.");

  const rows = await prisma.contentSectionDefinition.findMany({
    where: {
      publisherId: actor.publisherId,
      bookId: current.bookId,
      archivedAt: null,
    },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }, { id: "asc" }],
  });
  const index = rows.findIndex((row) => row.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= rows.length) return;
  [rows[index], rows[next]] = [rows[next], rows[index]];

  await prisma.$transaction(
    rows.map((row, rowIndex) =>
      prisma.contentSectionDefinition.update({
        where: { id: row.id },
        data: { sortOrder: rowIndex * 10 },
      }),
    ),
  );
  refresh(bookId);
}

export async function archiveContentSectionDefinitionAction(bookId: string, id: string) {
  const actor = await requireLivePublisherAdmin();
  await requireOwnedBook(bookId, actor.publisherId);

  const existing = await prisma.contentSectionDefinition.findFirst({
    where: {
      id,
      publisherId: actor.publisherId,
      OR: [{ bookId }, { bookId: null }],
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!existing) throw new Error("Section definition not found.");

  await prisma.contentSectionDefinition.update({
    where: { id },
    data: {
      active: false,
      published: false,
      archivedAt: new Date(),
    },
  });
  refresh(bookId);
}

export async function searchKnowledgeDefinitionsAction(bookId: string, query: string) {
  const actor = await requireLivePublisherAdmin();
  const scope = await requireKnowledgeBookScope(actor.publisherId, bookId);
  return searchKnowledgeDefinitions(scope, query);
}

export async function saveVocabularyDefinitionAction(bookId: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  const scope = await requireKnowledgeBookScope(actor.publisherId, bookId);
  const id = nullable(form, "id", 100);
  const term = normalizeKnowledgeText(form.get("term"), 200);
  const meaning = normalizeKnowledgeText(form.get("meaning"), 12000);
  if (!term || !meaning) throw new Error("Vocabulary term and meaning are required.");
  const slug = slugifyKnowledge(text(form, "slug", 120) || term);
  if (!slug) throw new Error("Vocabulary slug is required.");

  const imageResourceId = await ensurePublisherResource(
    scope.publisherId,
    scope.bookId,
    nullable(form, "imageResourceId", 100),
  );
  const audioResourceId = await ensurePublisherResource(
    scope.publisherId,
    scope.bookId,
    nullable(form, "audioResourceId", 100),
  );

  const duplicate = await prisma.publisherVocabulary.findFirst({
    where: {
      publisherId: scope.publisherId,
      bookId: scope.bookId,
      slug,
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("A vocabulary definition with this slug already exists.");

  const data = {
    term,
    slug,
    meaning,
    simpleMeaning: nullable(form, "simpleMeaning", 12000),
    pronunciation: nullable(form, "pronunciation", 240),
    language: text(form, "language", 24) || "en",
    example: nullable(form, "example", 12000),
    imageResourceId,
    audioResourceId,
    difficulty: nullable(form, "difficulty", 80),
    tags: normalizeKnowledgeTags(text(form, "tags", 2000)),
    active: form.get("active") === "on",
    published: form.get("published") === "on",
  };

  if (id) {
    const existing = await prisma.publisherVocabulary.findFirst({
      where: {
        id,
        publisherId: scope.publisherId,
        OR: [{ bookId: scope.bookId }, { bookId: null }],
      },
      select: { id: true },
    });
    if (!existing) throw new Error("Vocabulary definition not found.");
  }

  const row = id
    ? await prisma.publisherVocabulary.update({
        where: { id },
        data,
        select: { id: true },
      })
    : await prisma.publisherVocabulary.create({
        data: {
          publisherId: scope.publisherId,
          bookId: scope.bookId,
          ...data,
        },
        select: { id: true },
      });
  refresh(bookId);
  return (await searchKnowledgeDefinitions(scope, term)).find((item) => item.id === row.id && item.type === "VOCABULARY");
}

export async function saveConceptDefinitionAction(bookId: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  const scope = await requireKnowledgeBookScope(actor.publisherId, bookId);
  const id = nullable(form, "id", 100);
  const title = normalizeKnowledgeText(form.get("title"), 240);
  const definition = normalizeKnowledgeText(form.get("definition"), 12000);
  if (!title || !definition) throw new Error("Concept title and definition are required.");
  const slug = slugifyKnowledge(text(form, "slug", 120) || title);
  if (!slug) throw new Error("Concept slug is required.");

  const imageResourceId = await ensurePublisherResource(
    scope.publisherId,
    scope.bookId,
    nullable(form, "imageResourceId", 100),
  );
  const videoResourceId = await ensurePublisherResource(
    scope.publisherId,
    scope.bookId,
    nullable(form, "videoResourceId", 100),
  );
  const diagramResourceId = await ensurePublisherResource(
    scope.publisherId,
    scope.bookId,
    nullable(form, "diagramResourceId", 100),
  );

  const duplicate = await prisma.publisherConcept.findFirst({
    where: {
      publisherId: scope.publisherId,
      bookId: scope.bookId,
      slug,
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("A concept definition with this slug already exists.");

  const data = {
    title,
    slug,
    definition,
    summary: nullable(form, "summary", 12000),
    relatedTopics: normalizeKnowledgeTags(text(form, "relatedTopics", 2000)),
    imageResourceId,
    videoResourceId,
    diagramResourceId,
    difficulty: nullable(form, "difficulty", 80),
    active: form.get("active") === "on",
    published: form.get("published") === "on",
  };

  if (id) {
    const existing = await prisma.publisherConcept.findFirst({
      where: {
        id,
        publisherId: scope.publisherId,
        OR: [{ bookId: scope.bookId }, { bookId: null }],
      },
      select: { id: true },
    });
    if (!existing) throw new Error("Concept definition not found.");
  }

  const row = id
    ? await prisma.publisherConcept.update({
        where: { id },
        data,
        select: { id: true },
      })
    : await prisma.publisherConcept.create({
        data: {
          publisherId: scope.publisherId,
          bookId: scope.bookId,
          ...data,
        },
        select: { id: true },
      });
  refresh(bookId);
  return (await searchKnowledgeDefinitions(scope, title)).find((item) => item.id === row.id && item.type === "CONCEPT");
}

export async function saveKnowledgeDefinitionAction(
  bookId: string,
  type: KnowledgeReferenceType,
  form: FormData,
) {
  return type === "VOCABULARY"
    ? saveVocabularyDefinitionAction(bookId, form)
    : saveConceptDefinitionAction(bookId, form);
}

export async function createContentChildAction(
  bookId: string,
  parentType: string,
  parentId: string,
  form: FormData,
) {
  const type = text(form, "type") as BookStructureNodeType;
  const allowed: Record<string, BookStructureNodeType[]> = {
    BOOK: ["PART", "UNIT", "CHAPTER"],
    PART: ["UNIT", "CHAPTER"],
    UNIT: ["CHAPTER"],
    CHAPTER: ["MODULE", "TOPIC"],
    MODULE: ["TOPIC"],
  };
  if (!allowed[parentType]?.includes(type)) {
    throw new Error("This child type is not valid for the selected parent.");
  }

  let parent: string | null = null;
  let secondary: string | null = null;

  if (type === "UNIT" && parentType === "PART") parent = parentId;
  else if (type === "CHAPTER") {
    if (parentType === "UNIT") parent = parentId;
    else if (parentType === "PART") secondary = parentId;
  } else if (type === "MODULE") parent = parentId;
  else if (type === "TOPIC") {
    if (parentType === "MODULE") {
      const moduleNode = await prisma.bookModule.findFirst({
        where: { id: parentId, bookId },
        select: { chapterId: true },
      });
      if (!moduleNode) throw new Error("Parent Module not found.");
      parent = moduleNode.chapterId;
      secondary = parentId;
    } else {
      parent = parentId;
    }
  }

  await saveBookStructureNode(bookId, {
    type,
    parentId: parent,
    secondaryParentId: secondary,
    title: text(form, "title", 200),
    label: nullable(form, "label", 80),
    description: nullable(form, "description", 2000),
    published: false,
  });
  refresh(bookId);
}

export async function archiveContentNodeAction(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
  archived: boolean,
) {
  await setBookStructureNodeArchived(bookId, type, id, archived);
  refresh(bookId);
}

export async function reorderContentNodeAction(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
  direction: -1 | 1,
) {
  const rows =
    type === "PART"
      ? await prisma.bookPart.findMany({
          where: { bookId },
          select: { id: true },
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        })
      : type === "UNIT"
        ? await prisma.bookUnit.findMany({
            where: { bookId },
            select: { id: true },
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          })
        : type === "CHAPTER"
          ? await prisma.bookChapter.findMany({
              where: { bookId },
              select: { id: true },
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            })
          : type === "MODULE"
            ? await prisma.bookModule.findMany({
                where: { bookId },
                select: { id: true },
                orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              })
            : await prisma.bookTopic.findMany({
                where: { bookId },
                select: { id: true },
                orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              });

  const index = rows.findIndex((row) => row.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= rows.length) return;
  [rows[index], rows[next]] = [rows[next], rows[index]];
  await reorderBookStructureNodes(
    bookId,
    type,
    rows.map((row) => row.id),
  );
  refresh(bookId);
}

export async function reorderContentBranchAction(
  bookId: string,
  type: BookStructureNodeType,
  orderedIds: string[],
) {
  await reorderBookStructureNodes(bookId, type, orderedIds);
  refresh(bookId);
}

export async function moveContentNodeAction(
  bookId: string,
  type: Exclude<BookStructureNodeType, "PART">,
  id: string,
  form: FormData,
) {
  await moveBookStructureNode(
    bookId,
    type,
    id,
    nullable(form, "parentId"),
    nullable(form, "secondaryParentId"),
  );
  refresh(bookId);
}

export async function duplicateContentNodeAction(
  bookId: string,
  type: BookStructureNodeType,
  id: string,
) {
  await duplicateBookStructureNode(bookId, type, id);
  refresh(bookId);
}

export async function saveChapterKnowledgeAction(
  bookId: string,
  chapterId: string,
  form: FormData,
) {
  const actor = await requireLivePublisherAdmin();
  await prisma.$transaction(
    async (tx) => {
      const chapter = await tx.bookChapter.findFirst({
        where: {
          id: chapterId,
          bookId,
          book: { publisherId: actor.publisherId },
        },
        select: { id: true },
      });
      if (!chapter) throw new Error("Chapter not found.");

      await tx.bookChapter.update({
        where: { id: chapterId },
        data: {
          summary: nullable(form, "summary", 12000),
          extractedText: nullable(form, "extractedText", 100000),
          reviewedText: nullable(form, "reviewedText", 100000),
          keywords: text(form, "keywords", 4000)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          approved: form.get("approved") === "on",
        },
      });

      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor),
        action: "publisher.curriculum.chapter.update",
        targetType: "BookChapter",
        targetId: chapterId,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { changedFields: ["knowledgeContent", "reviewState"] },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  refresh(bookId);
}

async function ownedChapter(bookId: string, chapterId: string) {
  const actor = await requireLivePublisherAdmin();
  const chapter = await prisma.bookChapter.findFirst({
    where: {
      id: chapterId,
      bookId,
      book: { publisherId: actor.publisherId },
    },
    select: { id: true },
  });
  if (!chapter) throw new Error("Chapter not found.");
  return actor;
}

export async function saveExerciseAction(
  bookId: string,
  chapterId: string,
  form: FormData,
) {
  const actor = await ownedChapter(bookId, chapterId);
  const id = nullable(form, "id");
  const title = text(form, "title", 200);
  const type = text(form, "type") as CurriculumExerciseType;
  const difficulty = nullable(form, "difficulty") as CurriculumDifficultyLevel | null;
  if (!title || !Object.values(CurriculumExerciseType).includes(type)) {
    throw new Error("Exercise title and type are required.");
  }

  const instructionsText = text(form, "instructions", 12000);
  await prisma.$transaction(async (tx) => {
    const data = {
      title,
      type,
      difficulty,
      marks: integer(form, "marks"),
      estimatedMinutes: integer(form, "estimatedMinutes"),
      displayOrder: integer(form, "displayOrder") ?? 0,
      published: form.get("published") === "on",
      archived: form.get("archived") === "on",
      instructions: instructionsText
        ? ({ text: instructionsText } as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };

    let exercise;
    if (id) {
      const current = await tx.bookExercise.findFirst({
        where: { id, bookId, chapterId },
        select: { id: true },
      });
      if (!current) throw new Error("Exercise not found.");
      exercise = await tx.bookExercise.update({ where: { id }, data });
    } else {
      exercise = await tx.bookExercise.create({ data: { ...data, bookId, chapterId } });
    }

    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: id ? "publisher.curriculum.exercise.update" : "publisher.curriculum.exercise.create",
      targetType: "BookExercise",
      targetId: exercise.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["exerciseContent"] },
    });
  });
  refresh(bookId);
}

export async function archiveExerciseAction(
  bookId: string,
  chapterId: string,
  id: string,
  archived: boolean,
) {
  const actor = await ownedChapter(bookId, chapterId);
  await prisma.$transaction(async (tx) => {
    const result = await tx.bookExercise.updateMany({
      where: { id, bookId, chapterId },
      data: { archived, published: archived ? false : undefined },
    });
    if (!result.count) throw new Error("Exercise not found.");

    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: archived ? "publisher.curriculum.exercise.archive" : "publisher.curriculum.exercise.restore",
      targetType: "BookExercise",
      targetId: id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["archived", "publicationState"] },
    });
  });
  refresh(bookId);
}

export async function saveExerciseStudioExerciseAction(
  bookId: string,
  chapterId: string,
  form: FormData,
) {
  const actor = await ownedChapter(bookId, chapterId);
  const id = nullable(form, "id", 100);
  await assertExerciseScope({ publisherId: actor.publisherId, bookId, chapterId, exerciseId: id });
  const title = text(form, "title", 200);
  const type = text(form, "type") as CurriculumExerciseType;
  const difficulty = nullable(form, "difficulty", 80) as CurriculumDifficultyLevel | null;
  if (!title || !Object.values(CurriculumExerciseType).includes(type)) {
    throw new Error("Exercise title and type are required.");
  }
  const moduleId = nullable(form, "moduleId", 100);
  const topicId = nullable(form, "topicId", 100);
  if (moduleId) {
    const moduleNode = await prisma.bookModule.findFirst({
      where: { id: moduleId, bookId, chapterId },
      select: { id: true },
    });
    if (!moduleNode) throw new Error("Module not found for this exercise.");
  }
  if (topicId) {
    const topic = await prisma.bookTopic.findFirst({
      where: { id: topicId, bookId, chapterId },
      select: { id: true },
    });
    if (!topic) throw new Error("Topic not found for this exercise.");
  }

  const instructionsText = text(form, "instructions", 12000);
  const exerciseId = await prisma.$transaction(async (tx) => {
    const data = {
      title,
      type,
      difficulty,
      moduleId,
      topicId,
      marks: integer(form, "marks"),
      estimatedMinutes: integer(form, "estimatedMinutes"),
      displayOrder: integer(form, "displayOrder") ?? 0,
      published: form.get("published") === "on",
      archived: form.get("archived") === "on",
      instructions: instructionsText
        ? ({ text: instructionsText } as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
    const exercise = id
      ? await tx.bookExercise.update({ where: { id }, data })
      : await tx.bookExercise.create({ data: { ...data, bookId, chapterId } });
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor),
      action: id ? "publisher.curriculum.exercise.update" : "publisher.curriculum.exercise.create",
      targetType: "BookExercise",
      targetId: exercise.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { changedFields: ["exerciseStudio"] },
    });
    return exercise.id;
  });
  refresh(bookId);
  return exerciseId;
}

export async function saveExerciseQuestionGroupAction(
  bookId: string,
  chapterId: string,
  exerciseId: string,
  form: FormData,
) {
  const actor = await ownedChapter(bookId, chapterId);
  await assertExerciseScope({ publisherId: actor.publisherId, bookId, chapterId, exerciseId });
  const id = nullable(form, "id", 100);
  const title = text(form, "title", 200);
  if (!title) throw new Error("Question group title is required.");
  const data = {
    title,
    instructions: nullable(form, "instructions", 4000),
    sortOrder: integer(form, "sortOrder") ?? 0,
    active: form.get("active") !== "off",
  };
  if (id) {
    const group = await prisma.bookExerciseQuestionGroup.findFirst({
      where: { id, exerciseId },
      select: { id: true },
    });
    if (!group) throw new Error("Question group not found.");
    await prisma.bookExerciseQuestionGroup.update({ where: { id }, data });
  } else {
    await prisma.bookExerciseQuestionGroup.create({ data: { ...data, exerciseId } });
  }
  refresh(bookId);
}

export async function moveExerciseQuestionAction(
  bookId: string,
  chapterId: string,
  exerciseId: string,
  questionId: string,
  direction: -1 | 1,
) {
  const actor = await ownedChapter(bookId, chapterId);
  await assertExerciseScope({ publisherId: actor.publisherId, bookId, chapterId, exerciseId });
  const rows = await prisma.bookQuestion.findMany({
    where: { bookId, chapterId, exerciseId, archived: false },
    select: { id: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  const index = rows.findIndex((row) => row.id === questionId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= rows.length) return;
  [rows[index], rows[next]] = [rows[next], rows[index]];
  await prisma.$transaction(
    rows.map((row, rowIndex) =>
      prisma.bookQuestion.update({
        where: { id: row.id },
        data: { displayOrder: rowIndex * 10 },
      }),
    ),
  );
  refresh(bookId);
}

export async function archiveExerciseQuestionAction(
  bookId: string,
  chapterId: string,
  exerciseId: string,
  questionId: string,
  archived: boolean,
) {
  const actor = await ownedChapter(bookId, chapterId);
  await assertExerciseScope({ publisherId: actor.publisherId, bookId, chapterId, exerciseId });
  const result = await prisma.bookQuestion.updateMany({
    where: { id: questionId, bookId, chapterId, exerciseId },
    data: { archived, approved: archived ? false : undefined },
  });
  if (!result.count) throw new Error("Question not found.");
  refresh(bookId);
}

export async function duplicateExerciseQuestionAction(
  bookId: string,
  chapterId: string,
  exerciseId: string,
  questionId: string,
) {
  const actor = await ownedChapter(bookId, chapterId);
  await assertExerciseScope({ publisherId: actor.publisherId, bookId, chapterId, exerciseId });
  const question = await prisma.bookQuestion.findFirst({
    where: { id: questionId, bookId, chapterId, exerciseId },
  });
  if (!question) throw new Error("Question not found.");
  const last = await prisma.bookQuestion.findFirst({
    where: { bookId, chapterId, exerciseId, archived: false },
    select: { displayOrder: true },
    orderBy: [{ displayOrder: "desc" }, { id: "desc" }],
  });
  await prisma.bookQuestion.create({
    data: {
      bookId,
      chapterId,
      exerciseId,
      exerciseGroupId: question.exerciseGroupId,
      moduleId: question.moduleId,
      topicId: question.topicId,
      learningOutcomeId: question.learningOutcomeId,
      imageResourceId: question.imageResourceId,
      questionType: question.questionType,
      questionText: `${question.questionText} (Copy)`,
      options: question.options === null ? Prisma.JsonNull : question.options as Prisma.InputJsonValue,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: question.marks,
      difficulty: question.difficulty,
      bloomLevel: question.bloomLevel,
      competency: question.competency,
      tags: question.tags,
      displayOrder: (last?.displayOrder ?? 0) + 10,
      approved: false,
    },
  });
  refresh(bookId);
}

export async function saveExerciseQuestionAction(
  bookId: string,
  chapterId: string,
  exerciseId: string,
  form: FormData,
) {
  const actor = await ownedChapter(bookId, chapterId);
  await assertExerciseScope({ publisherId: actor.publisherId, bookId, chapterId, exerciseId });
  const id = nullable(form, "id", 100);
  const questionType = text(form, "questionType", 80) as ExerciseQuestionType;
  const questionText = text(form, "questionText", 20000);
  const optionsText = text(form, "options", 20000);
  const correctAnswer = text(form, "correctAnswer", 12000);
  if (!questionText) throw new Error("Question text is required.");
  assertQuestionPayload(questionType, optionsText, correctAnswer);
  const exerciseGroupId = nullable(form, "exerciseGroupId", 100);
  const moduleId = nullable(form, "moduleId", 100);
  const topicId = nullable(form, "topicId", 100);
  const learningOutcomeId = nullable(form, "learningOutcomeId", 100);
  const imageResourceId = nullable(form, "imageResourceId", 100);
  await assertQuestionRelations({
    publisherId: actor.publisherId,
    bookId,
    chapterId,
    exerciseId,
    groupId: exerciseGroupId,
    moduleId,
    topicId,
    learningOutcomeId,
    imageResourceId,
  });
  if (!EXERCISE_QUESTION_TYPES.includes(questionType)) {
    throw new Error("Question type is not supported by Exercise Studio.");
  }
  const data = {
    exerciseId,
    exerciseGroupId,
    moduleId,
    topicId,
    learningOutcomeId,
    imageResourceId,
    questionType,
    questionText,
    options: normalizeQuestionOptions(questionType, optionsText) as Prisma.InputJsonValue,
    correctAnswer: correctAnswer || null,
    explanation: nullable(form, "explanation", 20000),
    marks: integer(form, "marks") ?? 1,
    difficulty: text(form, "difficulty", 80) || "MEDIUM",
    bloomLevel: nullable(form, "bloomLevel", 120),
    competency: nullable(form, "competency", 240),
    tags: text(form, "tags", 2000).split(",").map((tag) => tag.trim()).filter(Boolean),
    displayOrder: signedInteger(form, "displayOrder") ?? 0,
    approved: form.get("approved") === "on",
  };
  if (id) {
    const question = await prisma.bookQuestion.findFirst({
      where: { id, bookId, chapterId, exerciseId },
      select: { id: true },
    });
    if (!question) throw new Error("Question not found.");
    await prisma.bookQuestion.update({ where: { id }, data });
  } else {
    await prisma.bookQuestion.create({ data: { ...data, bookId, chapterId } });
  }
  refresh(bookId);
}
