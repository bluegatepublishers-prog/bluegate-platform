import { notFound } from "next/navigation";
import type { Prisma, ResourceType } from "@prisma/client";

import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getTeacherResourceScope } from "@/lib/resource-audience";
import { requireTeacherResourceEntitlementAccess } from "@/lib/entitlements/resource";

export async function requireTeacher() {
  const user = await requireUser(["TEACHER"]);
  const teacher = await prisma.teacher.findFirst({
    where: { userId: user.id, active: true, status: "APPROVED", school: { status: "APPROVED", publisher: { active: true } } },
    include: { user: true, school: true },
  });

  if (!teacher) notFound();
  return teacher;
}

export async function getTeacherDashboard() {
  const teacher = await requireTeacher();
  const resourceScope=await getTeacherResourceScope(teacher.userId); if(!resourceScope)notFound();
  const [downloads, bookmarks, resources, latestResources, recentDownloads, teachingAssignments] =
    await prisma.$transaction([
      prisma.download.count({ where: { teacherId: teacher.id } }),
      prisma.bookmark.count({ where: { teacherId: teacher.id } }),
      prisma.resource.count({ where: resourceScope.where }),
      prisma.resource.findMany({ where: resourceScope.where, orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.download.findMany({
        where: { teacherId: teacher.id, resource: resourceScope.where },
        include: { resource: true },
        orderBy: { downloadedAt: "desc" },
        take: 5,
      }),
      prisma.teacherAssignment.findMany({
        where: { teacherId: teacher.id, active: true, type: "SUBJECT_TEACHER", schoolClass: { active: true }, section: { active: true } },
        include: { academicYear: true, schoolClass: true, section: true, subject: true },
        orderBy: [{ academicYear: { startDate: "desc" } }, { schoolClass: { sortOrder: "asc" } }, { section: { name: "asc" } }],
      }),
    ]);

  const sectionSubjects = teachingAssignments.length ? await prisma.sectionSubject.findMany({
    where: { active: true, sectionId: { in: [...new Set(teachingAssignments.map((assignment) => assignment.sectionId))] } },
    include: { bookAdoptions: { where: { status: "APPROVED", active: true, publisherId: teacher.school?.publisherId }, include: { book: { include: { series: true } } } }, resources: { where: { publisherId: teacher.school?.publisherId, published: true }, orderBy: { title: "asc" } } },
  }) : [];
  const assignedClasses = teachingAssignments.map((assignment) => ({
    ...assignment,
    content: (() => { const item=sectionSubjects.find((candidate) => candidate.sectionId === assignment.sectionId && candidate.subjectId === assignment.subjectId); if(!item)return null; const adoption=item.bookAdoptions.find(candidate=>candidate.academicYearId===assignment.academicYearId); return adoption?{...item,book:adoption.book}:null; })(),
  }));

  return { teacher, stats: { downloads, bookmarks, resources }, latestResources, recentDownloads, assignedClasses };
}

export async function getResources(filters: {
  query?: string;
  classLevel?: string;
  subject?: string;
  type?: ResourceType;
}) {
  const teacher = await requireTeacher();
  const resourceScope=await getTeacherResourceScope(teacher.userId);if(!resourceScope)notFound();
  const where: Prisma.ResourceWhereInput = {
    ...resourceScope.where,
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
    prisma.resource.findMany({ where:resourceScope.where,distinct: ["classLevel"], select: { classLevel: true }, orderBy: { classLevel: "asc" } }),
    prisma.resource.findMany({ where:resourceScope.where,distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
    prisma.bookmark.findMany({ where: { teacherId: teacher.id }, select: { resourceId: true } }),
  ]);

  return { resources, classes, subjects, bookmarkedIds: new Set(bookmarks.map((item) => item.resourceId)) };
}

export async function getDownloads(query?: string) {
  const teacher = await requireTeacher();
  const resourceScope=await getTeacherResourceScope(teacher.userId);if(!resourceScope)notFound();
  return prisma.download.findMany({
    where: {
      teacherId: teacher.id,
      resource: { ...resourceScope.where, ...(query ? { OR: [
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
  const resourceScope=await getTeacherResourceScope(teacher.userId);if(!resourceScope)notFound();
  return prisma.bookmark.findMany({
    where: {
      teacherId: teacher.id,
      resource: { ...resourceScope.where, ...(query ? { OR: [
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
  const access=await requireTeacherResourceEntitlementAccess(teacher.userId,id);if(!access)notFound();const resource=access.resource;
  const resourceScope=await getTeacherResourceScope(teacher.userId);if(!resourceScope)notFound();
  const [bookmark, related] = await Promise.all([
    prisma.bookmark.findFirst({ where: { teacherId: teacher.id, resourceId: id } }),
    prisma.resource.findMany({
      where: { ...resourceScope.where, id: { not: id }, OR: [{ subject: resource.subject }, { classLevel: resource.classLevel }] },
      orderBy: { createdAt: "desc" }, take: 4,
    }),
  ]);
  return { resource, related, bookmarked: Boolean(bookmark) };
}
