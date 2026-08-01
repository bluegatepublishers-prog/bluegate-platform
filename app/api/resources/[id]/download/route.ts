import { NextResponse } from "next/server";
import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

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
    allowedRoles: ["TEACHER", "ADMIN", "MENTOR"],
    disposition,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await prepare(id, "inline");
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.status, headers: safeHeaders },
    );
  }
  if (result.legacy) return proxyLegacyBlob({ url: result.url, filename: "resource", disposition: "inline" });
  return NextResponse.redirect(result.url, { status: 307, headers: safeHeaders });
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
    { url: result.legacy ? `/api/resources/${encodeURIComponent(id)}/download` : result.url, expiresAt: result.expiresAt },
    { headers: safeHeaders },
  );
}
