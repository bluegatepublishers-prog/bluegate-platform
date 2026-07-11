import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";

export async function getAiGenerations() {
  const teacher = await requireTeacher();
  return prisma.aiGeneration.findMany({ where: { teacherId: teacher.id }, orderBy: { createdAt: "desc" } });
}

export async function getPromptTemplates() {
  const teacher = await requireTeacher();
  return prisma.promptTemplate.findMany({ where: { teacherId: teacher.id }, orderBy: { updatedAt: "desc" } });
}

export async function getBuilderAcademicOptions() {
  await requireTeacher();
  const [classes, subjects, books] = await Promise.all([
    prisma.class.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subject.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.book.findMany({ where: { published: true }, select: { id: true, title: true, classId: true, subjectId: true, series: { select: { name: true } } }, orderBy: { title: "asc" } }),
  ]);
  return { classes, subjects, books };
}
