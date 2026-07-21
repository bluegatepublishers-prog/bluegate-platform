import { uploadRules } from "@/lib/storage/upload-policy";

const RESOURCE_FILE_RULE = uploadRules["resource-file"];

export function parseResourceFileSizeBytes(value: unknown): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "bigint") return value > BigInt(0) ? value : null;

  const parsed =
    typeof value === "number"
      ? Math.trunc(value)
      : Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const asBigInt = BigInt(parsed);
  const max = BigInt(RESOURCE_FILE_RULE.maxSize);
  return asBigInt <= max ? asBigInt : null;
}

export function normalizeResourceMimeType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const mime = value.trim().toLowerCase();
  if (!mime) return null;
  return RESOURCE_FILE_RULE.contentTypes.includes(mime) ? mime : null;
}

export function normalizeOriginalFileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name.length > 255) return null;
  return name;
}

export function formatFileSizeBytes(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return "";

  const bytes = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(bytes) || bytes <= 0) return "";

  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let size = bytes;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  const fractionDigits = index === 0 ? 0 : 1;
  return `${size.toFixed(fractionDigits)} ${units[index]}`;
}

export function getResourceFileName(input: {
  originalFileName?: string | null;
  fileUrl: string;
}) {
  if (input.originalFileName?.trim()) return input.originalFileName.trim();

  try {
    const url = new URL(input.fileUrl);
    const name = url.pathname.split("/").pop();
    return name ? decodeURIComponent(name) : "Resource file";
  } catch {
    return "Resource file";
  }
}

export function toJsonSafeFileSize(value: bigint | null | undefined) {
  return value === null || value === undefined ? null : value.toString();
}
