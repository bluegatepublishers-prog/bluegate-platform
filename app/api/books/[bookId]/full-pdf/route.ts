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

const ALLOWED_ROLES = ["ADMIN", "TEACHER", "SCHOOL", "STUDENT"];

export async function GET(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
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
  let downloadUrl = book.fullBookPdf;
  const legacy = isPublisherUploadUrl(downloadUrl, book.publisherId, ["book-full"]);
  if (!legacy) {
    let key: string;
    try {
      key = normalizeAndValidateObjectKey(downloadUrl);
    } catch {
      return NextResponse.json({ message: "The book file is unavailable." }, { status: 409 });
    }
    if (!key.startsWith(`${uploadPrefixForScope("book-full")}/${book.publisherId}/`)) return NextResponse.json({ message: "The book file is unavailable." }, { status: 409 });
    const provider = getStorageProvider();
    if (!(await provider.headObject({ key }))) return NextResponse.json({ message: "The book file is not available yet." }, { status: 404 });
    downloadUrl = (await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, downloadFilename: `${book.title}.pdf`, disposition: "inline" })).url;
  }
  if (legacy) return proxyLegacyBlob({ url: downloadUrl, filename: `${book.title}.pdf`, disposition: "inline" });
  const response = NextResponse.redirect(downloadUrl, { status: 307 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
