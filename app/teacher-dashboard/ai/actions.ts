"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { prepareQuestionPaperDraft } from "@/lib/ai/orchestrator";
import { executeAiGeneration } from "@/lib/ai";

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
  const existing = await prisma.aiGeneration.findFirst({ where: { id, teacherId: teacher.id }, select: { output: true, status: true } });
  if (!existing) return { ok: false, message: "Generation not found." };
  let envelope: Record<string, unknown> = {};
  try { const parsed: unknown = JSON.parse(existing.output ?? "{}"); if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) envelope = parsed as Record<string, unknown>; } catch {}
  envelope.editableContent = editableContent;
  await prisma.aiGeneration.update({ where: { id }, data: { output: JSON.stringify(envelope, null, 2), status: existing.status } });
  revalidatePath(`/teacher-dashboard/ai/generations/${id}`);
  revalidatePath("/teacher-dashboard/ai/history");
  return { ok: true, message: "Editable draft saved." };
}

type GenerateQuestionPaperInput = { bookId: string; chapterIds: string[]; title: string; totalMarks: number; duration: number; difficulty: "Easy" | "Medium" | "Hard"; autoDistribution: boolean; questionTypes: string[]; questionCounts: Record<string, number>; estimatedQuestions: number };
const allowedQuestionTypes = new Set(["MCQ", "Very Short", "Short", "Long", "Case Study", "Assertion Reason", "Competency Based", "HOTS"]);

export async function generateQuestionPaper(input: GenerateQuestionPaperInput) {
  const teacher = await requireTeacher();
  if (!input || typeof input.bookId !== "string" || !input.bookId || !Array.isArray(input.chapterIds) || !input.chapterIds.length || typeof input.title !== "string" || !input.title.trim() || input.title.length > 160 || !Number.isInteger(input.totalMarks) || input.totalMarks < 1 || input.totalMarks > 500 || !Number.isInteger(input.duration) || input.duration < 10 || input.duration > 360 || !["Easy", "Medium", "Hard"].includes(input.difficulty) || !Array.isArray(input.questionTypes) || !input.questionTypes.length || input.questionTypes.some(type => !allowedQuestionTypes.has(type))) return { ok: false as const, message: "Please complete all question paper settings." };
  const uniqueChapterIds = [...new Set(input.chapterIds)];
  const book = await prisma.book.findFirst({ where: { id: input.bookId, published: true }, select: { id: true, title: true, classId: true, subjectId: true, chapters: { where: { id: { in: uniqueChapterIds } }, select: { id: true, title: true, chapterNumber: true, approved: true, reviewedText: true, extractedText: true } } } });
  if (!book || book.chapters.length !== uniqueChapterIds.length) return { ok: false as const, message: "The selected book or chapters are no longer available." };
  if (book.chapters.some(chapter => !chapter.approved || !(chapter.reviewedText?.trim() || chapter.extractedText?.trim()))) return { ok: false as const, message: "One or more chapters do not have enough approved content." };
  const blueprint = buildBlueprint(input);
  const configuration = { version: 1, academic: { bookId: book.id, classId: book.classId, subjectId: book.subjectId }, settings: { title: input.title.trim(), totalMarks: input.totalMarks, duration: input.duration, difficulty: input.difficulty }, chapters: book.chapters.map(chapter => ({ id: chapter.id, name: chapter.title, chapterNumber: chapter.chapterNumber })), blueprint, distributionMode: "difficulty", distribution: difficultyDistribution(input.difficulty), options: { answerKey: true, markingScheme: true }, totals: { marks: input.totalMarks, questions: blueprint.reduce((sum, row) => sum + row.count, 0) } };
  const result = await executeAiGeneration({ teacherId: teacher.id, tool: "Question Paper Generator", title: input.title.trim(), configuration });
  if (!result.ok) return { ok: false as const, message: result.message };
  revalidatePath("/teacher-dashboard/ai/history");
  return { ok: true as const, generationId: result.generationId, draftUrl: `/teacher-dashboard/ai/generations/${result.generationId}` };
}

function buildBlueprint(input: GenerateQuestionPaperInput) { const types = [...new Set(input.questionTypes)]; if (!input.autoDistribution) { const requested = types.map(type => ({ type, count: Math.max(1, Math.min(50, Math.trunc(input.questionCounts[type] ?? 1))) })); const totalQuestions = requested.reduce((sum, row) => sum + row.count, 0); return requested.map((row, index) => ({ ...row, marks: index === requested.length - 1 ? input.totalMarks - Math.max(0, totalQuestions - row.count) : 1 })).filter(row => row.marks > 0); } const count = Math.max(types.length, Math.min(50, Math.trunc(input.estimatedQuestions))); const base = Math.floor(count / types.length), extra = count % types.length; const counts = types.map((type, index) => ({ type, count: base + (index < extra ? 1 : 0) })); let remainingMarks = input.totalMarks; return counts.map((row, index) => { const marks = index === counts.length - 1 ? Math.max(1, Math.floor(remainingMarks / row.count)) : Math.max(1, Math.floor(input.totalMarks / count)); remainingMarks -= marks * row.count; return { ...row, marks }; }); }
function difficultyDistribution(value: GenerateQuestionPaperInput["difficulty"]) { return value === "Easy" ? { first: 60, second: 30, third: 10, fourth: 0 } : value === "Hard" ? { first: 10, second: 35, third: 55, fourth: 0 } : { first: 30, second: 50, third: 20, fourth: 0 }; }
