import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decideProtectedRoute } from "@/lib/auth-policy";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const decision = decideProtectedRoute(pathname, request.auth?.user?.role);
  if (decision.action === "allow") return NextResponse.next();

  const callbackUrl = `${pathname}${request.nextUrl.search}`;
  const destination = new URL(decision.destination, request.nextUrl.origin);
  if (decision.action === "login") destination.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(destination);
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher-dashboard/:path*",
    "/school-dashboard/:path*",
    "/student-dashboard/:path*",
    "/mentor-dashboard/:path*",
    "/parent-dashboard/:path*",
    "/super-admin/:path*",
  ],
};
