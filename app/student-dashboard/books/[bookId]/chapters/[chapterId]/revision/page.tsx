import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarDays, Lightbulb, Sigma } from "lucide-react";
import StudentRevisionChecklist from "@/components/student/StudentRevisionChecklist";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentRevisionHub } from "@/lib/student-revision";
import { getStudentPracticeAvailability } from "@/lib/student-practice";
import { getStudentAiAvailability } from "@/lib/student-ai";

export default async function StudentRevisionPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  await requireStudent();
  const { bookId, chapterId } = await params;
  const [hub, practice, assistant] = await Promise.all([getStudentRevisionHub(bookId, chapterId), getStudentPracticeAvailability(bookId, chapterId), getStudentAiAvailability(bookId, chapterId)]);
  if (!hub) notFound();
  const { book, chapter, checklist } = hub;

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <nav aria-label="Revision breadcrumb" className="flex flex-wrap gap-2 text-sm font-semibold text-blue-700">
        <Link href={`/student-dashboard/books/${book.id}`}>← Back to Book</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/student-dashboard/subjects/${book.sectionSubjectId}`}>{book.subjectName}</Link>
      </nav>

      <header className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-300">Revision Hub · Chapter {chapter.chapterNumber}</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{chapter.title}</h1>
        <p className="mt-3 text-slate-300">{book.title} · Approved chapter knowledge only</p>
      </header>

      <section className="rounded-3xl border bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">Summary</p>
        <h2 className="mt-2 text-2xl font-bold">Chapter at a glance</h2>
        {chapter.summary ? <p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-slate-700">{chapter.summary}</p> : <Empty text="An approved chapter summary has not been added yet." />}
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold">Key Points</h2>
        {chapter.keyPoints.length ? <ul className="mt-5 space-y-3">{chapter.keyPoints.map((point) => <li key={point.id} className="flex gap-3 rounded-2xl bg-slate-50 p-4 leading-7"><BookOpenCheck className="mt-1 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" /><span>{point.text}</span></li>)}</ul> : <Empty text="No approved learning outcomes are available for this chapter yet." />}
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold">Keywords</h2>
        <p className="mt-2 text-slate-600">Keywords are alphabetical. Open a chip to view its approved definition status.</p>
        {chapter.keywords.length ? <div className="mt-5 flex flex-wrap gap-3">{chapter.keywords.map((item) => <details key={item.keyword} className="group rounded-2xl border bg-slate-50"><summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-semibold text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700">{item.keyword}</summary><p className="max-w-sm border-t px-4 py-3 text-sm text-slate-600">{item.definition ?? "No approved structured definition has been added for this keyword."}</p></details>)}</div> : <Empty text="No approved keywords are available for this chapter yet." />}
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StructuredSection icon={Sigma} title="Formulae" empty="No approved structured formulae are available." />
        <StructuredSection icon={CalendarDays} title="Important Dates" empty="No approved structured dates are available." />
        <StructuredSection icon={BookOpenCheck} title="Definitions" empty="No approved structured definitions are available." />
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold">Mind Map</h2>
        <div className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-10 text-center font-semibold text-slate-500">Mind Map Coming Soon</div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold">Quick Revision Cards</h2>
        {chapter.quickRevisionCards.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{chapter.quickRevisionCards.map((card) => <details key={card.id} className="group rounded-2xl border bg-amber-50 p-5"><summary className="min-h-11 cursor-pointer list-none font-bold leading-7 focus-visible:outline-2 focus-visible:outline-amber-700">{card.question}<span className="mt-3 block text-sm font-semibold text-amber-800 group-open:hidden">Tap to reveal answer</span></summary><div className="mt-4 border-t border-amber-200 pt-4"><p className="font-semibold text-slate-900">{card.answer}</p>{card.explanation && <p className="mt-3 text-sm leading-6 text-slate-600">{card.explanation}</p>}</div></details>)}</div> : <Empty text="No approved question-and-answer cards are available for this chapter yet." />}
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StructuredSection icon={Lightbulb} title="Remember Boxes" empty="No approved Remember boxes are available." />
        <StructuredSection icon={Lightbulb} title="Common Mistakes" empty="No approved common-mistake notes are available." />
        <StructuredSection icon={Lightbulb} title="Did You Know" empty="No approved Did You Know facts are available." />
      </section>

      {chapter.activities.length > 0 && <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold">Approved Learning Activities</h2><div className="mt-5 space-y-4">{chapter.activities.map((activity) => <details key={activity.id} className="rounded-2xl border bg-slate-50 p-5"><summary className="min-h-11 cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-blue-700">{activity.title}</summary><div className="mt-4 space-y-3 text-slate-700"><p><strong>Objective:</strong> {activity.objective}</p><p className="whitespace-pre-wrap"><strong>Instructions:</strong> {activity.instructions}</p>{activity.expectedLearning && <p><strong>Expected learning:</strong> {activity.expectedLearning}</p>}</div></details>)}</div></section>}

      <StudentRevisionChecklist bookId={book.id} chapterId={chapter.id} initialValue={checklist} />
      <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold">Practice</h2><p className="mt-2 text-slate-600">Check your understanding with approved, machine-gradable questions.</p>{practice.state === "LOCKED" ? <p className="mt-5 rounded-2xl bg-amber-50 p-5 font-semibold text-amber-900">{practice.basic ? "Practice is available with Premium." : "This practice activity is not available for your account."}</p> : practice.state === "EMPTY" ? <p className="mt-5 text-slate-500">No practice questions are available for this chapter yet.</p> : practice.state === "UNAVAILABLE" ? <p className="mt-5 text-slate-500">This practice activity is not available for your account.</p> : <Link href={`/student-dashboard/books/${book.id}/chapters/${chapter.id}/practice`} className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-6 py-3 font-bold text-white">{practice.state === "CONTINUE" ? "Continue Practice" : practice.state === "RETRY" ? "Retry Practice" : "Start Practice"}</Link>}</section>
      <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold">Learning Assistant</h2><p className="mt-2 text-slate-600">Use guided AI tools grounded only in this approved chapter.</p>{assistant.state === "LOCKED" ? <p className="mt-5 rounded-2xl bg-amber-50 p-5 font-semibold text-amber-900">Learning Assistant is available with Premium.</p> : assistant.state === "FEATURE_DISABLED" ? <p className="mt-5 rounded-2xl bg-slate-50 p-5 font-semibold text-slate-700">This feature is not available on your platform.</p> : assistant.state === "UNAVAILABLE" ? <p className="mt-5 text-slate-500">This learning assistant is not available for this chapter.</p> : <Link href={`/student-dashboard/books/${book.id}/chapters/${chapter.id}/assistant`} className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white">Open Learning Assistant</Link>}</section>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-5 text-slate-500">{text}</p>;
}

function StructuredSection({ icon: Icon, title, empty }: { icon: typeof Sigma; title: string; empty: string }) {
  return <article className="rounded-3xl border bg-white p-6 shadow-sm"><Icon className="h-7 w-7 text-blue-700" aria-hidden="true" /><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-4 text-sm leading-6 text-slate-500">{empty}</p></article>;
}
