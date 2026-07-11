import "server-only";
import type { AiProvider } from "../types";
import { OpenAiProvider } from "../providers/openai";
import { FakeAiProvider } from "./fake-provider";
import type { FakeProviderMode, RuntimeProviderId } from "./types";

export function resolveProviderId(override?: RuntimeProviderId): RuntimeProviderId {
  if (override) return override;
  return process.env.BLUEGATE_AI_PROVIDER?.trim().toLowerCase() === "openai" ? "openai" : "fake";
}
export function getAiProvider(id: RuntimeProviderId, fakeMode: FakeProviderMode = "SUCCESS"): AiProvider {
  return id === "openai" ? new OpenAiProvider() : new FakeAiProvider(fakeMode);
}
