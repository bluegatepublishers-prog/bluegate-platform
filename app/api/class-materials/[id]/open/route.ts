import { SecurityAuditOutcome, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { prisma } from "@/lib/prisma";
import { accountAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { loadStudentIdentity } from "@/lib/student-identity";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey, sanitizeFilenameForHeader } from "@/lib/storage/object-key";
import { keyBelongsToTenant } from "@/lib/storage/upload-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user;
  const { id } = await context.params;
  if (!user?.id || !user.role || !/^[a-zA-Z0-9_-]{16,80}$/.test(id)) {
    return NextResponse.json({ message: "Material unavailable." }, { status: 404 });
  }
  const liveUser = {
    id: user.id,
    role: user.role,
    publisherId: user.publisherId,
    schoolId: user.schoolId,
    studentId: user.studentId,
    academicYearId: user.academicYearId,
  };
  const material = await prisma.classMaterial.findFirst({
    where: { id, archivedAt: null },
    include: {
      resource: { select: { id: true } },
      aiGeneration: { select: { output: true, status: true, quotaConsumed: true } },
    },
  });
  if (!material || !(await canOpen(liveUser, material))) {
    await audit(liveUser, SecurityAuditOutcome.DENIED);
    return NextResponse.json({ message: "Material unavailable." }, { status: 404 });
  }

  if (material.resourceId) {
    const result = await prepareProtectedResourceDownload({
      resourceId: material.resourceId,
      allowedRoles: [UserRole.TEACHER, UserRole.STUDENT],
      disposition: "inline",
    });
    if (!result.ok) return NextResponse.json({ message: "Material unavailable." }, { status: result.status });
    return NextResponse.redirect(result.url);
  }
  if (material.aiGeneration?.status === "COMPLETED" && material.aiGeneration.quotaConsumed && material.aiGeneration.output) {
    await audit(liveUser, SecurityAuditOutcome.SUCCESS, material.id);
    return new NextResponse(material.aiGeneration.output, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${sanitizeFilenameForHeader(material.title)}.json"`,
      },
    });
  }
  if (material.externalUrl) {
    try {
      const target = new URL(material.externalUrl);
      if (target.protocol !== "https:") throw new Error();
      await audit(liveUser, SecurityAuditOutcome.SUCCESS, material.id);
      return NextResponse.redirect(target);
    } catch {
      return NextResponse.json({ message: "Material unavailable." }, { status: 404 });
    }
  }
  if (!material.fileUrl || !material.publisherId) {
    return NextResponse.json({ message: "Material unavailable." }, { status: 404 });
  }
  let key: string;
  try {
    key = normalizeAndValidateObjectKey(material.fileUrl);
  } catch {
    return NextResponse.json({ message: "Material unavailable." }, { status: 409 });
  }
  if (!keyBelongsToTenant(key, material.publisherId, "class-material")) {
    return NextResponse.json({ message: "Material unavailable." }, { status: 409 });
  }
  const provider = getStorageProvider();
  if (!(await provider.headObject({ key }))) {
    return NextResponse.json({ message: "Material unavailable." }, { status: 404 });
  }
  const signed = await provider.createSignedDownloadUrl({
    key,
    expiresInSeconds: 60,
    downloadFilename: material.originalFileName ?? material.title,
    disposition: "inline",
  });
  await audit(liveUser, SecurityAuditOutcome.SUCCESS, material.id);
  return NextResponse.redirect(signed.url);
}

async function canOpen(
  user: { id: string; role?: string; publisherId?: string; schoolId?: string; studentId?: string; academicYearId?: string },
  material: {
    teacherId: string;
    publisherId: string;
    schoolId: string;
    academicYearId: string;
    schoolClassId: string;
    sectionId: string;
    sectionSubjectId: string;
    status: string;
    scheduledAt: Date | null;
  },
) {
  if (user.role === "TEACHER") {
    return Boolean(await prisma.teacher.findFirst({
      where: {
        userId: user.id,
        id: material.teacherId,
        active: true,
        status: "APPROVED",
        school: { id: material.schoolId, publisherId: material.publisherId, status: "APPROVED", publisher: { active: true } },
        assignments: {
          some: {
            schoolId: material.schoolId,
            academicYearId: material.academicYearId,
            schoolClassId: material.schoolClassId,
            sectionId: material.sectionId,
            active: true,
          },
        },
      },
      select: { id: true },
    }));
  }
  if (user.role !== "STUDENT") return false;
  const identity = await loadStudentIdentity(user.id, user.role, user.publisherId);
  if (!identity.ok) return false;
  const visible = material.status === "SHARED" ||
    (material.status === "SCHEDULED" && material.scheduledAt !== null && material.scheduledAt <= new Date());
  if (
    !visible ||
    identity.value.publisher.id !== material.publisherId ||
    identity.value.school.id !== material.schoolId ||
    identity.value.academicYear.id !== material.academicYearId ||
    identity.value.enrollment.schoolClassId !== material.schoolClassId ||
    identity.value.enrollment.sectionId !== material.sectionId
  ) return false;
  return Boolean(await prisma.sectionSubject.findFirst({
    where: { id: material.sectionSubjectId, sectionId: material.sectionId, active: true },
    select: { id: true },
  }));
}

async function audit(
  user: { id: string; role?: string; publisherId?: string },
  outcome: SecurityAuditOutcome,
  targetId?: string,
) {
  if (!Object.values(UserRole).includes(user.role as UserRole)) return;
  await recordTrustedAuditBestEffort({
    actor: accountAuditActor({ id: user.id, role: user.role as UserRole, publisherId: user.publisherId ?? null }),
    action: "classroom.material.open",
    targetType: "ClassMaterial",
    targetId,
    outcome,
    reasonCode: outcome === SecurityAuditOutcome.DENIED ? "TARGET_NOT_FOUND" : undefined,
    metadata: { scope: "classroom", fileOperation: "open" },
  });
}
