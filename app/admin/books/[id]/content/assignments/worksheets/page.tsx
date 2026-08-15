import PublisherWorksheetList from "@/components/admin/books/PublisherWorksheetList";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import { prisma } from "@/lib/prisma";

import { archivePublisherWorksheetAction, publishPublisherWorksheetAction, restorePublisherWorksheetAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PublisherWorksheetsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ chapterId?: string }> }) {
  const { id: bookId } = await params;
  const query = await searchParams;
  const actor = await requirePublisherAdminBookOwnership(bookId);
  const [worksheets, chapters] = await Promise.all([
    prisma.publisherWorksheet.findMany({
      where: { publisherId: actor.publisherId, bookId },
      include: { chapter: { select: { title: true, chapterNumber: true } }, module: { select: { title: true } }, items: { select: { question: { select: { marks: true } } } } },
      orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    }),
    prisma.bookChapter.findMany({ where: { bookId, archived: false }, select: { id: true, title: true, chapterNumber: true }, orderBy: [{ chapterNumber: "asc" }, { id: "asc" }] }),
  ]);
  return <PublisherWorksheetList
    bookId={bookId}
    chapters={chapters}
    worksheets={worksheets.map((worksheet) => ({ id: worksheet.id, title: worksheet.title, chapter: worksheet.chapter, module: worksheet.module, questionCount: worksheet.items.length, totalMarks: worksheet.items.reduce((total, item) => total + item.question.marks, 0), status: worksheet.archivedAt ? "ARCHIVED" as const : worksheet.published ? "PUBLISHED" as const : "DRAFT" as const, updatedAt: worksheet.updatedAt.toISOString() }))}
    archiveAction={archivePublisherWorksheetAction.bind(null, bookId)}
    restoreAction={restorePublisherWorksheetAction.bind(null, bookId)}
    publishAction={publishPublisherWorksheetAction.bind(null, bookId)}
  />;
}
