import "server-only";

import { NextResponse } from "next/server";

import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { isUploadScope, uploadRules } from "@/lib/storage/upload-policy";
import { authorizeUpload, isUploadIntentValid, keyBelongsToTenant } from "@/lib/storage/upload-service";

const json = (status: number, code: string, message: string) => NextResponse.json(
  { ok: false, code, message },
  { status, headers: { "Cache-Control": "no-store" } },
);

function readFileName(value: string | null) {
  if (!value) return null;
  try {
    const name = decodeURIComponent(value);
    return name && name.length <= 255 ? name : null;
  } catch {
    return null;
  }
}

export async function PUT(request: Request) {
  const scope = request.headers.get("x-upload-scope");
  const objectKey = request.headers.get("x-upload-object-key");
  const fileName = readFileName(request.headers.get("x-upload-file-name"));
  const targetId = request.headers.get("x-upload-target-id") || undefined;
  const uploadIntent = request.headers.get("x-upload-intent");
  const contentType = request.headers.get("content-type")?.trim().toLowerCase() ?? "";
  if (!scope || !isUploadScope(scope) || !objectKey || !fileName || !contentType) {
    return json(400, "INVALID_UPLOAD_PROXY_REQUEST", "A valid upload request is required.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > uploadRules[scope].maxSize) {
    return json(413, "UPLOAD_TOO_LARGE", "The file exceeds the allowed size.");
  }

  const body = new Uint8Array(await request.arrayBuffer());
  const authorization = await authorizeUpload(scope, body.byteLength, fileName, contentType, targetId);
  if (authorization.status !== "AUTHORIZED") {
    return json(authorization.status === "UNAUTHENTICATED" ? 401 : 403, "UPLOAD_NOT_AUTHORIZED", authorization.status === "UNAUTHENTICATED" ? "Authentication required." : "Access denied.");
  }

  let key: string;
  try {
    key = normalizeAndValidateObjectKey(objectKey);
  } catch {
    return json(400, "INVALID_OBJECT_KEY", "The upload key is invalid.");
  }
  if (!keyBelongsToTenant(key, authorization.tenantId, scope)) {
    return json(403, "UPLOAD_NOT_AUTHORIZED", "Access denied.");
  }
  if (!isUploadIntentValid({ token: uploadIntent, objectKey: key, authorization })) {
    return json(409, "UPLOAD_KEY_NOT_ISSUED", "The upload key is no longer valid. Start a new upload.");
  }

  try {
    if (await getStorageProvider().headObject({ key })) {
      return json(409, "UPLOAD_KEY_ALREADY_EXISTS", "The upload key is already in use. Start a new upload.");
    }
    await getStorageProvider().putObject({
      key,
      contentType,
      body,
      customMetadata: {
        "original-filename": encodeURIComponent(fileName),
        "upload-scope": scope,
        ...(authorization.userId ? { "uploader-user-id": authorization.userId } : {}),
        ...(authorization.targetId ? { "target-id": authorization.targetId } : {}),
      },
    });
    return NextResponse.json({ ok: true, objectKey: key }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json(502, "STORAGE_TRANSFER_FAILED", "The storage transfer could not be completed.");
  }
}
