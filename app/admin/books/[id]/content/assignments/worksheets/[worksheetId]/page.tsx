import { notFound } from "next/navigation";

import WorksheetStudio from "@/components/admin/books/WorksheetStudio";
import { loadReleaseSummary } from "@/lib/content-release";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import { prisma } from "@/lib/prisma";
import { loadWorksheetStudio, loadWorksheetStudioLookups } from "@/lib/worksheet-studio";

import {
  archiveWorksheetStudioAction,
  changeContentReleaseAction,
  createWorksheetExerciseAction,
  duplicateWorksheetStudioAction,
  moveWorksheetStudioAction,
  rollbackContentReleaseAction,
  saveWorksheetStudioAction,
} from "../../../actions";

export const dynamic = "force-dynamic";

export default async function PublisherWorksheetEditorPage({ params, searchParams }: {
  params: Promise<{ id: string; worksheetId: string }>;
  searchParams: Promise<{ chapterId?: string; preview?: string }>;
}) {
  const { id: bookId, worksheetId } = await params;
  const query = await searchParams;
  const actor = await requirePublisherAdminBookOwnership(bookId);
  const existing = worksheetId === "new" ? null : await prisma.publisherWorksheet.findFirst({
    where: { id: worksheetId, publisherId: actor.publisherId, bookId, archivedAt: null },
    select: { id: true, chapterId: true },
  });
  const chapterId = existing?.chapterId ?? (worksheetId === "new" ? query.chapterId : undefined);
  if (!chapterId || (worksheetId !== "new" && !existing)) notFound();
  const [book, chapter, rows, lookups] = await Promise.all([
    prisma.book.findFirst({ where: { id: bookId, publisherId: actor.publisherId }, select: { title: true } }),
    prisma.bookChapter.findFirst({ where: { id: chapterId, bookId, archived: false }, select: { title: true } }),
    loadWorksheetStudio({ publisherId: actor.publisherId, bookId, chapterId }),
    loadWorksheetStudioLookups({ publisherId: actor.publisherId, bookId, chapterId }),
  ]);
  if (!book || !chapter) notFound();
  const releaseSummaries = Object.fromEntries(await Promise.all(rows.map(async (row) => [
    row.id,
    await loadReleaseSummary({ actor: { userId: actor.userId, publisherId: actor.publisherId }, bookId, targetType: "WORKSHEET", targetId: row.id }),
  ] as const)));
  return <main className="min-h-screen bg-slate-50"><WorksheetStudio
    chapterId={chapterId}
    bookId={bookId}
    worksheets={rows}
    lookups={lookups}
    initialSelectedId={worksheetId === "new" ? "new" : worksheetId}
    initialPreview={query.preview === "1"}
    bookTitle={book.title}
    chapterTitle={chapter.title}
    currentScopeLabel="Assignments / Worksheets"
    saveAction={saveWorksheetStudioAction.bind(null, bookId, chapterId)}
    duplicateAction={duplicateWorksheetStudioAction.bind(null, bookId)}
    archiveAction={archiveWorksheetStudioAction.bind(null, bookId)}
    moveAction={moveWorksheetStudioAction.bind(null, bookId, chapterId, null, null)}
    createExerciseAction={createWorksheetExerciseAction.bind(null, bookId, chapterId)}
    releaseSummaries={releaseSummaries}
    transitionReleaseAction={changeContentReleaseAction.bind(null, bookId, "WORKSHEET")}
    rollbackReleaseAction={rollbackContentReleaseAction.bind(null, bookId, "WORKSHEET")}
    previewBaseHref={`/admin/books/${bookId}/content/releases`}
  /></main>;
}
