import "server-only";
import type { AiProvider, ProviderRequest, ProviderResponse } from "../types";
import type { FakeProviderMode } from "./types";

export class FakeProviderError extends Error { constructor(readonly code: "timeout" | "provider_error") { super(code); this.name = "FakeProviderError"; } }

export class FakeAiProvider implements AiProvider {
  readonly name = "fake";
  constructor(private readonly mode: FakeProviderMode = "SUCCESS") {}
  async generate(_request: ProviderRequest): Promise<ProviderResponse> {
    if (this.mode === "TIMEOUT") throw new FakeProviderError("timeout");
    if (this.mode === "PROVIDER_ERROR") throw new FakeProviderError("provider_error");
    const studentRequest = _request.userPrompt.includes("STUDENT_LEARNING_TASK_JSON");
    const success = studentRequest
      ? { answer: "This is a grounded explanation from the approved chapter knowledge.", followUpPrompts: ["Would you like a shorter recap?"], refused: false, refusalReason: null }
      : { title: "Bluegate Sample Question Paper", instructions: ["Answer all questions."], sections: [{ name: "Section A", questionType: "Short Answer", questions: [{ text: "Write one key idea from the selected chapter.", marks: 1, answer: "A grounded response from the approved chapter.", explanation: null, sourceChapterId: "fake-chapter" }] }], totalMarks: 1, validationNotes: ["Deterministic fake-provider output."] };
    const content = this.mode === "EMPTY" ? "" : this.mode === "INVALID_JSON" ? "{invalid" : this.mode === "INVALID_SHAPE" ? JSON.stringify({ title: "Invalid draft" }) : JSON.stringify(success);
    return { provider: this.name, model: "deterministic-v1", content };
  }
}
