import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  if (request.auth?.user) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/super-admin/login") return NextResponse.next();

  const loginPath = pathname.startsWith("/admin")
    ? "/admin/login"
    : pathname.startsWith("/super-admin")
      ? "/super-admin/login"
    : pathname.startsWith("/school-dashboard")
      ? "/school-login"
      : "/teacher-login";

  const callbackUrl = `${pathname}${request.nextUrl.search}`;
  const destination = new URL(loginPath, request.nextUrl.origin);
  destination.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(destination);
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher-dashboard/:path*",
    "/school-dashboard/:path*",
    "/super-admin/:path*",
  ],
};
