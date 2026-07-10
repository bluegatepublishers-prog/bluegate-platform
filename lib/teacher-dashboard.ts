import { notFound } from "next/navigation";
import type { Prisma, ResourceType } from "@prisma/client";

import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function requireTeacher() {
  const user = await requireUser(["TEACHER"]);
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });

  if (!teacher) notFound();
  return teacher;
}

export async function getTeacherDashboard() {
  const teacher = await requireTeacher();
  const [downloads, bookmarks, resources, latestResources, recentDownloads] =
    await prisma.$transaction([
      prisma.download.count({ where: { teacherId: teacher.id } }),
      prisma.bookmark.count({ where: { teacherId: teacher.id } }),
      prisma.resource.count({ where: { published: true } }),
      prisma.resource.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.download.findMany({
        where: { teacherId: teacher.id, resource: { published: true } },
        include: { resource: true },
        orderBy: { downloadedAt: "desc" },
        take: 5,
      }),
    ]);

  return { teacher, stats: { downloads, bookmarks, resources }, latestResources, recentDownloads };
}

export async function getResources(filters: {
  query?: string;
  classLevel?: string;
  subject?: string;
  type?: ResourceType;
}) {
  const teacher = await requireTeacher();
  const where: Prisma.ResourceWhereInput = {
    published: true,
    classLevel: filters.classLevel || undefined,
    subject: filters.subject || undefined,
    type: filters.type,
    OR: filters.query
      ? [
          { title: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { subject: { contains: filters.query, mode: "insensitive" } },
        ]
      : undefined,
  };

  const [resources, classes, subjects, bookmarks] = await prisma.$transaction([
    prisma.resource.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.resource.findMany({ distinct: ["classLevel"], select: { classLevel: true }, orderBy: { classLevel: "asc" } }),
    prisma.resource.findMany({ distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
    prisma.bookmark.findMany({ where: { teacherId: teacher.id }, select: { resourceId: true } }),
  ]);

  return { resources, classes, subjects, bookmarkedIds: new Set(bookmarks.map((item) => item.resourceId)) };
}

export async function getDownloads(query?: string) {
  const teacher = await requireTeacher();
  return prisma.download.findMany({
    where: {
      teacherId: teacher.id,
      resource: { published: true, ...(query ? { OR: [
            { title: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
            { classLevel: { contains: query, mode: "insensitive" } },
          ] } : {}) },
    },
    include: { resource: true },
    orderBy: { downloadedAt: "desc" },
  });
}

export async function getBookmarks(query?: string) {
  const teacher = await requireTeacher();
  return prisma.bookmark.findMany({
    where: {
      teacherId: teacher.id,
      resource: { published: true, ...(query ? { OR: [
            { title: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
            { classLevel: { contains: query, mode: "insensitive" } },
          ] } : {}) },
    },
    include: { resource: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResourceDetails(id: string) {
  const teacher = await requireTeacher();
  const resource = await prisma.resource.findFirst({ where: { id, published: true } });
  if (!resource) notFound();
  const [bookmark, related] = await Promise.all([
    prisma.bookmark.findFirst({ where: { teacherId: teacher.id, resourceId: id } }),
    prisma.resource.findMany({
      where: { published: true, id: { not: id }, OR: [{ subject: resource.subject }, { classLevel: resource.classLevel }] },
      orderBy: { createdAt: "desc" }, take: 4,
    }),
  ]);
  return { resource, related, bookmarked: Boolean(bookmark) };
}
