import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type QrAdminActor = {
  userId: string;
  role: "ADMIN" | "SUPER_ADMIN";
  publisherId: string | null;
};

export class QrAuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
    public readonly reasonCode: string,
  ) {
    super(message);
    this.name = "QrAuthorizationError";
  }
}

export async function requireQrAdmin(): Promise<QrAdminActor> {
  const session = await auth();
  const userId = session?.user?.id ?? session?.user?.userId;

  if (!userId) {
    throw new QrAuthorizationError(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      active: true,
      publisherId: true,
      publisher: {
        select: {
          id: true,
          active: true,
        },
      },
    },
  });

  if (!user?.active || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new QrAuthorizationError(
      "Publisher administrator access required.",
      403,
      "QR_ADMIN_REQUIRED",
    );
  }

  if (user.role === "SUPER_ADMIN") {
    if (user.publisherId !== null) {
      throw new QrAuthorizationError(
        "Invalid platform administrator ownership.",
        403,
        "INVALID_SUPER_ADMIN_OWNERSHIP",
      );
    }

    return {
      userId: user.id,
      role: "SUPER_ADMIN",
      publisherId: null,
    };
  }

  if (
    !user.publisherId ||
    !user.publisher?.active ||
    user.publisher.id !== user.publisherId
  ) {
    throw new QrAuthorizationError(
      "An active publisher is required.",
      403,
      "PUBLISHER_UNAVAILABLE",
    );
  }

  return {
    userId: user.id,
    role: "ADMIN",
    publisherId: user.publisherId,
  };
}

export function assertPublisherAccess(
  actor: QrAdminActor,
  publisherId: string,
) {
  if (actor.role === "ADMIN" && actor.publisherId !== publisherId) {
    throw new QrAuthorizationError(
      "This QR code belongs to another publisher.",
      403,
      "CROSS_PUBLISHER_ACCESS_DENIED",
    );
  }
}
