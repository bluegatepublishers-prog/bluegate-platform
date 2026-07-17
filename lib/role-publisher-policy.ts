export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "TEACHER",
  "SCHOOL",
  "STUDENT",
  "MENTOR",
  "PARENT",
] as const;

export type UserRoleName = (typeof USER_ROLES)[number];

const PUBLISHER_BOUND_ROLES = new Set<UserRoleName>([
  "ADMIN",
  "TEACHER",
  "SCHOOL",
  "STUDENT",
  "MENTOR",
]);

export type RolePublisherFacts = {
  role: string;
  publisherId: string | null;
  publisher: { id: string; active: boolean } | null;
};

export type CredentialRolePublisherFacts = RolePublisherFacts & {
  tenantOwnerPublisherId: string | null;
};

export function isUserRoleName(value: string): value is UserRoleName {
  return USER_ROLES.includes(value as UserRoleName);
}

export function roleRequiresPublisher(role: UserRoleName) {
  return PUBLISHER_BOUND_ROLES.has(role);
}

export function isRolePublisherInvariantValid(
  facts: RolePublisherFacts,
  options: { requireActivePublisher?: boolean } = {},
) {
  if (!isUserRoleName(facts.role)) return false;

  if (!roleRequiresPublisher(facts.role)) {
    return facts.publisherId === null;
  }

  if (
    !facts.publisherId ||
    !facts.publisher ||
    facts.publisher.id !== facts.publisherId
  ) {
    return false;
  }

  return !options.requireActivePublisher || facts.publisher.active;
}

export function isCredentialRolePublisherInvariantValid(
  facts: CredentialRolePublisherFacts,
) {
  if (!isRolePublisherInvariantValid(facts, { requireActivePublisher: true })) {
    return false;
  }

  if (!isUserRoleName(facts.role) || !roleRequiresPublisher(facts.role)) {
    return true;
  }

  return facts.tenantOwnerPublisherId === facts.publisherId;
}

export type TenantProfileFacts = {
  school: unknown | null;
  teacher: unknown | null;
  student: unknown | null;
  mentor: unknown | null;
  parent: unknown | null;
};

export function hasAttachedTenantProfile(profiles: TenantProfileFacts) {
  return [
    profiles.school,
    profiles.teacher,
    profiles.student,
    profiles.mentor,
    profiles.parent,
  ].some((profile) => profile !== null);
}
