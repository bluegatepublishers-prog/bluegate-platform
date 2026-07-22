import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import {
  getBookEntitlementForAuthenticatedUser,
  SAFE_ENTITLEMENT_MESSAGES,
} from "@/lib/entitlements";
import { getStorageProvider } from "@/lib/storage/provider";
import { isPublisherUploadUrl, uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";
import { classifyStorageValue } from "@/lib/storage/storage-records";
import { proxyRemoteStorage, serveLocalUpload } from "@/lib/storage/storage-delivery";

const ALLOWED_ROLES = ["ADMIN", "TEACHER", "SCHOOL", "STUDENT"];

export async function GET(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const user = await getApiUser(ALLOWED_ROLES);
  if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const { bookId } = await params;
  const decision = await getBookEntitlementForAuthenticatedUser(user, { bookId });
  if (!decision.allowed) {
    return NextResponse.json(
      { message: SAFE_ENTITLEMENT_MESSAGES.book },
      { status: decision.reason === "RECORD_NOT_FOUND" ? 404 : 403 },
    );
  }
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { fullBookPdf: true, publisherId: true, title: true },
  });
  if (!book?.fullBookPdf || !book.publisherId) return NextResponse.json({ message: "The book file is not available yet." }, { status: 404 });
  const storedValue = book.fullBookPdf;
  const filename = `${book.title}.pdf`;
  const storageKind = classifyStorageValue(storedValue);
  if (storageKind === "LOCAL") {
    return serveLocalUpload({ request, storedPath: storedValue, filename, disposition: "inline", expectedContentType: "application/pdf", cacheControl: "private, no-store" });
  }
  if (storageKind === "BLOB") {
    if (!isPublisherUploadUrl(storedValue, book.publisherId, ["book-full"])) return NextResponse.json({ message: "The book file is unavailable." }, { status: 409 });
    return proxyLegacyBlob({ request, url: storedValue, filename, disposition: "inline", expectedContentType: "application/pdf" });
  }
  if (storageKind === "R2") {
    let key: string;
    try {
      key = normalizeAndValidateObjectKey(storedValue);
    } catch {
      return NextResponse.json({ message: "The book file is unavailable." }, { status: 409 });
    }
    if (!key.startsWith(`${uploadPrefixForScope("book-full")}/${book.publisherId}/`)) return NextResponse.json({ message: "The book file is unavailable." }, { status: 409 });
    const provider = getStorageProvider();
    if (!(await provider.headObject({ key }))) return NextResponse.json({ message: "The book file is not available yet." }, { status: 404 });
    const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, downloadFilename: filename, disposition: "inline" });
    return proxyRemoteStorage({ request, url: signed.url, filename, disposition: "inline", expectedContentType: "application/pdf", cacheControl: "private, no-store" });
  }
  return NextResponse.json({ message: "The book file is unavailable." }, { status: 409 });
}
