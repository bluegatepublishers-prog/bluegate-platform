export const RUNTIME_ERROR_CODES = ["INVALID_INPUT", "TEACHER_NOT_FOUND", "NOT_ENTITLED", "DAILY_LIMIT_REACHED", "KNOWLEDGE_PREPARATION_FAILED", "PROMPT_BUILD_FAILED", "PREPARATION_INVALID", "QUOTA_RESERVATION_FAILED", "PROVIDER_TIMEOUT", "PROVIDER_NETWORK_ERROR", "PROVIDER_ERROR", "RESPONSE_INVALID", "PERSISTENCE_FAILED", "UNKNOWN_ERROR"] as const;
export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[number];

const messages: Record<RuntimeErrorCode, string> = {
  INVALID_INPUT: "The generation request is invalid.", TEACHER_NOT_FOUND: "Teacher account was not found.", NOT_ENTITLED: "Premium AI access is required to generate content.", DAILY_LIMIT_REACHED: "You have used today’s AI generation allowance. It will reset at midnight IST.", KNOWLEDGE_PREPARATION_FAILED: "Approved book knowledge could not be prepared.", PROMPT_BUILD_FAILED: "The generation prompt could not be prepared.", PREPARATION_INVALID: "The generation setup is incomplete or invalid.", QUOTA_RESERVATION_FAILED: "Your AI allowance could not be reserved. Please try again.", PROVIDER_TIMEOUT: "Generation took too long. Please try again.", PROVIDER_NETWORK_ERROR: "The AI service could not be reached. Please try again.", PROVIDER_ERROR: "The AI service could not complete this generation.", RESPONSE_INVALID: "The generated content was not usable. Please try again.", PERSISTENCE_FAILED: "The generated content could not be saved. Please try again.", UNKNOWN_ERROR: "Generation could not be completed. Please try again."
};

export class RuntimeError extends Error {
  constructor(readonly code: RuntimeErrorCode, options?: { retryable?: boolean; cause?: unknown }) {
    super(messages[code], { cause: options?.cause });
    this.name = "RuntimeError";
    this.retryable = options?.retryable ?? ["QUOTA_RESERVATION_FAILED", "PROVIDER_TIMEOUT", "PROVIDER_NETWORK_ERROR", "PROVIDER_ERROR", "PERSISTENCE_FAILED", "UNKNOWN_ERROR"].includes(code);
  }
  readonly retryable: boolean;
}
