import { NextResponse } from "next/server";
import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

export async function GET(
  _request: Request,
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
  if (result.legacy) return proxyLegacyBlob({ url: result.url, filename: "resource", disposition: "inline" });
  const response = NextResponse.redirect(result.url, { status: 307 });
  for (const [name, value] of Object.entries(safeHeaders)) response.headers.set(name, value);
  return response;
}
