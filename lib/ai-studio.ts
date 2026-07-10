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
