"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";

const templatesPath = "/teacher-dashboard/ai/templates";
const clean = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function savePromptTemplate(formData: FormData) {
  const teacher = await requireTeacher();
  const id = clean(formData, "id");
  const title = clean(formData, "title");
  const tool = clean(formData, "tool");
  const prompt = clean(formData, "prompt");
  const description = clean(formData, "description") || null;
  if (!title || !tool || !prompt) return { ok: false, message: "Title, tool, and prompt are required." };
  if (title.length > 120 || tool.length > 80 || prompt.length > 5000 || (description?.length ?? 0) > 300) return { ok: false, message: "One or more fields exceed the allowed length." };

  if (id) {
    const result = await prisma.promptTemplate.updateMany({ where: { id, teacherId: teacher.id }, data: { title, tool, prompt, description } });
    if (!result.count) return { ok: false, message: "Template not found." };
  } else {
    await prisma.promptTemplate.create({ data: { teacherId: teacher.id, title, tool, prompt, description } });
  }
  revalidatePath(templatesPath);
  return { ok: true, message: id ? "Template updated." : "Template created." };
}

export async function deletePromptTemplate(id: string) {
  const teacher = await requireTeacher();
  await prisma.promptTemplate.deleteMany({ where: { id, teacherId: teacher.id } });
  revalidatePath(templatesPath);
  return { ok: true };
}
