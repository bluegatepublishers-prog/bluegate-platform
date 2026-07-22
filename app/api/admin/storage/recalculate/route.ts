import { NextResponse } from "next/server";
import { SecurityAuditOutcome } from "@prisma/client";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { calculateStorageStatistics } from "@/lib/storage/storage-records";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";

export async function POST() {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const statistics = calculateStorageStatistics(await scanStorageInventory(actor.publisherId));
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.statistics.recalculate", targetType: "Storage", outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "publisher", fileCount: statistics.totalFiles } });
  return NextResponse.json({ statistics }, { headers: { "Cache-Control": "no-store" } });
}
