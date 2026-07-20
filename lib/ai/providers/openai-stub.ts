import type{AiProvider,ProviderRequest,ProviderResponse}from"../types";
export class OpenAiProviderStub implements AiProvider{name="openai-stub";async generate(request:ProviderRequest):Promise<ProviderResponse>{void request;throw new Error("OpenAI provider is not configured. External AI calls are disabled in Phase 6.3.")}}
