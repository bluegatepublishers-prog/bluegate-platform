import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ParentRelationshipStatus, ParentRelationshipType, PlatformFeatureKey, Prisma, SecurityAuditOutcome, UserRole } from "@prisma/client";
import { parentPermissionsFor } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireSchool } from "@/lib/school-dashboard";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";
import { cleanText, normalizeActivationCode, normalizeEmail, validEmail, validatePassword } from "./onboarding-policy";

export class ParentOnboardingError extends Error {}
const unavailable = "We could not activate this invitation with the details provided.";

export function generateParentInvitationCode() { return randomBytes(6).toString("hex").toUpperCase().replace(/(.{4})(?=.)/g, "$1-"); }
export function parentInvitationHash(code: unknown) {
  const pepper = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!pepper) throw new ParentOnboardingError("Parent activation is temporarily unavailable.");
  return createHash("sha256").update(`parent-invitation:${pepper}:${normalizeActivationCode(code)}`).digest("hex");
}

export async function issueParentInvitation(input: Record<string, unknown>) {
  const school = await requireSchool();
  if (!school.publisherId) throw new ParentOnboardingError("Parent invitations are unavailable.");
  if (!await isPublisherFeatureEnabled(school.publisherId, PlatformFeatureKey.PARENT_PORTAL)) {
    throw new ParentOnboardingError("Parent invitations are not enabled for this school.");
  }
  const permissions = parentPermissionsFor(
    await prisma.schoolPortalPermission.findUnique({ where: { schoolId: school.id } }),
  );
  if (!permissions.parentActivationAllowed) {
    throw new ParentOnboardingError("Parent account activation is disabled by this school.");
  }
  const studentId = cleanText(input.studentId, 64), targetEmail = normalizeEmail(input.email), targetPhone = cleanText(input.phone, 30);
  const relationshipType = cleanText(input.relationshipType, 20) as ParentRelationshipType;
  if (!studentId || !validEmail(targetEmail) || !Object.values(ParentRelationshipType).includes(relationshipType)) throw new ParentOnboardingError("Enter a valid email and relationship type.");
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: school.id, active: true }, select: { id: true } });
  if (!student || !school.publisherId) throw new ParentOnboardingError("This student is unavailable.");
  const code = generateParentInvitationCode(), tokenHash = parentInvitationHash(code), now = new Date();
  await prisma.$transaction(async tx => {
    await tx.parentInvitation.updateMany({ where: { studentId, schoolId: school.id, targetEmail, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await tx.parentInvitation.create({ data: { studentId, schoolId: school.id, publisherId: school.publisherId!, relationshipType, primaryContact: input.primaryContact === "on", targetEmail, targetPhone: targetPhone || null, tokenHash, expiresAt: new Date(now.getTime() + 7 * 86400000), createdById: school.userId } });
  });
  return { code, expiresAt: new Date(now.getTime() + 7 * 86400000) };
}

export async function activateParentInvitation(input: Record<string, unknown>) {
  const code = normalizeActivationCode(input.invitationCode), name = cleanText(input.name, 120), email = normalizeEmail(input.email), phone = cleanText(input.phone, 30);
  const passwordError = validatePassword(input.password, input.confirmPassword);
  if (code.length !== 12 || !name || !validEmail(email) || passwordError) throw new ParentOnboardingError(passwordError ?? unavailable);
  const tokenHash = parentInvitationHash(code), password = await hashPassword(String(input.password)), now = new Date();
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`parent-invitation:${tokenHash}`}))`;
    const invitation = await tx.parentInvitation.findUnique({ where: { tokenHash }, include: { student: true, school: { include: { publisher: true } } } });
    if (!invitation || invitation.usedAt || invitation.revokedAt || invitation.expiresAt <= now || invitation.targetEmail !== email || !invitation.student.active || invitation.student.schoolId !== invitation.schoolId || invitation.school.status !== "APPROVED" || !invitation.school.publisher?.active) throw new ParentOnboardingError(unavailable);
    const feature = await tx.publisherFeature.findFirst({ where: { publisherId: invitation.publisherId, enabled: true, feature: { key: PlatformFeatureKey.PARENT_PORTAL, active: true, implemented: true } }, select: { id: true } });
    if (!feature) throw new ParentOnboardingError(unavailable);
    const permissions = parentPermissionsFor(await tx.schoolPortalPermission.findUnique({ where: { schoolId: invitation.schoolId } }));
    if (!permissions.parentActivationAllowed) throw new ParentOnboardingError("Parent account activation is disabled by this school.");
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new ParentOnboardingError("An account already uses this email. Ask the school to verify and link that account safely.");
    const user = await tx.user.create({ data: { name, email, phone: phone || null, password, role: "PARENT", publisherId: null } });
    const parent = await tx.parent.create({ data: { userId: user.id, phone: phone || null } });
    const relationship = await tx.parentStudentRelationship.create({ data: { parentId: parent.id, studentId: invitation.studentId, relationshipType: invitation.relationshipType, status: ParentRelationshipStatus.PENDING, activeKey: `${parent.id}:${invitation.studentId}`, primaryContact: invitation.primaryContact, canViewLearning: false } });
    await tx.parentInvitation.update({ where: { id: invitation.id }, data: { usedAt: now, usedByUserId: user.id, relationshipId: relationship.id } });
    return { email };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reviewParentRelationship(input: { relationshipId: string; decision: "APPROVE" | "REJECT" | "REVOKE"; reason?: string }) {
  const school = await requireSchool(); const now = new Date();
  const row = await prisma.parentStudentRelationship.findFirst({ where: { id: input.relationshipId, student: { schoolId: school.id } }, select: { id: true, status: true } });
  if (!row) throw new ParentOnboardingError("Relationship unavailable.");
  if (input.decision === "APPROVE" && row.status === "PENDING") return prisma.parentStudentRelationship.update({ where: { id: row.id }, data: { status: "APPROVED", approvedAt: now, approvedById: school.userId, canViewLearning: true, decisionReason: cleanText(input.reason, 300) || null } });
  if (input.decision === "REJECT" && row.status === "PENDING") return prisma.parentStudentRelationship.update({ where: { id: row.id }, data: { status: "REJECTED", rejectedAt: now, activeKey: null, decisionReason: cleanText(input.reason, 300) || null } });
  if (input.decision === "REVOKE" && row.status === "APPROVED") return prisma.parentStudentRelationship.update({ where: { id: row.id }, data: { status: "REVOKED", revokedAt: now, revokedById: school.userId, activeKey: null, canViewLearning: false, primaryContact: false, decisionReason: cleanText(input.reason, 300) || null } });
  throw new ParentOnboardingError("This relationship can no longer take that action.");
}

export async function setPrimaryParentRelationship(relationshipId: string) {
  const school = await requireSchool();
  const row = await prisma.parentStudentRelationship.findFirst({ where: { id: relationshipId, status: "APPROVED", student: { schoolId: school.id } }, select: { id: true, studentId: true } });
  if (!row) throw new ParentOnboardingError("Relationship unavailable.");
  await prisma.$transaction([prisma.parentStudentRelationship.updateMany({ where: { studentId: row.studentId, status: "APPROVED" }, data: { primaryContact: false } }), prisma.parentStudentRelationship.update({ where: { id: row.id }, data: { primaryContact: true } })]);
}

export async function setSchoolParentActive(relationshipId: string, active: boolean) {
  const school = await requireSchool();
  const relationship = await prisma.parentStudentRelationship.findFirst({
    where: { id: relationshipId, student: { schoolId: school.id } },
    include: { parent: { include: { user: { select: { id: true } } } } },
  });
  if (!relationship) throw new ParentOnboardingError("Relationship unavailable.");
  await prisma.$transaction(async (tx) => {
    await tx.parent.update({ where: { id: relationship.parentId }, data: { active } });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: active ? "school.parent.activate" : "school.parent.deactivate",
      targetType: "User",
      targetId: relationship.parent.userId,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { enabled: active, scope: "parent_account" },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
