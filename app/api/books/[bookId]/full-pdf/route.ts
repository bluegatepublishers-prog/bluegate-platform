import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import {
  getBookEntitlementForAuthenticatedUser,
  SAFE_ENTITLEMENT_MESSAGES,
} from "@/lib/entitlements";
import { PDF_BOOK_LIMITS } from "@/lib/pdf-book-validation";
import { getStorageProvider } from "@/lib/storage/provider";
import {
  isPublisherUploadUrl,
  uploadPrefixForScope,
} from "@/lib/storage/upload-policy";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

const ALLOWED_ROLES = ["ADMIN", "TEACHER", "SCHOOL", "STUDENT"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const user = await getApiUser(ALLOWED_ROLES);

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { bookId } = await params;

  const decision = await getBookEntitlementForAuthenticatedUser(user, {
    bookId,
  });

  if (!decision.allowed) {
    return NextResponse.json(
      { message: SAFE_ENTITLEMENT_MESSAGES.book },
      {
        status: decision.reason === "RECORD_NOT_FOUND" ? 404 : 403,
      },
    );
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      fullBookPdf: true,
      publisherId: true,
      title: true,
    },
  });

  if (!book?.fullBookPdf || !book.publisherId) {
    return NextResponse.json(
      { message: "The book file is not available yet." },
      { status: 404 },
    );
  }

  const legacy = isPublisherUploadUrl(
    book.fullBookPdf,
    book.publisherId,
    ["book-full"],
  );

  /*
   * Preserve the existing legacy path.
   * Legacy blob URLs already use the existing same-origin proxy helper.
   */
  if (legacy) {
    return proxyLegacyBlob({
      url: book.fullBookPdf,
      filename: `${book.title}.pdf`,
      disposition: "inline",
    });
  }

  let key: string;

  try {
    key = normalizeAndValidateObjectKey(book.fullBookPdf);
  } catch {
    return NextResponse.json(
      { message: "The book file is unavailable." },
      { status: 409 },
    );
  }

  const requiredPrefix =
    `${uploadPrefixForScope("book-full")}/${book.publisherId}/`;

  if (!key.startsWith(requiredPrefix)) {
    return NextResponse.json(
      { message: "The book file is unavailable." },
      { status: 409 },
    );
  }

  const provider = getStorageProvider();

  const metadata = await provider.headObject({ key });

  if (!metadata) {
    return NextResponse.json(
      { message: "The book file is not available yet." },
      { status: 404 },
    );
  }

  if (
    !metadata.contentLength ||
    metadata.contentLength > PDF_BOOK_LIMITS.maxBytes
  ) {
    return NextResponse.json(
      { message: "The book file is unavailable." },
      { status: 409 },
    );
  }

  /*
   * IMPORTANT:
   *
   * Do not redirect browser PDF.js to the signed R2 URL.
   *
   * Keep the PDF request same-origin so browser PDF.js does not depend
   * on R2 CORS / redirect / range-request configuration.
   */
  const bytes = await provider.getObjectBytes({
    key,
    maxBytes: PDF_BOOK_LIMITS.maxBytes,
  });

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${safePdfFilename(book.title)}"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safePdfFilename(title: string) {
  const sanitized = title
    .replace(/[\r\n"]/g, "")
    .trim()
    .slice(0, 150);

  return `${sanitized || "book"}.pdf`;
}