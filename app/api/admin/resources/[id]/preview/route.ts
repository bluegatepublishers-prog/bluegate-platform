import { NextResponse } from "next/server";
import { PlatformFeatureKey, ResourceType } from "@prisma/client";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { getResourceFileName } from "@/lib/resource-helpers";
import { prisma } from "@/lib/prisma";
import { isPublisherStorageValue } from "@/lib/storage/upload-policy";
import { getStorageProvider } from "@/lib/storage/provider";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (!(await isPublisherFeatureEnabled(actor.publisherId, PlatformFeatureKey.RESOURCES))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: safeHeaders });
  }

  const { id } = await params;
  const resource = await prisma.resource.findFirst({
    where: { id, publisherId: actor.publisherId },
    select: { fileUrl: true, originalFileName: true, type: true, mimeType: true },
  });
  if (!resource?.fileUrl || !isPublisherStorageValue(resource.fileUrl, actor.publisherId, ["resource-file"])) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404, headers: safeHeaders });
  }

  const filename = getResourceFileName(resource);
  if (/^https:\/\//i.test(resource.fileUrl)) {
    return proxyLegacyBlob({ url: resource.fileUrl, filename, disposition: "inline" });
  }

  const provider = getStorageProvider();
  const object = await provider.headObject({ key: resource.fileUrl });
  if (!object) {
    return NextResponse.json({ message: "Resource file not found." }, { status: 404, headers: safeHeaders });
  }

  const signed = await provider.createSignedDownloadUrl({
    key: resource.fileUrl,
    expiresInSeconds: 60,
    downloadFilename: filename,
    disposition: "inline",
  });

  if (resource.type === ResourceType.IMAGE) {
    const source = await fetch(signed.url, { redirect: "error" }).catch((error: unknown) => {
      console.warn("[content-studio-resource-preview] R2 image fetch failed", {
        resourceId: id,
        publisherId: actor.publisherId,
        resourceType: resource.type,
        mimeType: resource.mimeType,
        storageKey: resource.fileUrl,
        stage: "get-object",
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
    if (!source?.ok || !source.body) {
      console.warn("[content-studio-resource-preview] R2 image response unavailable", {
        resourceId: id,
        publisherId: actor.publisherId,
        resourceType: resource.type,
        mimeType: resource.mimeType,
        storageKey: resource.fileUrl,
        stage: "get-object-response",
        status: source?.status ?? null,
      });
      return NextResponse.json({ message: "Image preview unavailable." }, { status: 404, headers: safeHeaders });
    }
    const contentType = source.headers.get("content-type") || object.contentType || resource.mimeType || "application/octet-stream";
    return new NextResponse(source.body, {
      status: 200,
      headers: {
        ...safeHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        ...(source.headers.get("content-length") ? { "Content-Length": source.headers.get("content-length")! } : {}),
      },
    });
  }
  return NextResponse.redirect(signed.url, { status: 307, headers: safeHeaders });
}
