"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { prepareQuestionPaperDraft } from "@/lib/ai/orchestrator";

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

export async function saveBuilderDraft(input: { tool: "Question Paper Builder" | "Worksheet Builder"; title: string; configuration: string }) {
  const teacher = await requireTeacher();
  const title = input.title.trim();
  if (!title || title.length > 160) return { ok: false, message: "Enter a valid title." };
  if (!input.configuration || input.configuration.length > 50000) return { ok: false, message: "The builder configuration is invalid or too large." };
  let configuration: Record<string, unknown>;
  try { const parsed: unknown = JSON.parse(input.configuration); if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(); configuration = parsed as Record<string, unknown>; } catch { return { ok: false, message: "The builder configuration is invalid." }; }
  const generation = input.tool === "Question Paper Builder"
    ? (await prepareQuestionPaperDraft({ teacherId: teacher.id, title, configuration })).generation
    : await prisma.aiGeneration.create({ data: { teacherId: teacher.id, tool: input.tool, title, prompt: input.configuration, status: "DRAFT" } });
  revalidatePath("/teacher-dashboard/ai/history");
  return { ok: true, id: generation.id, previewUrl: `/teacher-dashboard/ai/generations/${generation.id}`, message: "Draft orchestration preview saved. No external AI provider was called." };
}

export async function updateGenerationDraft(id: string, formData: FormData) {
  const teacher = await requireTeacher();
  const editableContent = String(formData.get("editableContent") ?? "").trim();
  if (editableContent.length > 100000) return { ok: false, message: "Draft content is too large." };
  const existing = await prisma.aiGeneration.findFirst({ where: { id, teacherId: teacher.id }, select: { output: true } });
  if (!existing) return { ok: false, message: "Generation not found." };
  let envelope: Record<string, unknown> = {};
  try { const parsed: unknown = JSON.parse(existing.output ?? "{}"); if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) envelope = parsed as Record<string, unknown>; } catch {}
  envelope.editableContent = editableContent;
  await prisma.aiGeneration.update({ where: { id }, data: { output: JSON.stringify(envelope, null, 2), status: "DRAFT" } });
  revalidatePath(`/teacher-dashboard/ai/generations/${id}`);
  revalidatePath("/teacher-dashboard/ai/history");
  return { ok: true, message: "Editable draft saved." };
}
