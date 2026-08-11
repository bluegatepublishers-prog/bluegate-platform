import "server-only";

import { prisma } from "@/lib/prisma";
import { getTeacherResourceScope } from "@/lib/resource-audience";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getTeacherClasses, requireTeacherClass } from "@/lib/classroom";

export async function getTeacherQuestionBankOptions() {
  const classes = await getTeacherClasses();
  const sectionIds = [...new Set(classes.map((item) => item.sectionId))];
  const scopes = await Promise.all(sectionIds.map((sectionId) => requireTeacherClass(sectionId)));
  const contextMap = new Map<string, { id: string; label: string }>();
  const bookMap = new Map<string, { id: string; title: string; sectionSubjectIds: string[]; chapters: Array<{ id: string; title: string; chapterNumber: number }> }>();

  for (const scope of scopes) {
    for (const sectionSubject of scope.sectionSubjects) {
      contextMap.set(sectionSubject.id, {
        id: sectionSubject.id,
        label: `${scope.schoolClass.name}-${scope.section.name} | ${sectionSubject.subject.name}`,
      });
      for (const adoption of sectionSubject.bookAdoptions) {
        const book = bookMap.get(adoption.book.id) ?? {
          id: adoption.book.id,
          title: adoption.book.title,
          sectionSubjectIds: [],
          chapters: adoption.book.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, chapterNumber: chapter.chapterNumber })),
        };
        if (!book.sectionSubjectIds.includes(sectionSubject.id)) book.sectionSubjectIds.push(sectionSubject.id);
        bookMap.set(book.id, book);
      }
    }
  }

  const books = [...bookMap.values()];
  const modules = books.length
    ? await prisma.bookModule.findMany({
        where: { bookId: { in: books.map((book) => book.id) }, archived: false },
        select: { id: true, title: true, bookId: true, chapterId: true },
        orderBy: [{ bookId: "asc" }, { displayOrder: "asc" }, { title: "asc" }],
      })
    : [];
  const teacher = await requireTeacher();
  const resourceScope = await getTeacherResourceScope(teacher.userId);
  const images = resourceScope
    ? await prisma.resource.findMany({
        where: { ...resourceScope.where, type: "IMAGE" },
        select: { id: true, title: true, type: true, thumbnail: true, mimeType: true },
        orderBy: { title: "asc" },
        take: 200,
      })
    : [];

  return {
    contexts: [...contextMap.values()].sort((left, right) => left.label.localeCompare(right.label)),
    books: books.sort((left, right) => left.title.localeCompare(right.title)),
    modules,
    images,
  };
}