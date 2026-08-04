import Link from "next/link";
import { notFound } from "next/navigation";

import StructuredContentRenderer from "@/components/content/StructuredContentRenderer";
import { loadTeacherChapterStructuredContent } from "@/lib/content-delivery";

export default async function TeacherStructuredChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; chapterId: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { sectionId, chapterId } = await params;
  const query = await searchParams;
  const data = await loadTeacherChapterStructuredContent({
    sectionId,
    sectionSubjectId: query.subject,
    chapterId,
  });
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <Link href={`/teacher-dashboard/classes/${sectionId}${query.subject ? `?subject=${query.subject}` : ""}`} className="text-sm font-semibold text-blue-600">
            Back to class
          </Link>
          <p className="mt-5 text-sm font-semibold text-blue-600">{data.subject.subject.name}</p>
          <h1 className="mt-2 text-3xl font-bold">
            Chapter {data.chapter.chapterNumber}: {data.chapter.title}
          </h1>
          <p className="mt-3 text-slate-500">
            Structured publisher content is rendered read-only for teaching. PDF delivery remains available through existing book/resource routes.
          </p>
        </header>

        {data.items.length ? (
          <section className="space-y-6">
            {data.items.map((item) => (
              <article key={item.id} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{item.type}</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">{item.title}</h2>
                <div className="mt-6 rounded-[1.5rem] bg-[#fcfaf5] p-5 ring-1 ring-slate-200">
                  <StructuredContentRenderer
                    document={item.document}
                    mode={item.mode}
                    linkedAssets={item.linkedAssets}
                    activities={item.activities}
                    worksheets={item.worksheets}
                    media={item.media}
                    sectionDefinitions={item.sections}
                    knowledgeDefinitions={item.knowledgeDefinitions}
                  />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-8 text-slate-600 shadow-sm ring-1 ring-slate-200">
            Structured module content is not available yet. Use the existing PDF/book and resource flows for this chapter.
          </section>
        )}
      </div>
    </main>
  );
}
