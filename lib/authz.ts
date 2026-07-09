import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUser(roles?: string[]) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) redirect("/teacher-login");
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
