import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePublisherAdminBookOwnership(id);

  const book = await prisma.book.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!book) notFound();

  const [chapterCount, questionCount, outcomeCount, activityCount] = await Promise.all([
    prisma.bookChapter.count({ where: { bookId: id } }),
    prisma.bookQuestion.count({ where: { bookId: id } }),
    prisma.chapterLearningOutcome.count({ where: { chapter: { bookId: id } } }),
    prisma.chapterActivity.count({ where: { chapter: { bookId: id } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Academic Content</p>
        <h2 className="mt-1 text-2xl font-bold">{book.title}</h2>
        <p className="mt-2 text-slate-600">Manage chapter-level content safely inside your publisher scope.</p>
      </div>

      <nav aria-label="Academic content breadcrumbs" className="text-sm text-slate-600">
        <Link className="font-semibold text-blue-700" href="/admin/books">Books</Link>
        <span className="mx-2">/</span>
        <Link className="font-semibold text-blue-700" href={`/admin/books/${id}/edit`}>{book.title}</Link>
        <span className="mx-2">/</span>
        <span className="font-semibold">Academic Content</span>
      </nav>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Chapters" description="Create, edit, reorder, approve, and delete chapter records." count={chapterCount} href={`/admin/books/${id}/chapters`} />
        <Card title="Question Bank" description="Create and maintain approved question items scoped to chapters." count={questionCount} href={`/admin/books/${id}/questions`} />
        <Card title="Topics (Learning Outcomes)" description="Create, edit, reorder, and delete chapter learning outcomes." count={outcomeCount} href={`/admin/books/${id}/learning-outcomes`} />
        <Card title="Exercises (Classroom Activities)" description="Create, edit, approve, and delete chapter activities." count={activityCount} href={`/admin/books/${id}/activities`} />
      </section>
    </div>
  );
}

function Card(input: { title: string; description: string; count: number; href: string }) {
  return (
    <article className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{input.title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {input.count}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{input.description}</p>
      <Link href={input.href} className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white">
        Open
      </Link>
    </article>
  );
}

