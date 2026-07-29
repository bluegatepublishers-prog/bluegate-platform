import { NextResponse } from "next/server";
import {
  PlatformFeatureKey,
  ResourceAudience,
  SecurityAuditOutcome,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import { validateResourceAudience } from "@/lib/resource-audience";

const ACTIONS = new Set(["publish", "unpublish", "archive", "restore", "audience"]);

export async function POST(request: Request) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  const action = typeof body?.action === "string" ? body.action : "";
  if (!ids.length || ids.length > 100 || !ACTIONS.has(action)) {
    return NextResponse.json(
      { message: "Select between 1 and 100 resources and a valid action." },
      { status: 400 },
    );
  }
  const audience =
    action === "audience" ? validateResourceAudience(body?.audience) : null;
  if (action === "audience" && !audience) {
    return NextResponse.json(
      { message: "Select a valid audience." },
      { status: 400 },
    );
  }

  const owned = await prisma.resource.findMany({
    where: { id: { in: ids }, publisherId: actor.publisherId },
    select: { id: true, archived: true },
  });
  if (owned.length !== ids.length) {
    return NextResponse.json({ message: "One or more resources were not found." }, { status: 404 });
  }
  if (
    (action === "publish" || action === "unpublish" || action === "audience") &&
    owned.some((resource) => resource.archived)
  ) {
    return NextResponse.json(
      { message: "Restore archived resources before updating them." },
      { status: 409 },
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.resource.updateMany({
      where: { id: { in: ids }, publisherId: actor.publisherId },
      data:
        action === "publish"
          ? { published: true, publishedAt: now }
          : action === "unpublish"
            ? { published: false, publishedAt: null }
            : action === "archive"
              ? { archived: true, archivedAt: now, published: false }
              : action === "restore"
                ? { archived: false, archivedAt: null }
                : { audience: audience as ResourceAudience },
    });
    for (const id of ids) {
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(actor),
        action: "publisher.resource.update",
        targetType: "Resource",
        targetId: id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          changedFields:
            action === "audience"
              ? ["audience"]
              : action === "archive" || action === "restore"
                ? ["archived", "publicationState"]
                : ["publicationState"],
          bulkOperation: action,
        },
      });
    }
  });

  return NextResponse.json({
    success: true,
    message: `${ids.length} resource${ids.length === 1 ? "" : "s"} updated.`,
  });
}
