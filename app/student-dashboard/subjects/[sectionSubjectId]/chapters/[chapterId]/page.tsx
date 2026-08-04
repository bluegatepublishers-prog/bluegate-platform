import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Activity, BookOpen, Brain, FileText, PlayCircle, Sparkles } from "lucide-react";

import StructuredContentRenderer from "@/components/content/StructuredContentRenderer";
import { loadStudentChapterStructuredContent } from "@/lib/content-delivery";
import { getStudentChapterWorkspace } from "@/lib/student-workspaces";

export default async function ChapterWorkspacePage({
  params,
}: {
  params: Promise<{ sectionSubjectId: string; chapterId: string }>;
}) {
  const { sectionSubjectId, chapterId } = await params;
  const data = await getStudentChapterWorkspace(sectionSubjectId, chapterId);
  if (!data) notFound();

  const structured = await loadStudentChapterStructuredContent(sectionSubjectId, chapterId);
  const { chapter } = data;
  const videos = chapter.resources.filter((item) => item.type === "VIDEO");
  const notes = chapter.resources.filter((item) => item.type === "PDF" || item.type === "DOC");
  const hasPractice = chapter.exercises.length + chapter.classroomAssignments.length + chapter.assessments.length > 0;
  const completed = chapter.studentRevisionProgress[0]?.revisionCompleted;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <Link href={`/student-dashboard/subjects/${sectionSubjectId}?tab=chapters`} className="text-sm font-semibold text-blue-600">
            Back to {data.subject.subjectName}
          </Link>
          <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-semibold text-blue-600">
                Chapter {chapter.chapterNumber}
                {chapter.unit?.title ? ` · ${chapter.unit.title}` : chapter.part?.title ? ` · ${chapter.part.title}` : ""}
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{chapter.title}</h1>
              {chapter.subtitle ? <p className="mt-2 text-slate-500">{chapter.subtitle}</p> : null}
              {chapter.estimatedMinutes ? <p className="mt-3 text-sm text-slate-400">About {chapter.estimatedMinutes} minutes</p> : null}
            </div>
            <span className={`rounded-full px-4 py-2 text-sm font-bold ${completed ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
              {completed ? "Completed" : chapter.studentRevisionProgress.length ? "In progress" : "Not started"}
            </span>
          </div>
          <div className="mt-6 flex justify-between border-t pt-5 text-sm font-semibold">
            {data.previous ? <Link href={`/student-dashboard/subjects/${sectionSubjectId}/chapters/${data.previous.id}`}>{data.previous.title}</Link> : <span />}
            {data.next ? <Link href={`/student-dashboard/subjects/${sectionSubjectId}/chapters/${data.next.id}`}>{data.next.title}</Link> : <span />}
          </div>
        </header>

        <nav aria-label="Chapter actions" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Action href="#read" icon={BookOpen} label="Read" />
          {videos.length > 0 ? <Action href="#watch" icon={PlayCircle} label="Watch" /> : null}
          {chapter.activities.length > 0 ? <Action href="#activity" icon={Activity} label="Activity" /> : null}
          {hasPractice ? <Action href="#practice" icon={Brain} label="Practice" /> : null}
          {chapter.summary || chapter.keywords.length || notes.length ? <Action href="#notes" icon={FileText} label="Notes" /> : null}
          <Action href="#ask-ai" icon={Sparkles} label="Ask AI" />
        </nav>

        <Section id="read" title="Read">
          {structured?.items.length ? (
            <div className="space-y-8">
              {structured.items.map((item) => (
                <article key={item.id} className="rounded-[2rem] bg-[#fcfaf5] p-5 ring-1 ring-slate-200">
                  <h3 className="mb-5 text-xl font-bold text-slate-950">{item.title}</h3>
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
                </article>
              ))}
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              {chapter.summary ? <p>{chapter.summary}</p> : null}
              {chapter.reviewedText ? <p className="whitespace-pre-wrap">{chapter.reviewedText}</p> : null}
              {!chapter.summary && !chapter.reviewedText ? (
                <p>Reading content is not available yet. PDF reading remains available from the book reader when entitled.</p>
              ) : null}
            </div>
          )}
          {chapter.modules.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {chapter.modules.map((item) => (
                <article key={item.id} className="rounded-2xl bg-blue-50 p-4">
                  <strong>{item.title}</strong>
                  {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
          {chapter.topics.length > 0 ? (
            <div className="mt-6 space-y-3">
              {chapter.topics.map((item) => (
                <article key={item.id} className="rounded-2xl border p-4">
                  <strong>{item.title}</strong>
                  {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </Section>

        {videos.length > 0 ? (
          <Section id="watch" title="Watch">
            {videos.map((item) => (
              <a key={item.id} href={`/api/student/resources/${item.id}/open`} className="block rounded-2xl bg-purple-50 p-4 font-semibold">
                {item.title}
              </a>
            ))}
          </Section>
        ) : null}

        {chapter.activities.length > 0 ? (
          <Section id="activity" title="Activities">
            {chapter.activities.map((item) => (
              <article key={item.id} className="rounded-2xl bg-emerald-50 p-4">
                <strong>{item.title}</strong>
                <p className="mt-1 text-sm text-slate-600">{item.objective}</p>
                <p className="mt-3 text-sm">{item.instructions}</p>
              </article>
            ))}
          </Section>
        ) : null}

        {hasPractice ? (
          <Section id="practice" title="Practice">
            <div className="flex flex-wrap gap-3">
              {chapter.exercises.length > 0 ? (
                <Link href={`/student-dashboard/books/${chapter.bookId}/chapters/${chapter.id}/practice`} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">
                  Chapter practice
                </Link>
              ) : null}
              {chapter.classroomAssignments.map((item) => (
                <Link key={item.id} href={`/student-dashboard/assignments/${item.id}`} className="rounded-xl border px-4 py-2 font-semibold">{item.title}</Link>
              ))}
              {chapter.assessments.map((item) => (
                <Link key={item.id} href={`/student-dashboard/assessments/${item.id}`} className="rounded-xl border px-4 py-2 font-semibold">{item.title}</Link>
              ))}
            </div>
          </Section>
        ) : null}

        {chapter.summary || chapter.keywords.length || notes.length ? (
          <Section id="notes" title="Notes">
            {chapter.summary ? <p>{chapter.summary}</p> : null}
            {chapter.keywords.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {chapter.keywords.map((word) => (
                  <span key={word} className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">{word}</span>
                ))}
              </div>
            ) : null}
            {notes.map((item) => (
              <a key={item.id} href={`/api/student/resources/${item.id}/open`} className="mt-3 block font-semibold text-blue-600">{item.title}</a>
            ))}
          </Section>
        ) : null}

        <Section id="ask-ai" title="Ask AI">
          <p className="text-slate-600">Ask questions grounded in this approved chapter.</p>
          <Link href={`/student-dashboard/books/${chapter.bookId}/chapters/${chapter.id}/assistant`} className="mt-4 inline-flex rounded-xl bg-purple-600 px-4 py-2 font-semibold text-white">
            Open learning assistant
          </Link>
        </Section>
      </div>
    </main>
  );
}

function Action({ href, icon: Icon, label }: { href: string; icon: typeof BookOpen; label: string }) {
  return <a href={href} className="flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 font-semibold shadow-sm hover:border-blue-300"><Icon className="h-6 w-6 text-blue-600" />{label}</a>;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"><h2 className="mb-5 text-2xl font-bold">{title}</h2>{children}</section>;
}
