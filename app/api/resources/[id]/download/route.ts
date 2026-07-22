import { NextResponse } from "next/server";
import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";
import { proxyRemoteStorage } from "@/lib/storage/storage-delivery";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

async function prepare(
  id: string,
  disposition: "attachment" | "inline",
) {
  return prepareProtectedResourceDownload({
    resourceId: id,
    allowedRoles: ["TEACHER", "ADMIN"],
    disposition,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const disposition = new URL(request.url).searchParams.get("disposition") === "attachment" ? "attachment" : "inline";
  const result = await prepare(id, disposition);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.status, headers: safeHeaders },
    );
  }
  if (result.legacy) return proxyLegacyBlob({ request, url: result.url, filename: result.filename, disposition });
  return proxyRemoteStorage({ request, url: result.url, filename: result.filename, disposition, cacheControl: "private, no-store" });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await prepare(id, "attachment");
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.status, headers: safeHeaders },
    );
  }
  return NextResponse.json(
    { url: `/api/resources/${encodeURIComponent(id)}/download?disposition=attachment`, expiresAt: result.expiresAt },
    { headers: safeHeaders },
  );
}
