import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export type TeacherWithUser = Prisma.TeacherGetPayload<{
  include: {
    user: true;
  };
}>;

export type TeacherListFilter = {
  query?: string;
  status?: "verified" | "pending";
  subject?: string;
};

export async function getTeacherSubjects() {
  if (!process.env.DATABASE_URL) return [];
  const actor = await requireLivePublisherAdmin();

  const rows = await prisma.teacher.findMany({
    where: { school: { publisherId: actor.publisherId } },
    select: {
      subject: true,
    },
    orderBy: {
      subject: "asc",
    },
  });

  return [...new Set(rows.map((row) => row.subject))];
}

export async function getTeachers(filters: TeacherListFilter = {}) {
  if (!process.env.DATABASE_URL) return [];
  const actor = await requireLivePublisherAdmin();

  const where: Prisma.TeacherWhereInput = {
    school: { publisherId: actor.publisherId },
  };

  if (filters.status === "verified") {
    where.verified = true;
  } else if (filters.status === "pending") {
    where.verified = false;
  }

  if (filters.subject) {
    where.subject = filters.subject;
  }

  if (filters.query) {
    const query = filters.query.trim();

    if (query) {
      where.OR = [
        {
          user: {
            is: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
        {
          user: {
            is: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
        {
          schoolName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          subject: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];
    }
  }

  return prisma.teacher.findMany({
    where,
    include: {
      user: true,
    },
    orderBy: {
      schoolName: "asc",
    },
  });
}

export async function getTeacherById(id: string) {
  if (!process.env.DATABASE_URL) return null;
  const actor = await requireLivePublisherAdmin();

  return prisma.teacher.findFirst({
    where: { id, school: { publisherId: actor.publisherId } },
    include: {
      user: true,
    },
  });
}

export async function updateTeacherVerification(
  id: string,
  verified: boolean
) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined.");
  }
  const actor = await requireLivePublisherAdmin();

  return prisma.teacher.updateMany({
    where: { id, school: { publisherId: actor.publisherId } },
    data: {
      verified,
    },
  });
}
