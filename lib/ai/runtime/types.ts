import type { AiProvider } from "../types";

export type RuntimeProviderId = "fake" | "openai";
export type FakeProviderMode = "SUCCESS" | "EMPTY" | "INVALID_JSON" | "INVALID_SHAPE" | "TIMEOUT" | "PROVIDER_ERROR";

export type ExecuteAiGenerationInput = {
  teacherId: string;
  generationId?: string;
  tool: string;
  title: string;
  configuration: Record<string, unknown>;
  provider?: RuntimeProviderId;
};

export type RuntimeStage = "STARTED" | "KNOWLEDGE_READY" | "PROMPT_READY" | "QUOTA_RESERVED" | "PROVIDER_STARTED" | "PROVIDER_COMPLETED" | "VALIDATION_PASSED" | "OUTPUT_PERSISTED" | "COMPLETED" | "FAILED";
export type RuntimeEvent = { stage: RuntimeStage; at: Date; startedAt: Date; durationMs: number; providerDurationMs?: number; generationId?: string; teacherId: string; tool: string; provider?: RuntimeProviderId; code?: import("./errors").RuntimeErrorCode };
export type RuntimeEventCallback = (event: RuntimeEvent) => void;
export type ExecuteAiGenerationOptions = { onEvent?: RuntimeEventCallback; fakeMode?: FakeProviderMode; providerInstance?: AiProvider };

export type ExecuteAiGenerationResult =
  | { ok: true; generationId: string; status: "COMPLETED"; quotaConsumed: true }
  | { ok: false; generationId?: string; code: import("./errors").RuntimeErrorCode; message: string; retryable: boolean };
