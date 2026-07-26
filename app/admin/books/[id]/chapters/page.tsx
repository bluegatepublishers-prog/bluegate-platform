import Link from "next/link";
import { notFound } from "next/navigation";

import KnowledgeActionButton from "@/components/admin/KnowledgeActionButton";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import { deleteChapter, moveChapter } from "../knowledge-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePublisherAdminBookOwnership(id);
  if (!process.env.DATABASE_URL) return <Guard />;

  const book = await prisma.book.findUnique({ where: { id }, select: { id: true } });
  if (!book) notFound();
  const chapters = await prisma.bookChapter.findMany({
    where: { bookId: id, archived: false },
    include: {
      _count: { select: { questions: true, learningOutcomes: true, activities: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }],
  });

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Chapters</h2>
          <p className="mt-1 text-slate-600">Manage source content without deleting linked academic history.</p>
        </div>
        <Link href={`/admin/books/${id}/chapters/new`} className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
          Add chapter
        </Link>
      </div>

      {chapters.length ? (
        <div className="divide-y rounded-3xl border bg-white">
          {chapters.map((chapter) => (
            <article key={chapter.id} className="grid min-w-0 gap-4 p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
              <div className="flex gap-2">
                <KnowledgeActionButton action={moveChapter.bind(null, id, chapter.id, -1)} label="↑" className="text-slate-700" />
                <KnowledgeActionButton action={moveChapter.bind(null, id, chapter.id, 1)} label="↓" className="text-slate-700" />
              </div>
              <div className="min-w-0">
                <p className="break-words font-bold">{chapter.chapterNumber}. {chapter.title}</p>
                <p className="break-all text-xs text-slate-500">{chapter.slug}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Pages {chapter.startPage ?? "—"}–{chapter.endPage ?? "—"} · {chapter.approved ? "AI approved" : "AI review pending"} · {chapter.published ? "Published" : "Draft"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {chapter._count.questions} questions · {chapter._count.learningOutcomes} outcomes · {chapter._count.activities} activities
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/admin/books/${id}/chapters/${chapter.id}/edit`} className="min-h-10 rounded-lg border px-3 py-2 font-semibold text-blue-700">Edit</Link>
                <KnowledgeActionButton
                  action={deleteChapter.bind(null, id, chapter.id)}
                  label="Archive"
                  confirmMessage={`Archive chapter ${chapter.chapterNumber}? Historical links will be retained.`}
                />
              </div>
            </article>
          ))}
        </div>
      ) : <Empty text="No active chapters added yet." />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border bg-white p-14 text-center text-slate-500">{text}</div>;
}

function Guard() {
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">Database configuration required.</div>;
}
