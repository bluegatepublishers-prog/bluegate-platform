import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { isPublisherUploadUrl, uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";
import { proxyRemoteStorage } from "@/lib/storage/storage-delivery";

export async function GET(request: Request, { params }: { params: Promise<{ publisherId: string; kind: string }> }) {
  const { publisherId, kind } = await params;
  if (kind !== "logo" && kind !== "favicon") return NextResponse.json({ message: "File not found." }, { status: 404 });
  const publisher = await prisma.publisher.findFirst({ where: { id: publisherId, active: true }, select: { logoUrl: true, faviconUrl: true } });
  const value = kind === "logo" ? publisher?.logoUrl : publisher?.faviconUrl;
  if (!value) return NextResponse.json({ message: "File not found." }, { status: 404 });
  const scope = kind === "logo" ? "publisher-logo" as const : "publisher-favicon" as const;
  if (isPublisherUploadUrl(value, publisherId, [scope])) return proxyLegacyBlob({ request, url: value, filename: `publisher-${kind}`, disposition: "inline", cacheControl: "public, max-age=30" });
  let key: string;
  try { key = normalizeAndValidateObjectKey(value); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
  if (!key.startsWith(`${uploadPrefixForScope(scope)}/${publisherId}/`)) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
  const provider = getStorageProvider();
  const object = await provider.headObject({ key });
  if (!object) return NextResponse.json({ message: "File not found." }, { status: 404 });
  const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, disposition: "inline" });
  return proxyRemoteStorage({ request, url: signed.url, filename: `publisher-${kind}`, disposition: "inline", expectedContentType: object.contentType, cacheControl: "public, max-age=30" });
}
