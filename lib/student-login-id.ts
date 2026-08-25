import { randomInt } from "node:crypto";

const LOGIN_ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const STUDENT_LOGIN_ID_MAX_ATTEMPTS = 8;
const LOGIN_ID_PATTERN = /^bg-[a-z2-9]{4}-[a-z2-9]{4}$/;

export function normalizeStudentLoginId(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isCanonicalStudentLoginId(value: unknown) {
  return LOGIN_ID_PATTERN.test(normalizeStudentLoginId(value));
}

export function generateStudentLoginId() {
  const part = () => Array.from({ length: 4 }, () => LOGIN_ID_ALPHABET[randomInt(LOGIN_ID_ALPHABET.length)]).join("");
  return `bg-${part()}-${part()}`;
}

export async function generateUniqueStudentLoginId(
  isTaken: (loginId: string) => Promise<boolean>,
  maxAttempts = STUDENT_LOGIN_ID_MAX_ATTEMPTS,
) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 32) {
    throw new Error("Student login ID retry limit is invalid.");
  }
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const loginId = generateStudentLoginId();
    if (!await isTaken(loginId)) return loginId;
  }
  throw new Error("Could not allocate a unique student login ID.");
}
