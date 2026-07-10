import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SchoolWithUser = Prisma.SchoolGetPayload<{
  include: {
    user: true;
  };
}>;

export async function getSchoolCities() {
  if (!process.env.DATABASE_URL) return [];

  const rows = await prisma.school.findMany({
    select: {
      city: true,
    },
    orderBy: {
      city: "asc",
    },
  });

  return [...new Set(rows.map((row) => row.city))];
}

export async function getSchools(filters: {
  query?: string;
  city?: string;
} = {}) {
  if (!process.env.DATABASE_URL) return [];

  const where: Prisma.SchoolWhereInput = {};

  if (filters.city) {
    where.city = filters.city;
  }

  if (filters.query) {
    const query = filters.query.trim();

    if (query) {
      where.OR = [
        {
          schoolName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          city: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          state: {
            contains: query,
            mode: "insensitive",
          },
        },
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
          user: {
            is: {
              phone: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }
  }

  return prisma.school.findMany({
    where,
    include: {
      user: true,
    },
    orderBy: {
      schoolName: "asc",
    },
  });
}

export async function getSchoolById(id: string) {
  if (!process.env.DATABASE_URL) return null;

  return prisma.school.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
    },
  });
}
