import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  const protectedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher-dashboard") ||
    pathname.startsWith("/school-dashboard");

  if (protectedRoute && !token) {
    const loginUrl = new URL("/teacher-login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher-dashboard/:path*",
    "/school-dashboard/:path*",
  ],
};
