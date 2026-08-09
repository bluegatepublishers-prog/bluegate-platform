import type { NarrationSegment } from "@/lib/content-narration";

export type NarrationGenerationRequest = {
  text: string;
  language: string;
  voice?: string;
  speed?: number;
  format?: "audio/mpeg" | "audio/ogg" | "audio/mp4";
  sourceHash: string;
};

export type NarrationAudioArtifact = {
  mimeType: "audio/mpeg" | "audio/ogg" | "audio/mp4";
  extension: "mp3" | "ogg" | "m4a";
  bytes: Uint8Array;
  sourceHash: string;
};

export interface NarrationProvider {
  readonly id: string;
  readonly version: string;
  generate(request: NarrationGenerationRequest): Promise<NarrationAudioArtifact>;
}

export type NarrationProviderConfiguration = {
  provider: NarrationProvider | null;
  reason?: string;
};

export function getNarrationProvider(): NarrationProviderConfiguration {
  return {
    provider: null,
    reason: "No production narration provider is configured.",
  };
}

export function createFakeNarrationProvider(
  generate: (request: NarrationGenerationRequest) => Promise<NarrationAudioArtifact> | NarrationAudioArtifact = (request) => ({
    mimeType: "audio/mpeg",
    extension: "mp3",
    bytes: new Uint8Array(),
    sourceHash: request.sourceHash,
  }),
): NarrationProvider {
  return {
    id: "fake",
    version: "v2-test",
    generate: async (request) => generate(request),
  };
}

export function narrationRequestForSegment(
  segment: Pick<NarrationSegment, "text" | "language" | "sourceHash">,
  settings: Pick<NarrationGenerationRequest, "voice" | "speed" | "format"> = {},
): NarrationGenerationRequest {
  return {
    text: segment.text,
    language: segment.language,
    sourceHash: segment.sourceHash,
    ...(settings.voice ? { voice: settings.voice } : {}),
    ...(settings.speed !== undefined ? { speed: settings.speed } : {}),
    ...(settings.format ? { format: settings.format } : {}),
  };
}