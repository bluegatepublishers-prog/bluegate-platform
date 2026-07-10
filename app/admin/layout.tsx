import type { ReactNode } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { requireUser } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["ADMIN"]);
  const userLabel = user.name?.trim() || user.email || "Administrator";

  return <AdminShell userLabel={userLabel}>{children}</AdminShell>;
}
