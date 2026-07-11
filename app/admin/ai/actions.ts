"use server";

import { requireUser } from "@/lib/authz";
import { OpenAiProvider, OpenAiProviderError } from "@/lib/ai/providers/openai";
import { getOpenAiReadiness } from "@/lib/ai/providers/openai-readiness";

export type ProviderTestResult = { ok: boolean; message: string; testedAt: string };

export async function testOpenAiProvider(): Promise<ProviderTestResult> {
  await requireUser(["ADMIN"]);
  const testedAt = new Date().toISOString();
  const readiness = getOpenAiReadiness();
  if (!readiness.apiKeyConfigured) return { ok: false, message: "OpenAI API key is not configured.", testedAt };
  if (!readiness.providerSettingValid || !readiness.timeoutSettingValid || !readiness.model) return { ok: false, message: "OpenAI configuration is not ready.", testedAt };

  try {
    const provider = new OpenAiProvider({ model: readiness.model, timeoutMs: Math.min(readiness.timeoutMs, 10_000) });
    const response = await provider.generate({
      systemPrompt: "Return only valid JSON for this provider health check.",
      userPrompt: 'Return exactly this JSON object: {"ok":"bluegate"}',
      responseFormat: "json",
    });
    const value: unknown = JSON.parse(response.content);
    if (!isRecord(value) || value.ok !== "bluegate") return { ok: false, message: "The provider returned an invalid response.", testedAt };
    return { ok: true, message: "OpenAI connectivity test passed.", testedAt };
  } catch (error) {
    return { ok: false, message: safeProviderMessage(error), testedAt };
  }
}

function safeProviderMessage(error: unknown) {
  if (!(error instanceof OpenAiProviderError)) return "The provider could not be reached.";
  const code = error.code.toLowerCase();
  if (code === "not_configured") return "OpenAI API key is not configured.";
  if (code === "timeout") return "The provider request timed out.";
  if (code === "network_error") return "The provider could not be reached.";
  if (code.includes("model") || error.status === 404) return "The configured model is unavailable.";
  if (code === "empty_response" || code.includes("invalid_json")) return "The provider returned an invalid response.";
  return "The provider could not be reached.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
