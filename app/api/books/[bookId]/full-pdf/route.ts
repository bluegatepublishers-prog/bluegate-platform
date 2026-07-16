import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import {
  getBookEntitlementForAuthenticatedUser,
  SAFE_ENTITLEMENT_MESSAGES,
} from "@/lib/entitlements";

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
    select: { fullBookPdf: true },
  });
  if (!book?.fullBookPdf) return NextResponse.json({ message: "The book file is not available yet." }, { status: 404 });
  const response = NextResponse.redirect(book.fullBookPdf, { status: 307 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
