import { NextResponse } from "next/server";
import { SecurityAuditOutcome } from "@prisma/client";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { inspectPublisherStorageHealth } from "@/lib/storage/storage-health-runtime";

export async function POST() {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const report = await inspectPublisherStorageHealth(actor.publisherId);
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.health.verify", targetType: "Storage", outcome: report.healthy ? SecurityAuditOutcome.SUCCESS : SecurityAuditOutcome.FAILURE, reasonCode: report.healthy ? undefined : "INVALID_STATE", metadata: { scope: "publisher", verified: report.healthy } });
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
