import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { isPublisherUploadUrl, uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { getLivePublisherAdminAccess } from "@/lib/publisher-admin-authorization";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ bookId: string; kind: string }> }) {
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
  let url = value;
  const legacy = isPublisherUploadUrl(value, book.publisherId, [scope]);
  if (!legacy) {
    let key: string;
    try { key = normalizeAndValidateObjectKey(value); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
    if (!key.startsWith(`${uploadPrefixForScope(scope)}/${book.publisherId}/`)) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
    const provider = getStorageProvider();
    if (!(await provider.headObject({ key }))) return NextResponse.json({ message: "File not found." }, { status: 404 });
    url = (await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, downloadFilename: kind === "cover" ? `${book.title}-cover` : `${book.title}-preview.pdf`, disposition: "inline" })).url;
  }
  if (legacy) return proxyLegacyBlob({ url, filename: kind === "cover" ? `${book.title}-cover` : `${book.title}-preview.pdf`, disposition: "inline" });
  return NextResponse.redirect(url, { status: 307, headers: { "Cache-Control": "public, max-age=30", "Referrer-Policy": "no-referrer" } });
}
