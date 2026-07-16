"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const hiddenPrefixes = [
    "/admin",
    "/teacher-dashboard",
    "/school-dashboard",
    "/student-dashboard",
    "/mentor-dashboard",
    "/parent-dashboard",
  ];
  const hiddenLoginRoutes = [
    "/teacher-login",
    "/school-login",
    "/student-login",
    "/parent-login",
  ];

  const isPortalRoute = hiddenPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isPortalRoute || hiddenLoginRoutes.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
