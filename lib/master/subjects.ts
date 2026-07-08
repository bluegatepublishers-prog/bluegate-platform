import { prisma } from "@/lib/prisma";

export async function getSubjects() {
  return prisma.subject.findMany({
    orderBy: {
      sortOrder: "asc",
    },
  });
}

export async function getSubject(id: string) {
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
  return prisma.subject.create({
    data,
  });
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
  return prisma.subject.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteSubject(id: string) {
  return prisma.subject.delete({
    where: {
      id,
    },
  });
}