"use client";

import type { UploadScope } from "./types";
import { extensionOf, uploadRules } from "./upload-policy";

type UploadResult = {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
};

type ApiError = { ok?: false; message?: string };

export type StorageUploadTransport = "DIRECT" | "SAME_ORIGIN_PROXY";

export class StorageUploadError extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "StorageUploadError";
  }
}

const CANONICAL_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".zip": "application/zip", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".ico": "image/x-icon",
};

/** Browser File.type may be empty or generic; infer only from allowed extensions. */
export function resolveUploadContentType(fileName: string, fileType: string, scope: UploadScope): string | null {
  const rule = uploadRules[scope];
  const extension = extensionOf(fileName);
  if (!rule.extensions.includes(extension)) return null;
  const supplied = fileType.trim().toLowerCase();
  if (rule.contentTypes.includes(supplied)) return supplied;
  const inferred = CANONICAL_CONTENT_TYPES[extension];
  return inferred && rule.contentTypes.includes(inferred) ? inferred : null;
}

export async function uploadFileToR2(input: {
  file: File;
  scope: UploadScope;
  targetId?: string;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
  transport?: StorageUploadTransport;
  failurePrefix?: string;
}): Promise<UploadResult> {
  const { file, scope, targetId, onProgress, signal, transport = "DIRECT", failurePrefix = "UPLOAD" } = input;
  const contentType = resolveUploadContentType(file.name, file.type, scope);
  if (!contentType) throw new Error("The selected file has an unsupported extension or MIME type.");
  onProgress?.(5);

  const initResponse = await fetchStage("UPLOAD_INIT_FAILED", failurePrefix, "/api/storage/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
      targetId,
    }),
    signal,
  });
  const initialized = await readJson<{
    ok: true;
    uploadUrl: string;
    objectKey: string;
    requiredHeaders: Record<string, string>;
    uploadToken: string;
  }>(initResponse, "UPLOAD_INIT_FAILED", failurePrefix);
  onProgress?.(20);

  if (transport === "SAME_ORIGIN_PROXY") {
    const uploadResponse = await fetchStage("STORAGE_TRANSFER_FAILED", failurePrefix, "/api/storage/upload/proxy", {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "X-Upload-Scope": scope,
        "X-Upload-Object-Key": initialized.objectKey,
        "X-Upload-File-Name": encodeURIComponent(file.name),
        ...(targetId ? { "X-Upload-Target-Id": targetId } : {}),
        "X-Upload-Intent": initialized.uploadToken,
      },
      body: file,
      signal,
    });
    await readJson<{ ok: true }>(uploadResponse, "STORAGE_TRANSFER_FAILED", failurePrefix);
  } else {
    const uploadResponse = await fetchStage("STORAGE_TRANSFER_FAILED", failurePrefix, initialized.uploadUrl, {
      method: "PUT",
      headers: initialized.requiredHeaders,
      body: file,
      signal,
    });
    if (!uploadResponse.ok) throw stageError("STORAGE_TRANSFER_FAILED", failurePrefix, "Storage rejected the upload.");
  }
  onProgress?.(80);

  const completeResponse = await fetchStage("UPLOAD_COMPLETE_FAILED", failurePrefix, "/api/storage/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey: initialized.objectKey,
      scope,
      originalFileName: file.name,
      expectedContentType: contentType,
      expectedSizeBytes: file.size,
      targetId,
    }),
    signal,
  });
  const completed = await readJson<{ ok: true } & UploadResult>(completeResponse, "UPLOAD_COMPLETE_FAILED", failurePrefix);
  onProgress?.(100);
  return completed;
}

async function fetchStage(stage: string, prefix: string, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw stageError(stage, prefix, "Network request could not be completed.");
  }
}

async function readJson<T>(response: Response, stage: string, prefix: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & ApiError) | null;
  if (!response.ok || !body || body.ok === false) {
    throw stageError(stage, prefix, body?.message || "Storage request failed.");
  }
  return body;
}

function stageError(stage: string, prefix: string, detail: string) {
  return new StorageUploadError(`${prefix}_${stage}`, detail);
}
