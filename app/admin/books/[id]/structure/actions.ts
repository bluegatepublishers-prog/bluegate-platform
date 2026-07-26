"use server";

import { BookPartKind, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  duplicateBookStructureNode,
  moveBookStructureNode,
  reorderBookStructureNodes,
  saveBookStructureNode,
  setBookStructureNodeArchived,
  type BookStructureNodeType,
} from "@/lib/book-structure-management";

const text = (form: FormData, key: string, max = 4000) =>
  String(form.get(key) ?? "").trim().slice(0, max);
const nullable = (form: FormData, key: string, max?: number) =>
  text(form, key, max) || null;
const integer = (form: FormData, key: string) => {
  const value = Number(form.get(key));
  return Number.isInteger(value) && value >= 0 ? value : null;
};
const lines = (form: FormData, key: string) =>
  text(form, key, 12000).split("\n").map((item) => item.trim()).filter(Boolean);

function nodeType(value: FormDataEntryValue | null): BookStructureNodeType {
  const normalized = String(value ?? "");
  if (["PART", "UNIT", "CHAPTER", "MODULE", "TOPIC"].includes(normalized)) {
    return normalized as BookStructureNodeType;
  }
  throw new Error("Select a valid structure type.");
}

function contentBlocks(form: FormData): Prisma.InputJsonValue {
  return {
    learningObjectives: lines(form, "learningObjectives"),
    learningOutcomes: lines(form, "learningOutcomes"),
    keyConcepts: lines(form, "keyConcepts"),
    keywords: lines(form, "keywords"),
    overview: text(form, "overview", 12000),
    prerequisiteKnowledge: text(form, "prerequisiteKnowledge", 12000),
    competencyCodes: lines(form, "competencyCodes"),
    curriculumMapping: text(form, "curriculumMapping", 12000),
    alignment: text(form, "alignment", 12000),
    assessmentObjectives: lines(form, "assessmentObjectives"),
    teachingNotes: text(form, "teachingNotes", 12000),
    teacherGuidance: text(form, "teacherGuidance", 12000),
    studentInstructions: text(form, "studentInstructions", 12000),
    activitySuggestions: lines(form, "activitySuggestions"),
    projectSuggestions: lines(form, "projectSuggestions"),
    labActivities: lines(form, "labActivities"),
    realLifeApplication: text(form, "realLifeApplication", 12000),
    caseStudies: lines(form, "caseStudies"),
    summary: text(form, "contentSummary", 12000),
    glossary: lines(form, "glossary"),
    references: lines(form, "references"),
  };
}

function parents(form: FormData, type: BookStructureNodeType) {
  if (type === "UNIT") return { parentId: nullable(form, "partId") };
  if (type === "CHAPTER") {
    return {
      parentId: nullable(form, "unitId"),
      secondaryParentId: nullable(form, "partId"),
    };
  }
  if (type === "MODULE") return { parentId: nullable(form, "chapterId") };
  if (type === "TOPIC") {
    return {
      parentId: nullable(form, "chapterId"),
      secondaryParentId: nullable(form, "moduleId"),
    };
  }
  return {};
}

export async function saveStructureNodeAction(bookId: string, form: FormData) {
  const type = nodeType(form.get("type"));
  await saveBookStructureNode(bookId, {
    type,
    id: nullable(form, "id") ?? undefined,
    ...parents(form, type),
    title: text(form, "title", 200),
    subtitle: nullable(form, "subtitle", 240),
    shortTitle: nullable(form, "shortTitle", 100),
    code: nullable(form, "code", 80),
    slug: nullable(form, "slug", 180),
    label: nullable(form, "label", 80),
    description: nullable(form, "description", 2000),
    content: contentBlocks(form),
    estimatedMinutes: integer(form, "estimatedMinutes"),
    pageStart: integer(form, "pageStart"),
    pageEnd: integer(form, "pageEnd"),
    imageUrl: nullable(form, "imageUrl", 1000),
    published: form.get("published") === "on",
    partKind: form.get("partKind") === "PART" ? BookPartKind.PART : BookPartKind.MODULE,
  });
  revalidatePath(`/admin/books/${bookId}/structure`);
}

export async function setStructureArchivedAction(
  bookId: string,
  type: BookStructureNodeType,
  nodeId: string,
  archived: boolean,
) {
  await setBookStructureNodeArchived(bookId, type, nodeId, archived);
  revalidatePath(`/admin/books/${bookId}/structure`);
}

export async function duplicateStructureNodeAction(
  bookId: string,
  type: BookStructureNodeType,
  nodeId: string,
) {
  await duplicateBookStructureNode(bookId, type, nodeId);
  revalidatePath(`/admin/books/${bookId}/structure`);
}

export async function reorderStructureAction(
  bookId: string,
  type: BookStructureNodeType,
  orderedIds: string[],
) {
  await reorderBookStructureNodes(bookId, type, orderedIds);
  revalidatePath(`/admin/books/${bookId}/structure`);
}

export async function moveStructureNodeAction(
  bookId: string,
  type: Exclude<BookStructureNodeType, "PART">,
  nodeId: string,
  form: FormData,
) {
  const mapped = parents(form, type);
  await moveBookStructureNode(
    bookId,
    type,
    nodeId,
    mapped.parentId ?? null,
    mapped.secondaryParentId,
  );
  revalidatePath(`/admin/books/${bookId}/structure`);
}
