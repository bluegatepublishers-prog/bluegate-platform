"use server";

import { revalidatePath } from "next/cache";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import { archiveWorksheetStudioRecord, restoreWorksheetStudioRecord } from "@/lib/worksheet-studio";

export async function archivePublisherWorksheetAction(bookId: string, worksheetId: string) {
  const actor = await requireLivePublisherAdmin();
  await requirePublisherAdminBookOwnership(bookId);
  await archiveWorksheetStudioRecord({ actor: { userId: actor.userId, publisherId: actor.publisherId }, bookId, worksheetId });
  revalidatePath(`/admin/books/${bookId}/content/assignments/worksheets`);
}

export async function restorePublisherWorksheetAction(bookId: string, worksheetId: string) {
  const actor = await requireLivePublisherAdmin();
  await requirePublisherAdminBookOwnership(bookId);
  await restoreWorksheetStudioRecord({ actor: { userId: actor.userId, publisherId: actor.publisherId }, bookId, worksheetId });
  revalidatePath(`/admin/books/${bookId}/content/assignments/worksheets`);
}
