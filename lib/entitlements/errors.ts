export const SAFE_ENTITLEMENT_MESSAGES = {
  book: "This book is not available for your account.",
  resource: "This learning resource is not available for your account.",
  premium: "This feature requires premium access.",
  feature: "This feature is not available on your platform.",
} as const;

export type EntitlementCapability = keyof typeof SAFE_ENTITLEMENT_MESSAGES;

export class SafeEntitlementError extends Error {
  constructor(capability: EntitlementCapability) {
    super(SAFE_ENTITLEMENT_MESSAGES[capability]);
    this.name = "SafeEntitlementError";
  }
}
