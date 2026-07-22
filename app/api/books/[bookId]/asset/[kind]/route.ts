import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { isPublisherUploadUrl, uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { getLivePublisherAdminAccess } from "@/lib/publisher-admin-authorization";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";
import { classifyStorageValue, inferStorageMimeType } from "@/lib/storage/storage-records";
import { proxyRemoteStorage, serveLocalUpload } from "@/lib/storage/storage-delivery";

export async function GET(request: Request, { params }: { params: Promise<{ bookId: string; kind: string }> }) {
  const { bookId, kind } = await params;
  if (kind !== "cover" && kind !== "preview") return NextResponse.json({ message: "File not found." }, { status: 404 });
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { publisherId: true, published: true, coverImage: true, publicPreviewPdf: true, samplePdf: true, title: true } });
  if (!book?.publisherId) return NextResponse.json({ message: "File not found." }, { status: 404 });
  if (!book.published) {
    const access = await getLivePublisherAdminAccess();
    if (access.status !== "AUTHORIZED" || access.actor.publisherId !== book.publisherId) return NextResponse.json({ message: "File not found." }, { status: 404 });
  }
  const value = kind === "cover" ? book.coverImage : book.publicPreviewPdf || book.samplePdf;
  const scope = kind === "cover" ? "book-cover" as const : book.publicPreviewPdf ? "book-public-preview" as const : "book-sample" as const;
  if (!value) return NextResponse.json({ message: "File not found." }, { status: 404 });
  const filename = kind === "cover" ? `${book.title}-cover` : `${book.title}-preview.pdf`;
  const contentType = kind === "preview" ? "application/pdf" : inferStorageMimeType(value) || undefined;
  const cacheControl = "private, no-store";
  const storageKind = classifyStorageValue(value);
  if (storageKind === "LOCAL") {
    return serveLocalUpload({ request, storedPath: value, filename, disposition: "inline", expectedContentType: contentType, cacheControl });
  }
  if (storageKind === "BLOB") {
    if (!isPublisherUploadUrl(value, book.publisherId, [scope])) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
    return proxyLegacyBlob({ request, url: value, filename, disposition: "inline", expectedContentType: contentType, cacheControl });
  }
  if (storageKind === "R2") {
    let key: string;
    try { key = normalizeAndValidateObjectKey(value); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
    if (!key.startsWith(`${uploadPrefixForScope(scope)}/${book.publisherId}/`)) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
    const provider = getStorageProvider();
    const object = await provider.headObject({ key });
    if (!object) return NextResponse.json({ message: "File not found." }, { status: 404 });
    const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, downloadFilename: filename, disposition: "inline" });
    return proxyRemoteStorage({ request, url: signed.url, filename, disposition: "inline", expectedContentType: contentType || object.contentType, cacheControl });
  }
  return NextResponse.json({ message: "File unavailable." }, { status: 409 });
}
