import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export type SchoolWithUser = Prisma.SchoolGetPayload<{
  include: {
    user: true;
    _count: {
      select: {
        staffMemberships: true;
        studentEnrollments: true;
      };
    };
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
  includeArchived?: boolean;
} = {}) {
  if (!process.env.DATABASE_URL) return [];
  const actor = await requireLivePublisherAdmin();

  const where: Prisma.SchoolWhereInput = {
    publisherId: actor.publisherId,
    ...(filters.includeArchived ? {} : { status: { not: "ARCHIVED" } }),
  };

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
      _count: {
        select: {
          staffMemberships: { where: { role: "TEACHER" } },
          studentEnrollments: { where: { status: "ACTIVE" } },
        },
      },
    },
    orderBy: {
      schoolName: "asc",
    },
  });
}

export async function getSchoolById(id: string) {
  if (!process.env.DATABASE_URL) return null;
  const actor = await requireLivePublisherAdmin();

  const [school, recentAuditEvents] = await prisma.$transaction([
    prisma.school.findFirst({
      where: { id, publisherId: actor.publisherId },
      include: {
        user: true,
        _count: {
          select: {
            staffMemberships: true,
            studentEnrollments: true,
            teacherAssignments: true,
            academicYears: true,
            schoolClasses: true,
            bookAdoptions: true,
          },
        },
        onboardingReviews: {
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            reason: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.securityAuditEvent.findMany({
      where: {
        publisherId: actor.publisherId,
        targetType: "School",
        targetId: id,
      },
      select: { id: true, action: true, outcome: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  return school ? { ...school, recentAuditEvents } : null;
}
