import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { isPublisherUploadUrl, uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ publisherId: string; kind: string }> }) {
  const { publisherId, kind } = await params;
  if (kind !== "logo" && kind !== "favicon") return NextResponse.json({ message: "File not found." }, { status: 404 });
  const publisher = await prisma.publisher.findFirst({ where: { id: publisherId, active: true }, select: { logoUrl: true, faviconUrl: true } });
  const value = kind === "logo" ? publisher?.logoUrl : publisher?.faviconUrl;
  if (!value) return NextResponse.json({ message: "File not found." }, { status: 404 });
  const scope = kind === "logo" ? "publisher-logo" as const : "publisher-favicon" as const;
  if (isPublisherUploadUrl(value, publisherId, [scope])) return proxyLegacyBlob({ url: value, filename: `publisher-${kind}`, disposition: "inline" });
  let key: string;
  try { key = normalizeAndValidateObjectKey(value); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
  if (!key.startsWith(`${uploadPrefixForScope(scope)}/${publisherId}/`)) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
  const provider = getStorageProvider();
  if (!(await provider.headObject({ key }))) return NextResponse.json({ message: "File not found." }, { status: 404 });
  const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, disposition: "inline" });
  return NextResponse.redirect(signed.url, { status: 307, headers: { "Cache-Control": "public, max-age=30", "Referrer-Policy": "no-referrer" } });
}
