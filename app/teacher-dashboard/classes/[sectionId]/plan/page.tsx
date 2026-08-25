import TeachingPlanWorkspace from "@/components/teacher/TeachingPlanWorkspace";
import { getTeachingPlanPageData } from "@/lib/teaching-plan";

export default async function TeachingPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ subject?: string; bookId?: string; date?: string; timetableEntryId?: string }>;
}) {
  const { sectionId } = await params;
  const query = await searchParams;
  const data = await getTeachingPlanPageData({
    sectionId,
    sectionSubjectId: query.subject,
    bookId: query.bookId,
  });
  return (
    <TeachingPlanWorkspace
      key={data.selectedBook?.id ?? "no-book"}
      sectionId={sectionId}
      sectionSubjectId={data.sectionSubjectId}
      className={data.className}
      sectionName={data.sectionName}
      subjectName={data.subjectName}
      academicYearName={data.academicYearName}
      books={data.books}
      selectedBook={data.selectedBook}
      chapters={data.chapters}
      initialPlan={data.plan}
      pageAvailability={data.pageAvailability}
      occurrences={data.occurrences}
      initialOccurrence={query.date && query.timetableEntryId ? { date: query.date, timetableEntryId: query.timetableEntryId } : null}
    />
  );
}
