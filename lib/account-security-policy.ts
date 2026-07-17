import { createHash, randomInt, randomBytes, timingSafeEqual } from "node:crypto";

export const SECURITY_CODE_TTL_MS = 10 * 60 * 1000;
export const SECURITY_CODE_MAX_ATTEMPTS = 5;
export const SECURITY_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const SECURITY_CODE_MAX_RESENDS = 3;
export const RESET_COMPLETION_TTL_MS = 10 * 60 * 1000;
export const SECURITY_REQUEST_WINDOW_MS = 15 * 60 * 1000;
export const SECURITY_REQUEST_MAX_COUNT = 5;

export function securityPepper() {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("Account security is temporarily unavailable.");
  return value;
}

export function generateSixDigitCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generateResetCompletionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSecurityValue(domain: string, reference: string, value: string) {
  return createHash("sha256")
    .update(`${domain}:${securityPepper()}:${reference}:${value}`)
    .digest("hex");
}

export function securelyMatchesHash(expected: string, actual: string) {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() ?? "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";
  return `${local.slice(0, 1) || "*"}***@${domainName.slice(0, 1) || "*"}***${suffix}`;
}

export function validSixDigitCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}

export function challengeCanBeUsed(input: {
  now: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  attemptCount: number;
}) {
  return !input.consumedAt && !input.revokedAt && input.expiresAt > input.now && input.attemptCount < SECURITY_CODE_MAX_ATTEMPTS;
}

export function resendDecision(input: {
  now: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  resendCount: number;
  lastSentAt: Date | null;
}) {
  if (input.consumedAt || input.revokedAt || input.expiresAt <= input.now) return "UNAVAILABLE" as const;
  if (input.resendCount >= SECURITY_CODE_MAX_RESENDS) return "LIMIT" as const;
  if (input.lastSentAt && input.now.getTime() - input.lastSentAt.getTime() < SECURITY_CODE_RESEND_COOLDOWN_MS) return "COOLDOWN" as const;
  return "ALLOW" as const;
}

export function nextThrottle(input: {
  now: Date;
  windowStartedAt?: Date;
  requestCount?: number;
  blockedUntil?: Date | null;
}) {
  if (input.blockedUntil && input.blockedUntil > input.now) {
    return { allowed: false, requestCount: input.requestCount ?? 0, windowStartedAt: input.windowStartedAt ?? input.now, blockedUntil: input.blockedUntil };
  }
  const reset = !input.windowStartedAt || input.now.getTime() - input.windowStartedAt.getTime() >= SECURITY_REQUEST_WINDOW_MS;
  const requestCount = reset ? 1 : (input.requestCount ?? 0) + 1;
  return {
    allowed: requestCount <= SECURITY_REQUEST_MAX_COUNT,
    requestCount,
    windowStartedAt: reset ? input.now : input.windowStartedAt!,
    blockedUntil: requestCount > SECURITY_REQUEST_MAX_COUNT ? new Date(input.now.getTime() + SECURITY_REQUEST_WINDOW_MS) : null,
  };
}
