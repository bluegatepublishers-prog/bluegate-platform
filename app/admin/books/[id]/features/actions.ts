"use server";

import { revalidatePath } from "next/cache";

import {
  archiveBookFeatureDefinition,
  attachFeatureToBook,
  createBookFeatureDefinition,
  detachFeatureFromBook,
  updateBookFeatureAssignment,
} from "@/lib/book-features";

export async function createFeatureAction(bookId: string, form: FormData) {
  const feature = await createBookFeatureDefinition({
    title: form.get("title"),
    description: form.get("description"),
    icon: form.get("icon"),
  });
  if (form.get("attach") === "on") {
    await attachFeatureToBook(bookId, feature.id, {
      highlighted: form.get("highlighted") === "on",
    });
  }
  revalidatePath(`/admin/books/${bookId}/features`);
}

export async function attachFeatureAction(bookId: string, form: FormData) {
  await attachFeatureToBook(bookId, String(form.get("featureId") ?? ""), {
    highlighted: form.get("highlighted") === "on",
    customText: form.get("customText"),
  });
  revalidatePath(`/admin/books/${bookId}/features`);
}

export async function updateFeatureAssignmentAction(
  bookId: string,
  assignmentId: string,
  form: FormData,
) {
  const direction = Number(form.get("direction"));
  await updateBookFeatureAssignment(bookId, assignmentId, {
    highlighted: form.get("highlighted") === "on",
    customText: form.get("customText"),
    direction: direction === -1 || direction === 1 ? direction : undefined,
  });
  revalidatePath(`/admin/books/${bookId}/features`);
}

export async function detachFeatureAction(bookId: string, assignmentId: string) {
  await detachFeatureFromBook(bookId, assignmentId);
  revalidatePath(`/admin/books/${bookId}/features`);
}

export async function archiveFeatureDefinitionAction(bookId: string, featureId: string) {
  await archiveBookFeatureDefinition(featureId);
  revalidatePath(`/admin/books/${bookId}/features`);
}
