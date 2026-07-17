import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { SecurityAuditOutcome } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedDeniedAudit, writeSecurityAuditEvent } from "@/lib/security-audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { message: "Database configuration is not available." },
      { status: 500 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  if (typeof body.verified !== "boolean") {
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 }
    );
  }

  try {
    const teacher = await prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.updateMany({
        where: { id, school: { publisherId: actor.publisherId } },
        data: { verified: body.verified },
      });
      if (updated.count !== 1) return null;
      const record = await tx.teacher.findFirst({ where: { id, school: { publisherId: actor.publisherId } } });
      if (!record) return null;
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor), action: "publisher.teacher.status.set",
        targetType: "Teacher", targetId: id, outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { verified: body.verified },
      });
      return record;
    });
    if (!teacher) {
      await recordTrustedDeniedAudit({ actor: publisherAdminAuditActor(actor), action: "publisher.teacher.status.set", targetType: "Teacher", reasonCode: "CROSS_TENANT_SCOPE", metadata: { scope: "publisher" } });
      return publisherAdminNotFound();
    }

    revalidatePath("/admin/teachers");
    revalidatePath(`/admin/teachers/${id}`);

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Teacher verification update failed:", error);

    return NextResponse.json(
      { message: "Unable to update teacher verification." },
      { status: 500 }
    );
  }
}
