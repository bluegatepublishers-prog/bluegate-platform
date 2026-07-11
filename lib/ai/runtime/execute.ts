import "server-only";
import { prisma } from "@/lib/prisma";
import { collectBookKnowledge } from "../knowledge-collector";
import { buildQuestionPaperPrompt } from "../prompt-builder";
import { assertCanGenerate, consumeQuota, releaseQuota, reserveQuota } from "../quota";
import { validateProviderResponse, validateQuestionPaperPreparation } from "../response-validator";
import { OpenAiProviderError } from "../providers/openai";
import { RuntimeError } from "./errors";
import { FakeProviderError } from "./fake-provider";
import { getAiProvider, resolveProviderId } from "./provider-registry";
import type { ExecuteAiGenerationInput, ExecuteAiGenerationOptions, ExecuteAiGenerationResult, RuntimeEvent, RuntimeStage } from "./types";

export async function executeAiGeneration(input: ExecuteAiGenerationInput, options: ExecuteAiGenerationOptions = {}): Promise<ExecuteAiGenerationResult> {
  const startedAt = new Date(); let generationId: string | undefined; let reserved = false; let providerStartedAt: number | undefined; let providerDurationMs: number | undefined; let providerId: "fake" | "openai" | undefined;
  const emit = (stage: RuntimeStage, code?: RuntimeError["code"]) => { const event: RuntimeEvent = { stage, at: new Date(), startedAt, durationMs: Date.now() - startedAt.getTime(), providerDurationMs, generationId, teacherId: typeof input?.teacherId === "string" ? input.teacherId : "", tool: typeof input?.tool === "string" ? input.tool : "", provider: providerId, code }; try { options.onEvent?.(event); } catch { /* Telemetry must never affect generation. */ } };
  emit("STARTED");
  try {
    validateInput(input);
    const teacher = await prisma.teacher.findUnique({ where: { id: input.teacherId }, select: { id: true } });
    if (!teacher) throw new RuntimeError("TEACHER_NOT_FOUND", { retryable: false });
    const existing = input.generationId ? await prisma.aiGeneration.findFirst({ where: { id: input.generationId, teacherId: input.teacherId } }) : null;
    if (input.generationId && !existing) throw new RuntimeError("INVALID_INPUT", { retryable: false });
    if (existing?.status === "COMPLETED" && existing.quotaConsumed) return { ok: true, generationId: existing.id, status: "COMPLETED", quotaConsumed: true };
    if (existing && existing.status !== "DRAFT" && existing.status !== "FAILED") throw new RuntimeError("INVALID_INPUT", { retryable: false });
    const academic = record(input.configuration.academic), chapters = Array.isArray(input.configuration.chapters) ? input.configuration.chapters : [];
    const bookId = typeof academic.bookId === "string" ? academic.bookId : "";
    const names = chapters.map((value) => record(value).name).filter((value): value is string => typeof value === "string");
    let knowledge; try { knowledge = await collectBookKnowledge(bookId, names); } catch (cause) { throw new RuntimeError("KNOWLEDGE_PREPARATION_FAILED", { retryable: false, cause }); }
    emit("KNOWLEDGE_READY");
    let request; try { request = buildQuestionPaperPrompt(input.configuration, knowledge); } catch (cause) { throw new RuntimeError("PROMPT_BUILD_FAILED", { retryable: false, cause }); }
    emit("PROMPT_READY");
    if (!validateQuestionPaperPreparation(input.configuration, knowledge).valid) throw new RuntimeError("PREPARATION_INVALID", { retryable: false });
    const prompt = JSON.stringify(request, null, 2);
    try { const generation = existing ? await prisma.aiGeneration.update({ where: { id: existing.id }, data: { tool: input.tool.trim(), title: input.title.trim(), prompt, status: "DRAFT", output: null, providerCalled: false, quotaConsumed: false, completedAt: null, failureReason: null } }) : await prisma.aiGeneration.create({ data: { teacherId: input.teacherId, tool: input.tool.trim(), title: input.title.trim(), prompt, status: "DRAFT" } }); generationId = generation.id; } catch (cause) { throw new RuntimeError("PERSISTENCE_FAILED", { cause }); }
    try { await assertCanGenerate(input.teacherId); } catch (cause) { throw quotaError(cause); }
    try { await reserveQuota({ teacherId: input.teacherId, generationId, tool: input.tool.trim() }); reserved = true; } catch (cause) { throw quotaError(cause); }
    emit("QUOTA_RESERVED");
    try { await prisma.aiGeneration.update({ where: { id: generationId }, data: { providerCalled: true, failureReason: null } }); } catch (cause) { throw new RuntimeError("PERSISTENCE_FAILED", { cause }); }
    providerId = resolveProviderId(input.provider); const provider = options.providerInstance ?? getAiProvider(providerId, options.fakeMode);
    providerStartedAt = Date.now(); emit("PROVIDER_STARTED");
    let response; try { response = await provider.generate(request); } catch (cause) { throw providerError(cause); } finally { providerDurationMs = providerStartedAt ? Date.now() - providerStartedAt : undefined; }
    emit("PROVIDER_COMPLETED");
    const validation = validateProviderResponse(response); if (!validation.valid) throw new RuntimeError("RESPONSE_INVALID", { retryable: true });
    let output: string; try { output = JSON.stringify(JSON.parse(response.content) as unknown, null, 2); } catch (cause) { throw new RuntimeError("RESPONSE_INVALID", { retryable: true, cause }); }
    emit("VALIDATION_PASSED");
    try { await prisma.aiGeneration.update({ where: { id: generationId }, data: { output } }); emit("OUTPUT_PERSISTED"); await consumeQuota({ teacherId: input.teacherId, generationId }); } catch (cause) { throw new RuntimeError("PERSISTENCE_FAILED", { cause }); }
    emit("COMPLETED"); return { ok: true, generationId, status: "COMPLETED", quotaConsumed: true };
  } catch (cause) {
    const error = cause instanceof RuntimeError ? cause : new RuntimeError("UNKNOWN_ERROR", { cause });
    if (generationId) { if (reserved) { try { await releaseQuota({ teacherId: input.teacherId, generationId, failureReason: error.message }); } catch { /* Preserve the original error. */ } } try { await prisma.aiGeneration.updateMany({ where: { id: generationId, teacherId: input.teacherId, quotaConsumed: false }, data: { status: "FAILED", failureReason: error.message.slice(0, 500), completedAt: null } }); } catch { /* Preserve the original error. */ } }
    emit("FAILED", error.code); return { ok: false, ...(generationId ? { generationId } : {}), code: error.code, message: error.message, retryable: error.retryable };
  }
}

function validateInput(input: ExecuteAiGenerationInput) { if (!input || typeof input.teacherId !== "string" || !input.teacherId.trim() || typeof input.tool !== "string" || !input.tool.trim() || typeof input.title !== "string" || !input.title.trim() || !record(input.configuration).academic || (input.provider !== undefined && input.provider !== "fake" && input.provider !== "openai")) throw new RuntimeError("INVALID_INPUT", { retryable: false }); }
function record(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function quotaError(cause: unknown) { const message = cause instanceof Error ? cause.message.toLowerCase() : ""; if (message.includes("premium")) return new RuntimeError("NOT_ENTITLED", { retryable: false, cause }); if (message.includes("used") || message.includes("reserved") || message.includes("allowance")) return new RuntimeError("DAILY_LIMIT_REACHED", { retryable: false, cause }); return new RuntimeError("QUOTA_RESERVATION_FAILED", { cause }); }
function providerError(cause: unknown) { if (cause instanceof FakeProviderError) return new RuntimeError(cause.code === "timeout" ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR", { cause }); if (cause instanceof OpenAiProviderError) { if (cause.code === "timeout") return new RuntimeError("PROVIDER_TIMEOUT", { cause }); if (cause.code === "network_error") return new RuntimeError("PROVIDER_NETWORK_ERROR", { cause }); } return new RuntimeError("PROVIDER_ERROR", { cause }); }
