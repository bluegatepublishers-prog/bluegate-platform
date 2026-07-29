"use client";

import type { UploadScope } from "./types";

type UploadResult = {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
};

type ApiError = { ok?: false; message?: string };

export async function uploadFileToR2(input: {
  file: File;
  scope: UploadScope;
  targetId?: string;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
}): Promise<UploadResult> {
  const { file, scope, targetId, onProgress, signal } = input;
  onProgress?.(5);

  const initResponse = await fetch("/api/storage/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      fileName: file.name,
      contentType: file.type,
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
  }>(initResponse);
  onProgress?.(20);

  const uploadResponse = await fetch(initialized.uploadUrl, {
    method: "PUT",
    headers: initialized.requiredHeaders,
    body: file,
    signal,
  });
  if (!uploadResponse.ok) throw new Error("R2 upload failed.");
  onProgress?.(80);

  const completeResponse = await fetch("/api/storage/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey: initialized.objectKey,
      scope,
      originalFileName: file.name,
      expectedContentType: file.type,
      expectedSizeBytes: file.size,
      targetId,
    }),
    signal,
  });
  const completed = await readJson<{ ok: true } & UploadResult>(completeResponse);
  onProgress?.(100);
  return completed;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & ApiError) | null;
  if (!response.ok || !body || body.ok === false) {
    throw new Error(body?.message || "Storage request failed.");
  }
  return body;
}
