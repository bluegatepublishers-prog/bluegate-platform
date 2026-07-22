import { NextResponse } from "next/server";
import { SecurityAuditOutcome } from "@prisma/client";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { calculateStorageStatistics } from "@/lib/storage/storage-records";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";

export async function GET() {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const files = await scanStorageInventory(actor.publisherId);
  const report = { generatedAt: new Date().toISOString(), publisherId: actor.publisherId, statistics: calculateStorageStatistics(files), files: files.map(file => ({ ...file, value: file.provider === "R2" ? file.value : undefined, createdAt: file.createdAt.toISOString() })) };
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.report.export", targetType: "Storage", outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "publisher", fileCount: files.length } });
  return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": "attachment; filename=storage-report.json" } });
}
