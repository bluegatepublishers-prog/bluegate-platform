import { NextResponse } from "next/server";
import { SecurityAuditOutcome } from "@prisma/client";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { migrateOne, planMigration } from "@/lib/storage/blob-migration";
import { createBlobMigrationDependencies } from "@/lib/storage/blob-migration-runtime";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";

export async function POST(request: Request) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const body = await request.json().catch(() => null) as { fileId?: unknown } | null;
  if (typeof body?.fileId !== "string") return NextResponse.json({ message: "A file ID is required." }, { status: 400 });
  const plan = planMigration((await scanStorageInventory(actor.publisherId)).filter(file => file.id === body.fileId));
  if (!plan[0]) return NextResponse.json({ message: "Blob file not found." }, { status: 404 });
  const result = await migrateOne(plan[0], createBlobMigrationDependencies());
  const succeeded = result.status === "MIGRATED" || result.status === "ALREADY_MIGRATED";
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.migration.retry", targetType: "Storage", outcome: succeeded ? SecurityAuditOutcome.SUCCESS : SecurityAuditOutcome.FAILURE, reasonCode: succeeded ? undefined : "UNEXPECTED_FAILURE", metadata: { scope: "publisher", verified: result.verified } });
  return NextResponse.json({ status: result.status, verified: result.verified }, { status: succeeded ? 200 : 409, headers: { "Cache-Control": "no-store" } });
}
