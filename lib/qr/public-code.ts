import { randomBytes } from "node:crypto";

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const QR_PUBLIC_CODE_LENGTH = 20;
export const QR_PUBLIC_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{20}$/;

export function generateQrPublicCode() {
  const entropy = randomBytes(QR_PUBLIC_CODE_LENGTH);
  let code = "";

  for (const byte of entropy) {
    code += CROCKFORD_ALPHABET[byte & 31];
  }

  return code;
}

export function normalizeQrPublicCode(value: string) {
  const normalized = value.trim().toUpperCase();
  return QR_PUBLIC_CODE_PATTERN.test(normalized) ? normalized : null;
}
