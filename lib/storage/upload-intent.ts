import "server-only";

import { hashSecurityValue, securelyMatchesHash } from "@/lib/account-security-policy";
import type { UploadScope } from "./types";

const UPLOAD_INTENT_TTL_MS = 10 * 60 * 1000;

type UploadIntentPayload = {
  objectKey: string;
  tenantId: string;
  scope: UploadScope;
  targetId?: string;
  userId: string;
  expiresAt: number;
};

export function createUploadIntent(input: Omit<UploadIntentPayload, "expiresAt">) {
  const payload: UploadIntentPayload = { ...input, expiresAt: Date.now() + UPLOAD_INTENT_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${hashSecurityValue("storage-upload-intent", body, body)}`;
}

export function verifyUploadIntent(token: unknown, expected: Omit<UploadIntentPayload, "expiresAt">) {
  if (typeof token !== "string") return false;
  const [body, signature] = token.split(".");
  if (!body || !signature || !securelyMatchesHash(hashSecurityValue("storage-upload-intent", body, body), signature)) return false;
  let payload: UploadIntentPayload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UploadIntentPayload; } catch { return false; }
  return payload.objectKey === expected.objectKey &&
    payload.tenantId === expected.tenantId &&
    payload.scope === expected.scope &&
    payload.targetId === expected.targetId &&
    payload.userId === expected.userId &&
    Number.isInteger(payload.expiresAt) && payload.expiresAt > Date.now();
}
