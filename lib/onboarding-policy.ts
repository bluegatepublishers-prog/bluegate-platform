export type OnboardingState = { ok: boolean; message: string };

export const INITIAL_ONBOARDING_STATE: OnboardingState = { ok: false, message: "" };

export function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function normalizeEmail(value: unknown) { return cleanText(value, 254).toLowerCase(); }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export function normalizeActivationCode(value: unknown) { return cleanText(value, 32).toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export function normalizeAdmissionNumber(value: unknown) { return cleanText(value, 80).toUpperCase(); }

export function validatePassword(password: unknown, confirmation: unknown) {
  if (typeof password !== "string" || typeof confirmation !== "string") return "Enter and confirm your password.";
  if (password.length < 10 || password.length > 128) return "Use a password between 10 and 128 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}

export function sameCalendarDate(left: Date, value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && left.toISOString().slice(0, 10) === value;
}
