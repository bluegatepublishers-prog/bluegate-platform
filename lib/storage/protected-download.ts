import "server-only";

import {
  BookAdoptionStatus,
  SecurityAuditOutcome,
  UserRole,
} from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  requireSchoolResourceEntitlementAccess,
  requireTeacherResourceEntitlementAccess,
  resolveResourceEntitlementForAuthenticatedUser,
} from "@/lib/entitlements/resource";
import { loadStudentIdentity } from "@/lib/student-identity";
import {
  accountAuditActor,
  recordTrustedAuditBestEffort,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import { getStorageProvider } from "./provider";
import {
  prepareProtectedResourceDownloadWithDependencies,
  type AuthorizedProtectedResource,
  type LiveDownloadUser,
  type ProtectedDownloadDependencies,
  type ProtectedDownloadResource,
  type ProtectedDownloadRole,
} from "./protected-download-policy";

const DOWNLOAD_EXPIRY_SECONDS = 60;

export type {
  AuthorizedProtectedResource,
  LiveDownloadUser,
  ProtectedDownloadAuditInput,
  ProtectedDownloadDependencies,
  ProtectedDownloadResource,
  ProtectedDownloadResult,
  ProtectedDownloadRole,
} from "./protected-download-policy";
export { resolveProtectedStorageTarget } from "./protected-download-policy";

export function prepareProtectedResourceDownload(input: {
  resourceId: string;
  allowedRoles: readonly ProtectedDownloadRole[];
  disposition?: "attachment" | "inline";
}) {
  return prepareProtectedResourceDownloadWithDependencies(input, defaultDependencies);
}

async function findLiveDownloadUser(userId: string): Promise<LiveDownloadUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      active: true,
      publisherId: true,
      emailVerifiedAt: true,
      publisher: { select: { active: true } },
      teacher: {
        select: {
          active: true,
          status: true,
          school: {
            select: {
              status: true,
              publisherId: true,
              publisher: { select: { active: true } },
            },
          },
        },
      },
      school: {
        select: {
          status: true,
          publisherId: true,
          publisher: { select: { active: true } },
        },
      },
      student: {
        select: {
          active: true,
          school: {
            select: {
              status: true,
              publisherId: true,
              publisher: { select: { active: true } },
            },
          },
        },
      },
    },
  });
  if (!user) return null;

  if (user.role === UserRole.ADMIN) {
    return { id: user.id, role: user.role, active: user.active, eligible: Boolean(user.publisherId && user.publisher?.active), publisherId: user.publisherId };
  }
  if (user.role === UserRole.TEACHER) {
    return {
      id: user.id,
      role: user.role,
      active: user.active,
      eligible: Boolean(user.emailVerifiedAt && user.teacher?.active && user.teacher.status === "APPROVED" && user.teacher.school?.status === "APPROVED" && user.teacher.school.publisher?.active),
      publisherId: user.teacher?.school?.publisherId ?? null,
    };
  }
  if (user.role === UserRole.SCHOOL) {
    return {
      id: user.id,
      role: user.role,
      active: user.active,
      eligible: Boolean(user.emailVerifiedAt && user.school?.status === "APPROVED" && user.school.publisher?.active),
      publisherId: user.school?.publisherId ?? null,
    };
  }
  if (user.role === UserRole.STUDENT) {
    return {
      id: user.id,
      role: user.role,
      active: user.active,
      eligible: Boolean(user.student?.active && user.student.school.status === "APPROVED" && user.student.school.publisher?.active),
      publisherId: user.student?.school.publisherId ?? null,
    };
  }
  return { id: user.id, role: user.role, active: user.active, eligible: false, publisherId: user.publisherId };
}

function protectedResource(resource: {
  id: string;
  publisherId: string | null;
  title: string;
  fileUrl: string;
  published: boolean;
  originalFileName?: string | null;
}): ProtectedDownloadResource {
  return resource;
}

async function authorizeProtectedResource(
  user: LiveDownloadUser,
  resourceId: string,
): Promise<AuthorizedProtectedResource | null> {
  if (user.role === UserRole.TEACHER) {
    const access = await requireTeacherResourceEntitlementAccess(user.id, resourceId);
    return access ? { resource: protectedResource(access.resource), history: { kind: "TEACHER", actorId: access.teacher.id } } : null;
  }
  if (user.role === UserRole.SCHOOL) {
    const access = await requireSchoolResourceEntitlementAccess(user.id, resourceId);
    return access ? { resource: protectedResource(access.resource) } : null;
  }
  if (user.role === UserRole.ADMIN) {
    const resolution = await resolveResourceEntitlementForAuthenticatedUser({ id: user.id, role: UserRole.ADMIN }, { resourceId });
    return resolution.decision.allowed && resolution.resource ? { resource: protectedResource(resolution.resource) } : null;
  }
  if (user.role === UserRole.STUDENT) {
    const identity = await loadStudentIdentity(user.id, user.role, user.publisherId);
    if (!identity.ok) return null;
    const sectionSubject = await prisma.sectionSubject.findFirst({
      where: {
        sectionId: identity.value.enrollment.sectionId,
        active: true,
        resources: { some: { id: resourceId } },
        bookAdoptions: {
          some: {
            schoolId: identity.value.school.id,
            publisherId: identity.value.publisher.id,
            academicYearId: identity.value.enrollment.academicYearId,
            sectionId: identity.value.enrollment.sectionId,
            status: BookAdoptionStatus.APPROVED,
            active: true,
          },
        },
      },
      select: { id: true },
    });
    if (!sectionSubject) return null;
    const resolution = await resolveResourceEntitlementForAuthenticatedUser(
      { id: user.id, role: UserRole.STUDENT },
      {
        resourceId,
        academicYearId: identity.value.enrollment.academicYearId,
        sectionId: identity.value.enrollment.sectionId,
        sectionSubjectId: sectionSubject.id,
      },
    );
    return resolution.decision.allowed && resolution.resource
      ? { resource: protectedResource(resolution.resource), history: { kind: "STUDENT", actorId: identity.value.student.id } }
      : null;
  }
  return null;
}

const defaultDependencies: ProtectedDownloadDependencies = {
  async getSessionUser() {
    return (await auth())?.user ?? null;
  },
  findLiveUser: findLiveDownloadUser,
  authorizeResource: authorizeProtectedResource,
  async headObject(key) {
    return Boolean(await getStorageProvider().headObject({ key }));
  },
  async signObject({ key, filename, disposition }) {
    const result = await getStorageProvider().createSignedDownloadUrl({ key, expiresInSeconds: DOWNLOAD_EXPIRY_SECONDS, downloadFilename: filename, disposition });
    return { url: result.url, expiresAt: result.expires.toISOString() };
  },
  async persistSuccess({ actor, resource, history, scope }) {
    await prisma.$transaction(async (tx) => {
      if (history?.kind === "TEACHER") {
        await tx.download.create({ data: { teacherId: history.actorId, resourceId: resource.id } });
      } else if (history?.kind === "STUDENT") {
        await tx.studentResourceDownload.create({ data: { studentId: history.actorId, resourceId: resource.id } });
      }
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: actor.id, role: actor.role, publisherId: actor.publisherId }),
        action: "storage.download",
        targetType: "Resource",
        targetId: resource.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { scope, fileOperation: "download" },
      });
    });
  },
  async recordAudit({ actor, outcome, reasonCode, scope }) {
    await recordTrustedAuditBestEffort({
      actor: accountAuditActor({ id: actor.id, role: actor.role, publisherId: actor.publisherId }),
      action: "storage.download",
      targetType: "Resource",
      outcome: outcome === "DENIED" ? SecurityAuditOutcome.DENIED : SecurityAuditOutcome.FAILURE,
      reasonCode,
      metadata: { scope, fileOperation: "download" },
    });
  },
  async recordRetry({ actor, scope, attempt }) {
    await recordTrustedAuditBestEffort({
      actor: accountAuditActor({ id: actor.id, role: actor.role, publisherId: actor.publisherId }),
      action: "storage.download.retry",
      targetType: "Storage",
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope, fileOperation: "download", attempt },
    });
  },
};
