import assert from "node:assert/strict";
import test from "node:test";

import {
  challengeCanBeUsed,
  generateResetCompletionToken,
  generateSixDigitCode,
  hashSecurityValue,
  maskEmail,
  nextThrottle,
  resendDecision,
  SECURITY_CODE_MAX_ATTEMPTS,
  SECURITY_CODE_MAX_RESENDS,
  SECURITY_CODE_RESEND_COOLDOWN_MS,
  SECURITY_REQUEST_MAX_COUNT,
  securelyMatchesHash,
  validSixDigitCode,
} from "../lib/account-security-policy";

process.env.AUTH_SECRET ??= "test-only-account-security-pepper";

test("security codes are exactly six cryptographically generated numeric digits", () => {
  const codes = Array.from({ length: 100 }, generateSixDigitCode);
  assert.ok(codes.every(validSixDigitCode));
  assert.ok(new Set(codes).size > 1);
});

test("codes and reset authorizations are domain-separated hashes", () => {
  const reference = "opaque-reference";
  const value = "123456";
  const verification = hashSecurityValue("email-verification", reference, value);
  const reset = hashSecurityValue("password-reset", reference, value);
  assert.notEqual(verification, value);
  assert.notEqual(verification, reset);
  assert.ok(securelyMatchesHash(verification, hashSecurityValue("email-verification", reference, value)));
  assert.ok(!securelyMatchesHash(verification, hashSecurityValue("email-verification", reference, "654321")));
  const token = generateResetCompletionToken();
  assert.ok(token.length >= 40);
  assert.notEqual(hashSecurityValue("password-reset-completion", reference, token), token);
});

test("expired, consumed, revoked, and attempt-exhausted challenges fail closed", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");
  const base = { now, expiresAt: new Date(now.getTime() + 1), consumedAt: null, revokedAt: null, attemptCount: 0 };
  assert.equal(challengeCanBeUsed(base), true);
  assert.equal(challengeCanBeUsed({ ...base, expiresAt: now }), false);
  assert.equal(challengeCanBeUsed({ ...base, consumedAt: now }), false);
  assert.equal(challengeCanBeUsed({ ...base, revokedAt: now }), false);
  assert.equal(challengeCanBeUsed({ ...base, attemptCount: SECURITY_CODE_MAX_ATTEMPTS }), false);
});

test("resends enforce the server cooldown, replacement limit, and terminal states", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");
  const base = { now, expiresAt: new Date(now.getTime() + 60_000), consumedAt: null, revokedAt: null, resendCount: 0, lastSentAt: null };
  assert.equal(resendDecision(base), "ALLOW");
  assert.equal(resendDecision({ ...base, lastSentAt: new Date(now.getTime() - SECURITY_CODE_RESEND_COOLDOWN_MS + 1) }), "COOLDOWN");
  assert.equal(resendDecision({ ...base, resendCount: SECURITY_CODE_MAX_RESENDS }), "LIMIT");
  assert.equal(resendDecision({ ...base, consumedAt: now }), "UNAVAILABLE");
  assert.equal(resendDecision({ ...base, expiresAt: now }), "UNAVAILABLE");
});

test("database throttle policy is deterministic across windows and blocks excess requests", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");
  let state: ReturnType<typeof nextThrottle> | undefined;
  for (let index = 0; index <= SECURITY_REQUEST_MAX_COUNT; index += 1) {
    state = nextThrottle({ now, windowStartedAt: state?.windowStartedAt, requestCount: state?.requestCount, blockedUntil: state?.blockedUntil });
  }
  assert.equal(state?.allowed, false);
  assert.ok(state?.blockedUntil && state.blockedUntil > now);
});

test("email masking does not expose the full address", () => {
  const masked = maskEmail("learner@example.edu");
  assert.equal(masked, "l***@e***.edu");
  assert.ok(!masked.includes("learner"));
  assert.ok(!masked.includes("example"));
});
