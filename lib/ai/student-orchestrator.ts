import type { AiProvider, ProviderRequest } from "./types";
import type { StudentAiValidatedResponse } from "./student-policy";

export async function executeStudentAiProviderStep<T>(input: {
  request: ProviderRequest;
  provider: AiProvider;
  reserve: () => Promise<unknown>;
  validate: (content: string) =>
    | { ok: true; value: StudentAiValidatedResponse }
    | { ok: false };
  persistAndConsume: (response: StudentAiValidatedResponse) => Promise<T>;
  release: () => Promise<unknown>;
}) {
  let reserved = false;
  try {
    await input.reserve();
    reserved = true;
    const providerResponse = await input.provider.generate(input.request);
    const validation = input.validate(providerResponse.content);
    if (!validation.ok) throw new StudentAiOrchestrationError("RESPONSE_INVALID");
    const persisted = await input.persistAndConsume(validation.value);
    reserved = false;
    return { persisted, response: validation.value };
  } catch (error) {
    if (reserved) {
      try {
        await input.release();
      } catch {
        // Preserve the provider, validation, or persistence failure.
      }
    }
    throw error;
  }
}

export class StudentAiOrchestrationError extends Error {
  constructor(readonly code: "RESPONSE_INVALID") {
    super(code);
    this.name = "StudentAiOrchestrationError";
  }
}
