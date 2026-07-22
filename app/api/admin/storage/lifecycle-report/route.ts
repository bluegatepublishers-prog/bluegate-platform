import { NextResponse } from "next/server";
import { SecurityAuditOutcome } from "@prisma/client";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { getPublisherLifecycleReport } from "@/lib/storage/storage-lifecycle-runtime";
import { sanitizeLifecycleReport } from "@/lib/storage/lifecycle-reports";

export async function GET() {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const report = await getPublisherLifecycleReport(actor.publisherId);
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.report.export", targetType: "Storage", outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "lifecycle", fileCount: report.neverDownloaded.length + report.mostDownloaded.length } });
  return NextResponse.json(sanitizeLifecycleReport(report), { headers: { "Cache-Control": "private, no-store", "Content-Disposition": "attachment; filename=storage-lifecycle-report.json" } });
}
