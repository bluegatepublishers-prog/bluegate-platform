"use server";

import { BookContentTargetType, ResourceAudience } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  attachResourceToBookContent,
  detachResourceFromBookContent,
  moveBookResourceLink,
} from "@/lib/book-resource-links";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

export async function attachResourceAction(bookId: string, form: FormData) {
  const targetType = Object.values(BookContentTargetType).find((item) => item === form.get("targetType"));
  if (!targetType) throw new Error("Select a valid target type.");
  const audienceOverride = Object.values(ResourceAudience).find((item) => item === form.get("audienceOverride")) ?? null;
  await attachResourceToBookContent({
    bookId,
    resourceId: value(form, "resourceId") ?? "",
    targetType,
    ids: {
      partId: value(form, "partId"),
      unitId: value(form, "unitId"),
      chapterId: value(form, "chapterId"),
      moduleId: value(form, "moduleId"),
      topicId: value(form, "topicId"),
    },
    audienceOverride,
    qrEligible: form.get("qrEligible") === "on",
  });
  revalidatePath(`/admin/books/${bookId}/digital-content`);
}

export async function detachResourceAction(bookId: string, linkId: string) {
  await detachResourceFromBookContent(bookId, linkId);
  revalidatePath(`/admin/books/${bookId}/digital-content`);
}

export async function moveResourceAction(bookId: string, linkId: string, direction: -1 | 1) {
  await moveBookResourceLink(bookId, linkId, direction);
  revalidatePath(`/admin/books/${bookId}/digital-content`);
}
