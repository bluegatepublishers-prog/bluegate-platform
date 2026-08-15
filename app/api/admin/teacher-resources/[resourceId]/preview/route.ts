import { NextResponse } from "next/server";

import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";
import { createContentDisposition } from "@/lib/storage/disposition";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { getStorageProvider } from "@/lib/storage/provider";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  const { resourceId } = await params;
  const resource = await prisma.publisherTeacherResource.findFirst({ where: { id: resourceId, publisherId: actor.publisherId, archivedAt: null, book: { publisherId: actor.publisherId } }, select: { objectKey: true, originalFileName: true, contentType: true } });
  if (!resource) return NextResponse.json({ message: "Teacher resource not found." }, { status: 404, headers });
  let key: string;
  try { key = normalizeAndValidateObjectKey(resource.objectKey); } catch { return NextResponse.json({ message: "Teacher resource unavailable." }, { status: 409, headers }); }
  if (!key.startsWith(`${uploadPrefixForScope("teacher-resource-pdf")}/${actor.publisherId}/`)) return NextResponse.json({ message: "Teacher resource unavailable." }, { status: 409, headers });
  const provider = getStorageProvider();
  const object = await provider.headObject({ key });
  if (!object || object.contentType?.toLowerCase() !== "application/pdf") return NextResponse.json({ message: "Teacher resource unavailable." }, { status: 404, headers });
  const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, downloadFilename: resource.originalFileName, disposition: "inline" });
  const source = await fetch(signed.url, { redirect: "error" });
  if (!source.ok || !source.body) return NextResponse.json({ message: "Teacher resource unavailable." }, { status: 404, headers });
  return new NextResponse(source.body, { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": createContentDisposition(resource.originalFileName, "inline"), ...(source.headers.get("content-length") ? { "Content-Length": source.headers.get("content-length")! } : {}) } });
}
