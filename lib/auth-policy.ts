export const ROLE_HOME = {
  SUPER_ADMIN: "/super-admin",
  ADMIN: "/admin",
  TEACHER: "/teacher-dashboard",
  SCHOOL: "/school-dashboard",
  STUDENT: "/student-dashboard",
  MENTOR: "/mentor-dashboard",
  PARENT: "/parent-dashboard",
} as const;

export type PlatformRole = keyof typeof ROLE_HOME;

const PROTECTED_ROUTES: ReadonlyArray<[string, PlatformRole]> = [
  ["/super-admin", "SUPER_ADMIN"],
  ["/admin", "ADMIN"],
  ["/teacher-dashboard", "TEACHER"],
  ["/school-dashboard", "SCHOOL"],
  ["/student-dashboard", "STUDENT"],
  ["/mentor-dashboard", "MENTOR"],
  ["/parent-dashboard", "PARENT"],
];

const PUBLIC_LOGIN_ROUTES = new Set([
  "/super-admin/login",
  "/admin/login",
  "/teacher-login",
  "/school-login",
  "/student-login",
  "/mentor-login",
  "/parent-login",
]);

export function isPlatformRole(value: string | null | undefined): value is PlatformRole {
  return Boolean(value && value in ROLE_HOME);
}

export function getRoleDestination(role: string | null | undefined) {
  return isPlatformRole(role) ? ROLE_HOME[role] : undefined;
}

export function isSafeInternalPath(value: string | undefined): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return false;
  return !decoded.includes("://") && !/^[^?#]*\b[a-z][a-z\d+.-]*:/i.test(decoded);
}

export function matchesRoute(value: string, route: string) {
  const pathname = value.split(/[?#]/, 1)[0];
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isAllowedRoleCallback(
  value: string | undefined,
  role: string | null | undefined,
): value is string {
  if (!isSafeInternalPath(value) || !isPlatformRole(role)) return false;
  return matchesRoute(value, ROLE_HOME[role]);
}

export function getLoginDestination(
  role: string | null | undefined,
  callbackUrl: string | undefined,
  redirectPath: string,
) {
  const roleDestination = getRoleDestination(role);
  if (!roleDestination) return "/";
  if (isAllowedRoleCallback(callbackUrl, role)) return callbackUrl;
  if (isAllowedRoleCallback(redirectPath, role)) return redirectPath;
  return roleDestination;
}

export function getProtectedRouteRole(pathname: string) {
  if (PUBLIC_LOGIN_ROUTES.has(pathname)) return null;
  return PROTECTED_ROUTES.find(([route]) => matchesRoute(pathname, route))?.[1] ?? null;
}

export type ProtectedRouteDecision =
  | { action: "allow" }
  | { action: "login"; destination: string }
  | { action: "role-home"; destination: string };

export function decideProtectedRoute(
  pathname: string,
  role: string | null | undefined,
): ProtectedRouteDecision {
  const requiredRole = getProtectedRouteRole(pathname);
  if (!requiredRole) return { action: "allow" };
  if (!isPlatformRole(role)) {
    const destination = requiredRole === "ADMIN"
      ? "/admin/login"
      : requiredRole === "SUPER_ADMIN"
        ? "/super-admin/login"
        : requiredRole === "SCHOOL"
          ? "/school-login"
          : requiredRole === "STUDENT"
            ? "/student-login"
            : requiredRole === "MENTOR"
              ? "/mentor-login"
              : requiredRole === "PARENT"
                ? "/parent-login"
              : "/teacher-login";
    return { action: "login", destination };
  }
  if (role !== requiredRole) {
    return { action: "role-home", destination: ROLE_HOME[role] };
  }
  return { action: "allow" };
}
