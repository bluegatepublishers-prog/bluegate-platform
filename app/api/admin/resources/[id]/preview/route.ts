import { NextResponse } from "next/server";
import { PlatformFeatureKey } from "@prisma/client";

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
    select: { fileUrl: true, originalFileName: true },
  });
  if (!resource?.fileUrl || !isPublisherStorageValue(resource.fileUrl, actor.publisherId, ["resource-file"])) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404, headers: safeHeaders });
  }

  const filename = getResourceFileName(resource);
  if (/^https:\/\//i.test(resource.fileUrl)) {
    return proxyLegacyBlob({ url: resource.fileUrl, filename, disposition: "inline" });
  }

  const provider = getStorageProvider();
  if (!(await provider.headObject({ key: resource.fileUrl }))) {
    return NextResponse.json({ message: "Resource file not found." }, { status: 404, headers: safeHeaders });
  }

  const signed = await provider.createSignedDownloadUrl({
    key: resource.fileUrl,
    expiresInSeconds: 60,
    downloadFilename: filename,
    disposition: "inline",
  });
  return NextResponse.redirect(signed.url, { status: 307, headers: safeHeaders });
}
