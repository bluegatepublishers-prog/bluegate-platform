import { classifyStorageValue } from "./storage-records";

export function publisherBrandingPath(publisherId: string, kind: "logo" | "favicon", value: string | null | undefined) {
  if (!value) return null;
  return ["R2", "BLOB"].includes(classifyStorageValue(value)) ? `/api/publishers/${encodeURIComponent(publisherId)}/branding/${kind}` : value;
}

export function schoolLogoPath(value: string | null | undefined) {
  if (!value) return null;
  return ["R2", "BLOB"].includes(classifyStorageValue(value)) ? "/api/school/logo" : value;
}
