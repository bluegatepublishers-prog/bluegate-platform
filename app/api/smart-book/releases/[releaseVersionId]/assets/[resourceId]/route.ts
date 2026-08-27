import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { resolveSmartBookReleaseAsset } from "@/lib/smart-book-release-asset-delivery";
import { createContentDisposition } from "@/lib/storage/disposition";
import { getStorageProvider } from "@/lib/storage/provider";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const forwardedHeaders = ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ releaseVersionId: string; resourceId: string }> },
) {
  const { releaseVersionId, resourceId } = await params;
  const session = await auth();
  const mode = session?.user?.role === "STUDENT" || session?.user?.role === "TEACHER" ? session.user.role : null;
  if (!mode) return failure(401, "Authentication required.");

  const asset = await resolveSmartBookReleaseAsset({ releaseVersionId, resourceId, mode });
  if (!asset) return failure(404, "The released resource is unavailable.");

  let source: Response | null = null;
  try {
    if (asset.storage.kind === "MANAGED_URL") {
      source = await fetch(asset.storage.url, { redirect: "error", cache: "no-store" });
    } else {
      const provider = getStorageProvider();
      const object = await provider.headObject({ key: asset.storage.key });
      if (!object) return failure(404, "The released resource is unavailable.");
      const signed = await provider.createSignedDownloadUrl({
        key: asset.storage.key,
        expiresInSeconds: 60,
        downloadFilename: asset.filename,
        disposition: "inline",
      });
      source = await fetch(signed.url, {
        headers: request.headers.get("range") ? { Range: request.headers.get("range")! } : undefined,
        redirect: "error",
        cache: "no-store",
      });
    }
  } catch {
    return failure(502, "The released resource is temporarily unavailable.");
  }

  if (!source?.ok || !source.body) return failure(source?.status && source.status >= 400 ? source.status : 502, "The released resource could not be loaded.");
  const headers = new Headers(safeHeaders);
  for (const name of forwardedHeaders) {
    const value = source.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("Content-Type")) headers.set("Content-Type", asset.contentType ?? "application/octet-stream");
  headers.set("Content-Disposition", createContentDisposition(asset.filename, "inline"));
  return new Response(source.body, { status: source.status, headers });
}

function failure(status: number, message: string) {
  return NextResponse.json({ message }, { status, headers: safeHeaders });
}
