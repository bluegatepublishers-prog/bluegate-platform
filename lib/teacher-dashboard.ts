import { notFound, redirect } from "next/navigation";
import type { Prisma, ResourceAudience, ResourceType } from "@prisma/client";

import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getTeacherResourceAccessState } from "@/lib/resource-audience";
import { requireTeacherResourceEntitlementAccess } from "@/lib/entitlements/resource";

export async function requireTeacher() {
  const user = await requireUser(["TEACHER"]);
  const teacher = await prisma.teacher.findFirst({
    where: {
      userId: user.id,
      active: true,
      status: "APPROVED",
      school: { status: "APPROVED", publisher: { active: true } },
    },
    include: {
      user: true,
      school: true,
      schoolMemberships: {
        where: { active: true, status: "ACTIVE" },
        select: { schoolId: true },
      },
    },
  });

  if (!teacher || !teacher.schoolId || !teacher.schoolMemberships.some((membership) => membership.schoolId === teacher.schoolId)) notFound();
  return teacher;
}

export async function getTeacherDashboard() {
  const teacher = await requireTeacher();
  const access = await getTeacherResourceAccessState(teacher.userId);
  if (access.status === "INVALID_SCOPE") notFound();
  if (access.status === "NO_ASSIGNMENTS" || access.status === "NO_ENTITLEMENTS" || access.status === "RESOURCES_DISABLED") {
    return {
      status: access.status,
      teacher,
      stats: { downloads: 0, bookmarks: 0, resources: 0 },
      latestResources: [],
      recentDownloads: [],
      assignedClasses: [],
    } as const;
  }
  const resourceScope = access.resourceScope;

  const [downloads, bookmarks, resources, latestResources, recentDownloads, teachingAssignments] =
    await prisma.$transaction([
      prisma.download.count({ where: { teacherId: teacher.id } }),
      prisma.bookmark.count({ where: { teacherId: teacher.id } }),
      prisma.resource.count({ where: resourceScope.where }),
      prisma.resource.findMany({
        where: resourceScope.where,
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          classRef: { select: { name: true } },
          subjectRef: { select: { name: true } },
          seriesRef: { select: { name: true } },
          book: { select: { title: true } },
        },
      }),
      prisma.download.findMany({
        where: { teacherId: teacher.id, resource: resourceScope.where },
        include: {
          resource: {
            include: {
              classRef: { select: { name: true } },
              subjectRef: { select: { name: true } },
              seriesRef: { select: { name: true } },
              book: { select: { title: true } },
            },
          },
        },
        orderBy: { downloadedAt: "desc" },
        take: 5,
      }),
      prisma.teacherAssignment.findMany({
        where: {
          teacherId: teacher.id,
          active: true,
          type: "SUBJECT_TEACHER",
          schoolClass: { active: true },
          section: { active: true },
        },
        include: {
          academicYear: true,
          schoolClass: true,
          section: true,
          subject: true,
        },
        orderBy: [
          { academicYear: { startDate: "desc" } },
          { schoolClass: { sortOrder: "asc" } },
          { section: { name: "asc" } },
        ],
      }),
    ]);

  const sectionSubjects = teachingAssignments.length
    ? await prisma.sectionSubject.findMany({
        where: {
          active: true,
          sectionId: {
            in: [...new Set(teachingAssignments.map((assignment) => assignment.sectionId))],
          },
        },
        include: {
          bookAdoptions: {
            where: {
              status: "APPROVED",
              active: true,
              publisherId: teacher.school?.publisherId,
            },
            include: { book: { include: { series: true } } },
          },
          resources: {
            where: { publisherId: teacher.school?.publisherId, published: true },
            include: {
              classRef: { select: { name: true } },
              subjectRef: { select: { name: true } },
              seriesRef: { select: { name: true } },
              book: { select: { title: true } },
            },
            orderBy: { title: "asc" },
          },
        },
      })
    : [];

  const assignedClasses = teachingAssignments.map((assignment) => ({
    ...assignment,
    content: (() => {
      const item = sectionSubjects.find(
        (candidate) =>
          candidate.sectionId === assignment.sectionId &&
          candidate.subjectId === assignment.subjectId,
      );
      if (!item) return null;
      const adoption = item.bookAdoptions.find(
        (candidate) => candidate.academicYearId === assignment.academicYearId,
      );
      return adoption ? { ...item, book: adoption.book } : null;
    })(),
  }));

  return {
    status: "READY" as const,
    teacher,
    stats: { downloads, bookmarks, resources },
    latestResources,
    recentDownloads,
    assignedClasses,
  };
}

export async function getResources(filters: {
  query?: string;
  classId?: string;
  subjectId?: string;
  type?: ResourceType;
  seriesId?: string;
  bookId?: string;
  audience?: ResourceAudience;
}) {
  const teacher = await requireTeacher();
  const access = await getTeacherResourceAccessState(teacher.userId);
  if (access.status === "INVALID_SCOPE") notFound();
  if (access.status !== "READY") redirect("/teacher-dashboard");
  const resourceScope = access.resourceScope;

  const where: Prisma.ResourceWhereInput = {
    ...resourceScope.where,
    classId: filters.classId || undefined,
    subjectId: filters.subjectId || undefined,
    seriesId: filters.seriesId || undefined,
    bookId: filters.bookId || undefined,
    type: filters.type,
    audience: filters.audience,
    OR: filters.query
      ? [
          { title: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
        ]
      : undefined,
  };

  const [resources, allResources, bookmarks] = await prisma.$transaction([
    prisma.resource.findMany({
      where,
      include: {
        classRef: { select: { id: true, name: true } },
        subjectRef: { select: { id: true, name: true } },
        seriesRef: { select: { id: true, name: true } },
        book: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.resource.findMany({
      where: resourceScope.where,
      include: {
        classRef: { select: { id: true, name: true } },
        subjectRef: { select: { id: true, name: true } },
        seriesRef: { select: { id: true, name: true } },
        book: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bookmark.findMany({
      where: { teacherId: teacher.id },
      select: { resourceId: true },
    }),
  ]);

  const classes = uniqueById(
    allResources
      .map((item) => item.classRef)
      .filter((item): item is { id: string; name: string } => Boolean(item)),
  );
  const subjects = uniqueById(
    allResources
      .map((item) => item.subjectRef)
      .filter((item): item is { id: string; name: string } => Boolean(item)),
  );
  const series = uniqueById(
    allResources
      .map((item) => item.seriesRef)
      .filter((item): item is { id: string; name: string } => Boolean(item)),
  );
  const books = uniqueById(
    allResources
      .map((item) => item.book)
      .filter((item): item is { id: string; title: string } => Boolean(item)),
  );

  return {
    resources,
    classes,
    subjects,
    series,
    books,
    bookmarkedIds: new Set(bookmarks.map((item) => item.resourceId)),
  };
}

export async function getDownloads(query?: string) {
  const teacher = await requireTeacher();
  const access = await getTeacherResourceAccessState(teacher.userId);
  if (access.status === "INVALID_SCOPE") notFound();
  if (access.status !== "READY") redirect("/teacher-dashboard");
  const resourceScope = access.resourceScope;

  return prisma.download.findMany({
    where: {
      teacherId: teacher.id,
      resource: {
        ...resourceScope.where,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { subject: { contains: query, mode: "insensitive" } },
                { classLevel: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: {
      resource: {
        include: {
          classRef: { select: { name: true } },
          subjectRef: { select: { name: true } },
          seriesRef: { select: { name: true } },
          book: { select: { title: true } },
        },
      },
    },
    orderBy: { downloadedAt: "desc" },
  });
}

export async function getBookmarks(query?: string) {
  const teacher = await requireTeacher();
  const access = await getTeacherResourceAccessState(teacher.userId);
  if (access.status === "INVALID_SCOPE") notFound();
  if (access.status !== "READY") redirect("/teacher-dashboard");
  const resourceScope = access.resourceScope;

  return prisma.bookmark.findMany({
    where: {
      teacherId: teacher.id,
      resource: {
        ...resourceScope.where,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { subject: { contains: query, mode: "insensitive" } },
                { classLevel: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: {
      resource: {
        include: {
          classRef: { select: { name: true } },
          subjectRef: { select: { name: true } },
          seriesRef: { select: { name: true } },
          book: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResourceDetails(id: string) {
  const teacher = await requireTeacher();
  const scopeAccess = await getTeacherResourceAccessState(teacher.userId);
  if (scopeAccess.status === "INVALID_SCOPE") notFound();
  if (scopeAccess.status !== "READY") redirect("/teacher-dashboard");
  const entitlementAccess = await requireTeacherResourceEntitlementAccess(teacher.userId, id);
  if(!entitlementAccess)notFound();
  const resource=entitlementAccess.resource;
  const resourceScope = scopeAccess.resourceScope;

  const resourceDetails = await prisma.resource.findFirst({
    where: { id: resource.id, ...resourceScope.where },
    include: {
      classRef: { select: { id: true, name: true } },
      subjectRef: { select: { id: true, name: true } },
      seriesRef: { select: { id: true, name: true } },
      book: { select: { id: true, title: true } },
    },
  });

  if (!resourceDetails) notFound();

  const [bookmark, related] = await Promise.all([
    prisma.bookmark.findFirst({ where: { teacherId: teacher.id, resourceId: id } }),
    prisma.resource.findMany({
      where: {
        ...resourceScope.where,
        id: { not: id },
        OR: [
          { subjectId: resourceDetails.subjectId ?? undefined },
          { classId: resourceDetails.classId ?? undefined },
          { subject: resourceDetails.subject },
          { classLevel: resourceDetails.classLevel },
        ],
      },
      include: {
        classRef: { select: { name: true } },
        subjectRef: { select: { name: true } },
        seriesRef: { select: { name: true } },
        book: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return { resource: resourceDetails, related, bookmarked: Boolean(bookmark) };
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}
