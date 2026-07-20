"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export async function getSubjects() {
  await requireLivePublisherAdmin();
  return prisma.subject.findMany({
    orderBy: {
      sortOrder: "asc",
    },
  });
}

export async function getSubject(id: string) {
  await requireLivePublisherAdmin();
  return prisma.subject.findUnique({
    where: {
      id,
    },
  });
}

export async function createSubject(data: {
  name: string;
  code: string;
  sortOrder: number;
  active: boolean;
}) {
  await requireLivePublisherAdmin();

  const existing = await prisma.subject.findUnique({
    where: { code: data.code },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A subject with this code already exists.");
  }

  await prisma.subject.create({ data });
  revalidatePath("/admin/master/subjects");
  redirect("/admin/master/subjects");
}

export async function updateSubject(
  id: string,
  data: {
    name?: string;
    code?: string;
    sortOrder?: number;
    active?: boolean;
  }
) {
  await requireLivePublisherAdmin();

  const existing = await prisma.subject.findUnique({
    where: { code: data.code ?? "" },
    select: { id: true },
  });

  if (existing && existing.id !== id) {
    throw new Error("A subject with this code already exists.");
  }

  await prisma.subject.update({ where: { id }, data });
  revalidatePath("/admin/master/subjects");
  redirect("/admin/master/subjects");
}

export async function deleteSubject(id: string) {
  await requireLivePublisherAdmin();

  const [books, sectionSubjects, teacherAssignments, studentAnalytics, teacherAnalytics, learningTimeline, skillAnalytics, learningGaps] = await Promise.all([
    prisma.book.count({ where: { subjectId: id } }),
    prisma.sectionSubject.count({ where: { subjectId: id } }),
    prisma.teacherAssignment.count({ where: { subjectId: id } }),
    prisma.studentSubjectAnalytics.count({ where: { subjectId: id } }),
    prisma.teacherAnalytics.count({ where: { subjectId: id } }),
    prisma.learningTimeline.count({ where: { subjectId: id } }),
    prisma.studentSkillAnalytics.count({ where: { subjectId: id } }),
    prisma.studentLearningGap.count({ where: { subjectId: id } }),
  ]);

  const dependencyCount = books + sectionSubjects + teacherAssignments + studentAnalytics + teacherAnalytics + learningTimeline + skillAnalytics + learningGaps;

  if (dependencyCount > 0) {
    throw new Error(
      `Cannot delete this subject because ${dependencyCount} record${dependencyCount === 1 ? "" : "s"} still reference it.`,
    );
  }

  await prisma.subject.delete({ where: { id } });
  revalidatePath("/admin/master/subjects");
  redirect("/admin/master/subjects");
}
