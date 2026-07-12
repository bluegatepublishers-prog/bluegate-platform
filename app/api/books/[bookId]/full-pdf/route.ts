import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import { canAccessFullBook } from "@/lib/book-adoptions";

const ALLOWED_ROLES = ["ADMIN", "TEACHER", "SCHOOL", "STUDENT"];

export async function GET(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const user = await getApiUser(ALLOWED_ROLES);
  if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const { bookId } = await params;
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, published: true, fullBookPdf: true } });
  if (!book) return NextResponse.json({ message: "Book not found." }, { status: 404 });
  if (user.role !== "ADMIN" && !book.published) return NextResponse.json({ message: "Access denied." }, { status: 403 });

  if (!(await canAccessFullBook(user, bookId))) return NextResponse.json({ message: "Access denied." }, { status: 403 });
  if (!book.fullBookPdf) return NextResponse.json({ message: "Full book not available." }, { status: 404 });
  const response = NextResponse.redirect(book.fullBookPdf, { status: 307 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
