import { NextResponse } from "next/server";
import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";
import { proxyRemoteStorage } from "@/lib/storage/storage-delivery";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  const { resourceId } = await params;
  const result = await prepareProtectedResourceDownload({
    resourceId,
    allowedRoles: ["STUDENT"],
    disposition: "inline",
  });
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.status, headers: safeHeaders },
    );
  }
  if (result.legacy) return proxyLegacyBlob({ request, url: result.url, filename: result.filename, disposition: "inline" });
  return proxyRemoteStorage({ request, url: result.url, filename: result.filename, disposition: "inline", cacheControl: "private, no-store" });
}
