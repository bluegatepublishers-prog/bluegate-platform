import Link from "next/link";

import SmartBookReader from "@/components/books/SmartBookReader";
import TeachModeClassTools from "@/components/teacher/TeachModeClassTools";
import TeachModeShell from "@/components/teacher/TeachModeShell";
import { loadTeacherSmartBookRuntime } from "@/lib/teacher-smart-book-runtime";

import { getTeacherBook } from "@/lib/teacher-books";
import { getTeachingPlanPageData } from "@/lib/teaching-plan";

export default async function TeacherTeachPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ subject?: string; bookId?: string; periodId?: string; page?: string }>;
}) {
  const { sectionId } = await params;
  const query = await searchParams;
  const data = await getTeachingPlanPageData({
    sectionId,
    sectionSubjectId: query.subject,
    bookId: query.bookId,
  });
  const backHref = "/teacher-dashboard/classes/" + sectionId + "?subject=" + encodeURIComponent(data.sectionSubjectId);

  if (!data.selectedBook) {
    return <main className="grid min-h-[100dvh] place-items-center bg-slate-50 p-6"><section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl"><h1 className="text-xl font-bold text-slate-950">No eligible book for this class</h1><p className="mt-2 text-sm text-slate-600">Ask your School administrator to assign an approved, published book for this subject.</p><Link href={backHref} className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">Back to Class</Link></section></main>;
  }

  const book = await getTeacherBook(data.selectedBook.id);
  if (!book) return <main className="grid min-h-[100dvh] place-items-center bg-slate-50 p-6"><section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl"><h1 className="text-xl font-bold text-slate-950">This book is not available</h1><Link href={backHref} className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">Back to Class</Link></section></main>;

  const { contents, content } = await loadTeacherSmartBookRuntime(book);
  const period = query.periodId ? data.plan?.periods.find((item) => item.id === query.periodId) : undefined;
  const occurrence = period ? data.occurrences.find((item) => item.period?.id === period.id) : null
  const requestedPage = Number(query.page);
  const initialPage = period?.pageRefs[0]?.displayPageNumber ?? (Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);

  return (
    <TeachModeShell backHref={backHref} subjectLabel={data.subjectName} initialPage={initialPage}>
      {period ? <TeachModeClassTools period={period} sectionId={sectionId} sectionSubjectId={data.sectionSubjectId} bookId={book.id} classLabel={data.className + "-" + data.sectionName} subjectName={data.subjectName} periodLabel={occurrence?.entry.periodSlot.label ?? "Teaching period"} timeLabel={occurrence ? formatPeriodTime(occurrence.entry.periodSlot.startMinute, occurrence.entry.periodSlot.endMinute) : "Time unavailable"} dateLabel={period.plannedDate ? new Date(period.plannedDate).toLocaleDateString("en-IN") : "Date unavailable"} bookTitle={book.title} chapterTitle={period.chapterTitle} persistedPage={initialPage} returnHref={"/teacher-dashboard/classes/" + sectionId + "/teach?subject=" + encodeURIComponent(data.sectionSubjectId) + "&bookId=" + encodeURIComponent(book.id) + "&periodId=" + encodeURIComponent(period.id) + "&page=" + initialPage} /> : null}
      <SmartBookReader
        role="TEACHER"
        bookId={book.id}
        title={book.title}
        initialPage={initialPage}
        contents={contents}
        backHref={backHref}
        showBackLink={false}
        teacherResources={book.teacherResources}
        document={content?.document}
        linkedAssets={content?.linkedAssets}
        activities={content?.activities}
        worksheets={content?.worksheets}
        media={content?.media}
        sections={content?.sections}
        knowledgeDefinitions={content?.knowledgeDefinitions}
        resourceUrls={content?.v2ResourceUrls}
      />
    </TeachModeShell>
  );
}


function formatPeriodTime(startMinute: number, endMinute: number) {
  const format = (minute: number) => String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
  return format(startMinute) + "–" + format(endMinute);
}
