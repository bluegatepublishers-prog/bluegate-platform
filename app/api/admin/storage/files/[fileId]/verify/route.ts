import { NextResponse } from "next/server";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { verifyPublisherStorageFile } from "@/lib/storage/storage-lifecycle-runtime";

export async function POST(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const { fileId } = await params;
  const verification = await verifyPublisherStorageFile(actor, fileId);
  if (!verification) return NextResponse.json({ message: "File not found." }, { status: 404 });
  return NextResponse.json({ exists: verification.result.exists, verified: verification.result.verified, provider: verification.file.provider, sizeBytes: verification.result.metadata?.contentLength ?? verification.file.sizeBytes, mimeType: verification.result.metadata?.contentType ?? verification.file.mimeType, mismatches: verification.result.mismatches }, { status: verification.result.exists ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}
