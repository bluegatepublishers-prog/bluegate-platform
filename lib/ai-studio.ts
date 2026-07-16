import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getTeacherAiEntitlement } from "@/lib/ai/quota";
import { getTeacherEntitledBookIds } from "@/lib/entitlements/book";

export async function getAiGenerations() {
  const teacher = await requireTeacher();
  return prisma.aiGeneration.findMany({ where: { teacherId: teacher.id }, orderBy: { createdAt: "desc" } });
}

export async function getPromptTemplates() {
  const teacher = await requireTeacher();
  return prisma.promptTemplate.findMany({ where: { teacherId: teacher.id }, orderBy: { updatedAt: "desc" } });
}

export async function getBuilderAcademicOptions() {
  const teacher=await requireTeacher();
  const bookIds=await getTeacherEntitledBookIds(teacher.userId);
  const [classes, subjects, books] = await Promise.all([
    prisma.class.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subject.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.book.findMany({ where: { id:{in:bookIds},publisherId:teacher.school?.publisherId,published: true }, select: { id: true, title: true, classId: true, subjectId: true, series: { select: { name: true } } }, orderBy: { title: "asc" } }),
  ]);
  return { classes, subjects, books };
}

export async function getQuestionPaperWizardOptions() {
  const teacher = await requireTeacher();
  const bookIds=await getTeacherEntitledBookIds(teacher.userId);
  const [classes, subjects, books, entitlement] = await Promise.all([
    prisma.class.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subject.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.book.findMany({ where: { id:{in:bookIds},publisherId:teacher.school?.publisherId,published: true }, select: { id: true, title: true, classId: true, subjectId: true, publisher: true, coverImage: true, aboutBook: true, description: true, class: { select: { name: true } }, subject: { select: { name: true } }, series: { select: { name: true } }, chapters: { orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }], select: { id: true, chapterNumber: true, title: true, approved: true, reviewedText: true, extractedText: true, _count: { select: { learningOutcomes: true, questions: { where: { approved: true } } } } } } }, orderBy: { title: "asc" } }),
    getTeacherAiEntitlement(teacher.id),
  ]);
  return { classes, subjects, books: books.map(book => ({ id: book.id, title: book.title, classId: book.classId, subjectId: book.subjectId, className: book.class.name, subjectName: book.subject.name, series: book.series?.name ?? null, publisher: book.publisher, coverImage: book.coverImage, summary: book.aboutBook ?? book.description, chapters: book.chapters.map(chapter => ({ id: chapter.id, chapterNumber: chapter.chapterNumber, title: chapter.title, aiReady: chapter.approved && Boolean(chapter.reviewedText?.trim()) && chapter._count.learningOutcomes > 0, learningOutcomesCount: chapter._count.learningOutcomes, questionBankCount: chapter._count.questions })) })), entitlement: { plan: entitlement.plan, remaining: entitlement.remaining, limit: entitlement.limit, canGenerate: entitlement.canGenerate } };
}
