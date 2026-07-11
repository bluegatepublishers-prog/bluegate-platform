import "server-only";

import type { AiProvider, ProviderRequest, ProviderResponse } from "../types";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT_MS = 60_000;

type OpenAiProviderConfig = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  endpoint?: string;
};

type OpenAiResponse = {
  id?: string;
  model?: string;
  status?: string;
  error?: { code?: string; message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly endpoint: string;

  constructor(config: OpenAiProviderConfig = {}) {
    this.apiKey = config.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
    this.model = config.model?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
    this.timeoutMs = validTimeout(config.timeoutMs ?? parseTimeout(process.env.OPENAI_TIMEOUT_MS));
    this.endpoint = config.endpoint?.trim() || RESPONSES_URL;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) throw new OpenAiProviderError("OpenAI is not configured on the server.", "not_configured");
    if (!request.systemPrompt.trim() || !request.userPrompt.trim()) throw new OpenAiProviderError("The provider request is empty.", "invalid_request");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          instructions: request.systemPrompt,
          input: request.userPrompt,
          text: { format: { type: "json_object" } },
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      const payload = await readPayload(response);
      if (!response.ok) {
        throw new OpenAiProviderError(
          safeApiMessage(payload, response.status),
          payload.error?.code || `http_${response.status}`,
          response.status
        );
      }
      if (payload.status && payload.status !== "completed") {
        throw new OpenAiProviderError("OpenAI did not complete the response.", `response_${payload.status}`);
      }

      const outputText = extractOutputText(payload);
      if (!outputText) throw new OpenAiProviderError("OpenAI returned no text output.", "empty_response");

      let structured: unknown;
      try {
        structured = JSON.parse(outputText);
      } catch {
        throw new OpenAiProviderError("OpenAI returned invalid JSON.", "invalid_json");
      }
      if (!isRecord(structured)) throw new OpenAiProviderError("OpenAI returned an unsupported JSON value.", "invalid_json_shape");

      return {
        provider: this.name,
        model: payload.model || this.model,
        content: JSON.stringify(structured),
        usage: payload.usage
          ? {
              inputTokens: finiteTokenCount(payload.usage.input_tokens),
              outputTokens: finiteTokenCount(payload.usage.output_tokens),
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof OpenAiProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenAiProviderError(`OpenAI request timed out after ${this.timeoutMs}ms.`, "timeout");
      }
      throw new OpenAiProviderError("Unable to reach OpenAI.", "network_error");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class OpenAiProviderError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = "OpenAiProviderError";
  }
}

async function readPayload(response: Response): Promise<OpenAiResponse> {
  try {
    const value: unknown = await response.json();
    return isRecord(value) ? (value as OpenAiResponse) : {};
  } catch {
    return {};
  }
}

function extractOutputText(payload: OpenAiResponse) {
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n") ?? "";
}

function safeApiMessage(payload: OpenAiResponse, status: number) {
  const message = payload.error?.message?.trim();
  return message && message.length <= 500 ? `OpenAI request failed: ${message}` : `OpenAI request failed with status ${status}.`;
}

function parseTimeout(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : DEFAULT_TIMEOUT_MS;
}

function validTimeout(value: number) {
  return Math.min(300_000, Math.max(1_000, Math.trunc(value)));
}

function finiteTokenCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
