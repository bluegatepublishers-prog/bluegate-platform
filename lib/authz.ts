import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUser(roles?: string[], callbackUrl?: string) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    const role = roles?.length === 1 ? roles[0] : undefined;
    const loginPath = role === "ADMIN" ? "/admin/login" : role === "SCHOOL" ? "/school-login" : "/teacher-login";
    const fallback = role === "ADMIN" ? "/admin" : role === "SCHOOL" ? "/school-dashboard" : role === "TEACHER" ? "/teacher-dashboard" : undefined;
    const target = callbackUrl ?? fallback;
    redirect(target ? `${loginPath}?callbackUrl=${encodeURIComponent(target)}` : loginPath);
  }

  if (roles && (!user.role || !roles.includes(user.role))) redirect("/");

  return user;
}

export async function getApiUser(roles?: string[]) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;
  if (roles && (!user.role || !roles.includes(user.role))) return null;

  return user;
}
