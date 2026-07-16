import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUser(roles?: string[]) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    if (roles?.includes("ADMIN")) {
      redirect("/admin/login");
    }

    if (roles?.includes("STUDENT")) {
      redirect("/student-login");
    }

    redirect("/teacher-login");
  }

  if (roles && (!user.role || !roles.includes(user.role))) {
    if (user.role === "STUDENT") redirect("/student-dashboard");
    if (user.role === "TEACHER") redirect("/teacher-dashboard");
    if (user.role === "SCHOOL") redirect("/school-dashboard");
    if (user.role === "ADMIN") redirect("/admin");
    if (user.role === "SUPER_ADMIN") redirect("/super-admin");
    redirect("/");
  }

  return user;
}

export async function getApiUser(roles?: string[]) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;
  if (roles && (!user.role || !roles.includes(user.role))) return null;

  return user;
}
