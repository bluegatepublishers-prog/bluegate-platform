import { NextResponse } from "next/server";
import { SecurityAuditOutcome } from "@prisma/client";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { publisherAdminAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { getStorageProvider } from "@/lib/storage/provider";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const { fileId } = await params;
  const file = (await scanStorageInventory(actor.publisherId)).find(item => item.id === fileId);
  if (!file || (file.provider !== "R2" && file.provider !== "BLOB")) return NextResponse.json({ message: "File not found." }, { status: 404 });
  let url = file.value;
  if (file.provider === "BLOB") {
    await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.download", targetType: file.entityType, targetId: file.entityId, outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "admin", fileOperation: "download" } });
    return proxyLegacyBlob({ url: file.value, filename: file.filename });
  }
  if (file.provider === "R2") {
    const provider = getStorageProvider();
    if (!(await provider.headObject({ key: file.value }))) return NextResponse.json({ message: "File not found." }, { status: 404 });
    url = (await provider.createSignedDownloadUrl({ key: file.value, expiresInSeconds: 60, downloadFilename: file.filename })).url;
  }
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.download", targetType: file.entityType, targetId: file.entityId, outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "admin", fileOperation: "download" } });
  return NextResponse.redirect(url, { status: 307, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
