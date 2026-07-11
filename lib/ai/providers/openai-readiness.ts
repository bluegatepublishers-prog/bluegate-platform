import "server-only";

import { DEFAULT_OPENAI_MODEL, DEFAULT_OPENAI_TIMEOUT_MS } from "./openai";

export type OpenAiReadiness = {
  activeProvider: "fake" | "openai";
  providerSettingValid: boolean;
  apiKeyConfigured: boolean;
  model: string;
  timeoutMs: number;
  timeoutSettingValid: boolean;
  ready: boolean;
};

export function getOpenAiReadiness(): OpenAiReadiness {
  const rawProvider = process.env.BLUEGATE_AI_PROVIDER?.trim().toLowerCase() || "fake";
  const providerSettingValid = rawProvider === "fake" || rawProvider === "openai";
  const activeProvider = rawProvider === "openai" ? "openai" : "fake";
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const rawTimeout = process.env.OPENAI_TIMEOUT_MS?.trim();
  const parsedTimeout = rawTimeout ? Number(rawTimeout) : DEFAULT_OPENAI_TIMEOUT_MS;
  const timeoutSettingValid = !rawTimeout || (Number.isFinite(parsedTimeout) && parsedTimeout >= 1_000 && parsedTimeout <= 300_000);
  const timeoutMs = timeoutSettingValid ? Math.trunc(parsedTimeout) : DEFAULT_OPENAI_TIMEOUT_MS;

  return {
    activeProvider,
    providerSettingValid,
    apiKeyConfigured,
    model,
    timeoutMs,
    timeoutSettingValid,
    ready: providerSettingValid && apiKeyConfigured && Boolean(model) && timeoutSettingValid,
  };
}
