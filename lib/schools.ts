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
  plan?: "FREE" | "PAID";
  accessStatus?: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  view?: "pending" | "active" | "suspended" | "expired" | "all";
} = {}) {
  if (!process.env.DATABASE_URL) return [];
  const actor = await requireLivePublisherAdmin();

  const where: Prisma.SchoolWhereInput = {
    publisherId: actor.publisherId,
  };
  const conditions: Prisma.SchoolWhereInput[] = [];

  if (filters.view === "pending") conditions.push({ status: "PENDING" });
  if (filters.view === "active") conditions.push({ accessSubscription: { is: { status: "ACTIVE", AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] } } });
  if (filters.view === "suspended") conditions.push({ accessSubscription: { is: { status: "SUSPENDED" } } });
  if (filters.view === "expired") conditions.push({ OR: [{ accessSubscription: { is: { status: "EXPIRED" } } }, { accessSubscription: { is: { expiresAt: { lte: new Date() } } } }] });
  if (filters.plan || filters.accessStatus) {
    conditions.push({ accessSubscription: {
      is: {
        ...(filters.plan ? { plan: filters.plan } : {}),
        ...(filters.accessStatus ? { status: filters.accessStatus } : {}),
      },
    } });
  }

  if (filters.city) {
    where.city = filters.city;
  }

  if (filters.query) {
    const query = filters.query.trim();

    if (query) {
      conditions.push({ OR: [
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
      ] });
    }
  }
  if (conditions.length) where.AND = conditions;

  return prisma.school.findMany({
    where,
    include: {
      user: true,
      accessSubscription: true,
      _count: {
        select: {
          staffMemberships: { where: { role: "TEACHER" } },
          studentEnrollments: { where: { status: "ACTIVE" } },
          bookEntitlements: true,
          resourceEntitlements: true,
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

  const [school, recentAuditEvents, bookEntitlementRows, resourceEntitlementRows] = await prisma.$transaction([
    prisma.school.findFirst({
      where: { id, publisherId: actor.publisherId },
      include: {
        user: true,
        accessSubscription: true,
        _count: {
          select: {
            staffMemberships: true,
            studentEnrollments: true,
            teacherAssignments: true,
            academicYears: true,
            schoolClasses: true,
            bookAdoptions: true,
            bookEntitlements: true,
            resourceEntitlements: true,
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
        OR: [
          { targetType: "School", targetId: id },
          {
            targetType: "SchoolBookEntitlement",
            targetId: {
              in: (
                await prisma.schoolBookEntitlement.findMany({
                  where: { schoolId: id, publisherId: actor.publisherId },
                  select: { id: true },
                })
              ).map((item) => item.id),
            },
          },
          {
            targetType: "SchoolResourceEntitlement",
            targetId: {
              in: (
                await prisma.schoolResourceEntitlement.findMany({
                  where: { schoolId: id, publisherId: actor.publisherId },
                  select: { id: true },
                })
              ).map((item) => item.id),
            },
          },
        ],
      },
      select: { id: true, action: true, outcome: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.schoolBookEntitlement.findMany({
      where: { schoolId: id, publisherId: actor.publisherId },
      select: { status: true },
    }),
    prisma.schoolResourceEntitlement.findMany({
      where: { schoolId: id, publisherId: actor.publisherId },
      select: { status: true },
    }),
  ]);
  const countByStatus = (rows: Array<{ status: string }>, status: string) =>
    rows.filter((row) => row.status === status).length;
  return school
    ? {
        ...school,
        recentAuditEvents,
        contentEntitlements: {
          books: {
            assigned: school._count.bookEntitlements,
            active: countByStatus(bookEntitlementRows, "ACTIVE"),
            paused: countByStatus(bookEntitlementRows, "PAUSED"),
            revoked: countByStatus(bookEntitlementRows, "REVOKED"),
          },
          resources: {
            assigned: school._count.resourceEntitlements,
            active: countByStatus(resourceEntitlementRows, "ACTIVE"),
            paused: countByStatus(resourceEntitlementRows, "PAUSED"),
            revoked: countByStatus(resourceEntitlementRows, "REVOKED"),
          },
        },
      }
    : null;
}
