import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;

  const isLoggedIn = !!req.auth;

  const isTeacherDashboard =
    nextUrl.pathname.startsWith("/teacher-dashboard");

  const isAdmin =
    nextUrl.pathname.startsWith("/admin");

  const isSchool =
    nextUrl.pathname.startsWith("/school-dashboard");

  if (
    (isTeacherDashboard || isAdmin || isSchool) &&
    !isLoggedIn
  ) {
    return Response.redirect(
      new URL("/teacher-login", nextUrl)
    );
  }
});

export const config = {
  matcher: [
    "/teacher-dashboard/:path*",
    "/admin/:path*",
    "/school-dashboard/:path*",
  ],
};