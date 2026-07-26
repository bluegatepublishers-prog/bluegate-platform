export type ContentEntitlementState = "ACTIVE" | "PAUSED" | "REVOKED" | "ARCHIVED";
export type ContentEntitlementAction = "pause" | "resume" | "revoke" | "restore" | "archive";

export const CONTENT_ENTITLEMENT_TRANSITIONS: Record<
  ContentEntitlementAction,
  { from: readonly ContentEntitlementState[]; to: ContentEntitlementState }
> = {
  pause: { from: ["ACTIVE"], to: "PAUSED" },
  resume: { from: ["PAUSED"], to: "ACTIVE" },
  revoke: { from: ["ACTIVE", "PAUSED"], to: "REVOKED" },
  restore: { from: ["REVOKED", "ARCHIVED"], to: "ACTIVE" },
  archive: { from: ["ACTIVE", "PAUSED", "REVOKED"], to: "ARCHIVED" },
};

export function evaluateContentEntitlementTransition(input: {
  current: ContentEntitlementState;
  action: ContentEntitlementAction;
  reason?: string;
}) {
  const transition = CONTENT_ENTITLEMENT_TRANSITIONS[input.action];
  if (!transition.from.includes(input.current)) {
    return { allowed: false as const, reason: "INVALID_STATE" as const };
  }
  if (input.action === "revoke" && !input.reason?.trim()) {
    return { allowed: false as const, reason: "REASON_REQUIRED" as const };
  }
  return { allowed: true as const, next: transition.to };
}

export function isOperationalContentEntitlement(status: ContentEntitlementState) {
  return status === "ACTIVE";
}
