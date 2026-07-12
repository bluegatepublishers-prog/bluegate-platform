import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

  const rows = await prisma.teacher.findMany({
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

  const where: Prisma.TeacherWhereInput = {};

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

  return prisma.teacher.findUnique({
    where: {
      id,
    },
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

  return prisma.teacher.update({
    where: {
      id,
    },
    data: {
      verified,
    },
  });
}
