import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  loadTrustedPublisherAdminActor,
  type TrustedPublisherAdminActor,
} from "@/lib/publisher-admin-policy";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export type PublisherAdminAccess =
  | { status: "AUTHORIZED"; actor: TrustedPublisherAdminActor }
  | { status: "UNAUTHENTICATED" }
  | { status: "FORBIDDEN" };

export async function getLivePublisherAdminAccess(): Promise<PublisherAdminAccess> {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) return { status: "UNAUTHENTICATED" };

  const actor = await loadTrustedPublisherAdminActor(
    sessionUserId,
    async (id) => prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        publisherId: true,
        publisher: { select: { id: true, active: true, name: true } },
      },
    }),
  );

  return actor
    ? { status: "AUTHORIZED", actor }
    : { status: "FORBIDDEN" };
}

export async function requireLivePublisherAdmin() {
  const access = await getLivePublisherAdminAccess();
  if (access.status !== "AUTHORIZED") redirect("/admin/login");
  return access.actor;
}

export async function authorizePublisherAdminApi() {
  const access = await getLivePublisherAdminAccess();
  if (access.status === "AUTHORIZED") return { actor: access.actor, response: null };
  const status = access.status === "UNAUTHENTICATED" ? 401 : 403;
  return {
    actor: null,
    response: NextResponse.json(
      { message: status === 401 ? "Authentication required." : "Forbidden." },
      { status },
    ),
  };
}

export function publisherAdminNotFound() {
  return NextResponse.json({ message: "Record not found." }, { status: 404 });
}
