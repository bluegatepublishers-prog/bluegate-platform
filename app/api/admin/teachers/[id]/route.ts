import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedDeniedAudit } from "@/lib/security-audit";

export async function PATCH() {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  await recordTrustedDeniedAudit({
    actor: publisherAdminAuditActor(actor),
    action: "publisher.teacher.status.set",
    targetType: "Teacher",
    reasonCode: "CROSS_TENANT_SCOPE",
    metadata: { scope: "publisher" },
  });
  return NextResponse.json(
    { message: "Publisher administrators cannot modify teacher accounts." },
    { status: 403 },
  );
}
