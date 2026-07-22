import { NextResponse } from "next/server";
import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await prepareProtectedResourceDownload({
    resourceId: id,
    allowedRoles: ["SCHOOL"],
    disposition: "attachment",
  });
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.status, headers: safeHeaders },
    );
  }
  return NextResponse.json(
    { url: result.legacy ? `/api/school/resources/${encodeURIComponent(id)}/download` : result.url, expiresAt: result.expiresAt },
    { headers: safeHeaders },
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await prepareProtectedResourceDownload({ resourceId: id, allowedRoles: ["SCHOOL"], disposition: "attachment" });
  if (!result.ok) return NextResponse.json({ code: result.code, message: result.message }, { status: result.status, headers: safeHeaders });
  if (result.legacy) return proxyLegacyBlob({ url: result.url, filename: "resource" });
  return NextResponse.redirect(result.url, { status: 307, headers: safeHeaders });
}
