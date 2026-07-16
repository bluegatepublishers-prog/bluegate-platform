import Link from "next/link";
import { notFound } from "next/navigation";
import StudentLearningAssistant from "@/components/student/StudentLearningAssistant";
import { getStudentAiPageData } from "@/lib/student-ai";

export default async function StudentAssistantPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { bookId, chapterId } = await params;
  const data = await loadPageData(bookId, chapterId);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href={`/student-dashboard/books/${bookId}/chapters/${chapterId}/revision`}
        className="font-semibold text-blue-700"
      >
        &larr; Back to Revision Hub
      </Link>
      <StudentLearningAssistant
        bookId={bookId}
        chapterId={chapterId}
        initialData={data}
      />
    </main>
  );
}

async function loadPageData(bookId: string, chapterId: string) {
  try {
    return await getStudentAiPageData(bookId, chapterId);
  } catch {
    notFound();
  }
}
