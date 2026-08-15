import Link from "next/link";
import { notFound } from "next/navigation";

import TeacherResourcesManager from "@/components/admin/books/TeacherResourcesManager";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import { listPublisherTeacherResources } from "@/lib/publisher-teacher-resources";

import {
  archiveTeacherResourceAction,
  createTeacherResourceAction,
  createTeacherResourceFolderAction,
  moveTeacherResourceAction,
  renameTeacherResourceAction,
  renameTeacherResourceFolderAction,
  setTeacherResourcePublishedAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherResourcesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ folder?: string }> }) {
  const { id: bookId } = await params;
  const { folder } = await searchParams;
  const actor = await requirePublisherAdminBookOwnership(bookId);
  let workspace;
  try { workspace = await listPublisherTeacherResources({ publisherId: actor.publisherId, bookId, folderId: folder ?? null }); } catch { notFound(); }
  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><Link href={`/admin/books/${bookId}/content`} className="text-sm font-semibold text-indigo-700">← Book Overview</Link><h1 className="mt-2 text-2xl font-bold text-slate-950">Teacher Resources</h1><p className="mt-1 text-sm text-slate-600">Publisher PDFs for teachers using this Smart Book.</p></div></div><TeacherResourcesManager bookId={bookId} workspace={workspace} createFolder={createTeacherResourceFolderAction.bind(null, bookId)} renameFolder={renameTeacherResourceFolderAction.bind(null, bookId)} createResource={createTeacherResourceAction.bind(null, bookId)} renameResource={renameTeacherResourceAction.bind(null, bookId)} setPublished={setTeacherResourcePublishedAction.bind(null, bookId)} moveResource={moveTeacherResourceAction.bind(null, bookId)} archiveResource={archiveTeacherResourceAction.bind(null, bookId)} /></main>;
}
