import { isCredentialRolePublisherInvariantValid } from "./role-publisher-policy";

export type LivePublisherAdminRecord = {
  id: string;
  name: string;
  role: string;
  publisherId: string | null;
  publisher: { id: string; active: boolean; name?: string } | null;
};

export type TrustedPublisherAdminActor = {
  userId: string;
  publisherId: string;
  name: string;
  publisherName: string;
};

export function trustedPublisherAdminActor(
  sessionUserId: string | null | undefined,
  user: LivePublisherAdminRecord | null,
): TrustedPublisherAdminActor | null {
  if (!sessionUserId || !user || user.id !== sessionUserId) return null;
  if (user.role !== "ADMIN" || !user.publisherId) return null;
  if (!isCredentialRolePublisherInvariantValid({
    role: user.role,
    publisherId: user.publisherId,
    publisher: user.publisher,
    tenantOwnerPublisherId: user.publisherId,
  })) return null;

  return {
    userId: user.id,
    publisherId: user.publisherId,
    name: user.name,
    publisherName: user.publisher?.name ?? "",
  };
}

export async function loadTrustedPublisherAdminActor(
  sessionUserId: string | null | undefined,
  loadUser: (id: string) => Promise<LivePublisherAdminRecord | null>,
) {
  if (!sessionUserId) return null;
  return trustedPublisherAdminActor(sessionUserId, await loadUser(sessionUserId));
}

export function publisherScopedWhere<T extends Record<string, unknown>>(
  actor: TrustedPublisherAdminActor,
  where: T,
) {
  return { ...where, publisherId: actor.publisherId };
}

export function isPublisherOwnedRecord(
  actor: TrustedPublisherAdminActor,
  record: { publisherId: string | null } | null | undefined,
) {
  return Boolean(record?.publisherId && record.publisherId === actor.publisherId);
}

export function findPublisherOwnedRecord<T extends { id: string; publisherId: string | null }>(
  actor: TrustedPublisherAdminActor,
  records: readonly T[],
  id: string,
) {
  return records.find((record) => record.id === id && isPublisherOwnedRecord(actor, record)) ?? null;
}

export function listPublisherOwnedRecords<T extends { publisherId: string | null }>(
  actor: TrustedPublisherAdminActor,
  records: readonly T[],
) {
  return records.filter((record) => isPublisherOwnedRecord(actor, record));
}
