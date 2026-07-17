import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export type SchoolWithUser = Prisma.SchoolGetPayload<{
  include: {
    user: true;
  };
}>;

export async function getSchoolCities() {
  if (!process.env.DATABASE_URL) return [];
  const actor = await requireLivePublisherAdmin();

  const rows = await prisma.school.findMany({
    where: { publisherId: actor.publisherId },
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
  const actor = await requireLivePublisherAdmin();

  const where: Prisma.SchoolWhereInput = { publisherId: actor.publisherId };

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
  const actor = await requireLivePublisherAdmin();

  return prisma.school.findFirst({
    where: { id, publisherId: actor.publisherId },
    include: {
      user: true,
    },
  });
}
