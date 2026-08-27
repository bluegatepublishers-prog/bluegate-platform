import Link from "next/link";
import { notFound } from "next/navigation";

import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import V2NarrationProvider from "@/components/content/V2NarrationProvider";
import { V2PublisherAssessmentInstantiationProvider } from "@/components/content/v2/V2PublisherAssessmentInstantiationContext";
import { buildV2NarrationManifest, mergeV2NarrationManifests } from "@/lib/content-narration";
import { loadTeacherChapterStructuredContent } from "@/lib/content-delivery";

export default async function TeacherStructuredChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; chapterId: string }>;
  searchParams: Promise<{ subject?: string; bookId?: string; moduleId?: string; pageId?: string }>;
}) {
  const { sectionId, chapterId } = await params;
  const query = await searchParams;
  const data = await loadTeacherChapterStructuredContent({
    sectionId,
    sectionSubjectId: query.subject,
    chapterId,
    bookId: query.bookId,
    moduleId: query.moduleId,
  });
  if (!data) notFound();

  const narrationManifests = data.items.map((item) => buildV2NarrationManifest(item.document, "TEACHER", { scopeId: item.id }));
  const narrationManifest = mergeV2NarrationManifests(narrationManifests, "TEACHER");
  const narrationAudioUrls = Object.assign({}, ...data.items.map((item) => item.v2ResourceUrls));
  const planHref = `/teacher-dashboard/classes/${sectionId}/plan?${new URLSearchParams({ subject: data.subject.id, ...(query.bookId ? { bookId: query.bookId } : {}) }).toString()}`;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-blue-700">
            <Link href={planHref}>Teaching Plan</Link>
            <Link href={`/teacher-dashboard/classes/${sectionId}/assignments/new?${new URLSearchParams({ subject: data.subject.id, chapterId, ...(query.bookId ? { bookId: query.bookId } : {}) }).toString()}`}>Create Classwork / Homework</Link>
            <Link href={`/teacher-dashboard/classes/${sectionId}${query.subject ? `?subject=${query.subject}` : ""}`}>Back to class</Link>
          </div>
          <p className="mt-5 text-sm font-semibold text-blue-600">{data.subject.subject.name}</p>
          <h1 className="mt-2 text-3xl font-bold">Chapter {data.chapter.chapterNumber}: {data.chapter.title}</h1>
          <p className="mt-3 text-slate-500">Structured publisher content is rendered read-only for teaching. Read Aloud remains available through the existing viewer.</p>
        </header>

        {data.items.length ? (
          <V2PublisherAssessmentInstantiationProvider value={{ sectionId, sectionSubjectId: data.subject.id, bookId: data.bookId }}>
            <V2NarrationProvider manifest={narrationManifest} audioUrls={narrationAudioUrls}>
              <section className="space-y-6">
              {data.items.map((item) => (
                <article key={item.id} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{item.type}</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">{item.title}</h2>
                  <div className="mt-6 rounded-[1.5rem] bg-[#fcfaf5] p-5 ring-1 ring-slate-200">
                    <V2ContentDocumentRenderer
                      document={item.document}
                      mode={item.mode}
                      linkedAssets={item.linkedAssets}
                      activities={item.activities}
                      worksheets={item.worksheets}
                      media={item.media}
                      sectionDefinitions={item.sections}
                      knowledgeDefinitions={item.knowledgeDefinitions}
                      resourceUrls={item.v2ResourceUrls}
                      immutableRelease={item.immutableRelease}
                    />
                  </div>
                </article>
              ))}
              </section>
            </V2NarrationProvider>
          </V2PublisherAssessmentInstantiationProvider>
        ) : (
          <section className="rounded-3xl bg-white p-8 text-slate-600 shadow-sm ring-1 ring-slate-200">Structured module content is not available yet.</section>
        )}
      </div>
    </main>
  );
}
