"use server";

import { revalidatePath } from "next/cache";

import {
  archivePublisherTeacherResource,
  createPublisherTeacherResource,
  createPublisherTeacherResourceFolder,
  movePublisherTeacherResource,
  renamePublisherTeacherResource,
  renamePublisherTeacherResourceFolder,
  setPublisherTeacherResourcePublished,
} from "@/lib/publisher-teacher-resources";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";

type Result = { ok: true } | { ok: false; message: string };
const fail = (error: unknown): Result => ({ ok: false, message: error instanceof Error ? error.message : "Unable to update Teacher Resources." });

async function context(bookId: string) {
  const [actor] = await Promise.all([requireLivePublisherAdmin(), requirePublisherAdminBookOwnership(bookId)]);
  return { publisherId: actor.publisherId, bookId };
}
function refresh(bookId: string) {
  revalidatePath(`/admin/books/${bookId}/content`);
  revalidatePath(`/admin/books/${bookId}/content/teacher-resources`);
}

export async function createTeacherResourceFolderAction(bookId: string, parentFolderId: string | null, name: string): Promise<Result> {
  try { const input = await context(bookId); await createPublisherTeacherResourceFolder({ ...input, parentFolderId, name }); refresh(bookId); return { ok: true }; } catch (error) { return fail(error); }
}
export async function renameTeacherResourceFolderAction(bookId: string, folderId: string, name: string): Promise<Result> {
  try { const input = await context(bookId); await renamePublisherTeacherResourceFolder({ ...input, folderId, name }); refresh(bookId); return { ok: true }; } catch (error) { return fail(error); }
}
export async function createTeacherResourceAction(bookId: string, input: { folderId: string; objectKey: string; originalFileName: string; contentType: string; sizeBytes: number }): Promise<Result> {
  try { const contextInput = await context(bookId); await createPublisherTeacherResource({ ...contextInput, ...input }); refresh(bookId); return { ok: true }; } catch (error) { return fail(error); }
}
export async function renameTeacherResourceAction(bookId: string, resourceId: string, title: string): Promise<Result> {
  try { const input = await context(bookId); await renamePublisherTeacherResource({ ...input, resourceId, title }); refresh(bookId); return { ok: true }; } catch (error) { return fail(error); }
}
export async function setTeacherResourcePublishedAction(bookId: string, resourceId: string, published: boolean): Promise<Result> {
  try { const input = await context(bookId); await setPublisherTeacherResourcePublished({ ...input, resourceId, published }); refresh(bookId); return { ok: true }; } catch (error) { return fail(error); }
}
export async function moveTeacherResourceAction(bookId: string, resourceId: string, folderId: string): Promise<Result> {
  try { const input = await context(bookId); await movePublisherTeacherResource({ ...input, resourceId, folderId }); refresh(bookId); return { ok: true }; } catch (error) { return fail(error); }
}
export async function archiveTeacherResourceAction(bookId: string, resourceId: string): Promise<Result> {
  try { const input = await context(bookId); await archivePublisherTeacherResource({ ...input, resourceId }); refresh(bookId); return { ok: true }; } catch (error) { return fail(error); }
}
