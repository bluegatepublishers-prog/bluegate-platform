import { notFound } from "next/navigation";
import type { Prisma, ResourceType } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function requireSchool() {
  const user = await requireUser(["SCHOOL"]);
  const school = await prisma.school.findUnique({ where: { userId: user.id }, include: { user: true } });
  if (!school) notFound();
  return school;
}

export async function getSchoolDashboard() {
  const school = await requireSchool();
  const [teachers, resources, requests] = await prisma.$transaction([
    prisma.teacher.count({ where: { schoolName: { equals: school.schoolName, mode: "insensitive" } } }),
    prisma.resource.count({ where: { published: true } }),
    prisma.inspectionRequest.count({ where: { schoolId: school.id } }),
  ]);
  return { school, stats: { teachers, resources, requests } };
}

export async function getSchoolTeachers(query?: string) {
  const school = await requireSchool();
  return prisma.teacher.findMany({
    where: {
      schoolName: { equals: school.schoolName, mode: "insensitive" },
      OR: query ? [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { subject: { contains: query, mode: "insensitive" } },
        { classes: { contains: query, mode: "insensitive" } },
      ] : undefined,
    }, include: { user: true }, orderBy: { user: { name: "asc" } },
  });
}

export async function getSchoolResources(filters: { query?: string; classLevel?: string; subject?: string; type?: ResourceType }) {
  await requireSchool();
  const where: Prisma.ResourceWhereInput = {
    published: true, classLevel: filters.classLevel || undefined, subject: filters.subject || undefined, type: filters.type,
    OR: filters.query ? [
      { title: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { subject: { contains: filters.query, mode: "insensitive" } },
    ] : undefined,
  };
  const [resources, classes, subjects] = await prisma.$transaction([
    prisma.resource.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.resource.findMany({ where: { published: true }, distinct: ["classLevel"], select: { classLevel: true }, orderBy: { classLevel: "asc" } }),
    prisma.resource.findMany({ where: { published: true }, distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
  ]);
  return { resources, classes, subjects };
}

export async function getSchoolInspectionRequests() {
  const school = await requireSchool();
  return prisma.inspectionRequest.findMany({ where: { schoolId: school.id }, orderBy: { createdAt: "desc" } });
}
