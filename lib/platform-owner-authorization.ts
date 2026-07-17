import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  loadTrustedPlatformOwnerActor,
} from "@/lib/platform-owner-policy";
import { redirect } from "next/navigation";

export async function requireLiveSuperAdmin() {
  const session = await auth();
  const actor = await loadTrustedPlatformOwnerActor(
    session?.user?.id,
    async (id) => prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        publisherId: true,
        publisher: { select: { id: true, active: true } },
        school: { select: { id: true } },
        teacher: { select: { id: true } },
        student: { select: { id: true } },
        mentor: { select: { id: true } },
        parent: { select: { id: true } },
      },
    }),
  );

  if (!actor) redirect("/super-admin/login");
  return actor;
}
