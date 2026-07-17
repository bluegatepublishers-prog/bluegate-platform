import {
  hasAttachedTenantProfile,
  isRolePublisherInvariantValid,
  type TenantProfileFacts,
} from "./role-publisher-policy";

export type LivePlatformOwnerRecord = TenantProfileFacts & {
  id: string;
  name: string;
  role: string;
  publisherId: string | null;
  publisher: { id: string; active: boolean } | null;
};

export type TrustedPlatformOwnerActor = {
  id: string;
  name: string;
};

export function trustedPlatformOwnerActor(
  sessionUserId: string | null | undefined,
  user: LivePlatformOwnerRecord | null,
): TrustedPlatformOwnerActor | null {
  if (!sessionUserId || !user || user.id !== sessionUserId) return null;
  if (user.role !== "SUPER_ADMIN") return null;
  if (!isRolePublisherInvariantValid(user)) return null;
  if (hasAttachedTenantProfile(user)) return null;

  return { id: user.id, name: user.name };
}

export async function loadTrustedPlatformOwnerActor(
  sessionUserId: string | null | undefined,
  loadUser: (id: string) => Promise<LivePlatformOwnerRecord | null>,
) {
  if (!sessionUserId) return null;
  return trustedPlatformOwnerActor(sessionUserId, await loadUser(sessionUserId));
}
