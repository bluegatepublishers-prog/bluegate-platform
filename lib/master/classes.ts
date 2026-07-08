import { prisma } from "@/lib/prisma";

export async function getClasses() {
  return prisma.class.findMany({
    orderBy: {
      sortOrder: "asc",
    },
  });
}

export async function getClass(id: string) {
  return prisma.class.findUnique({
    where: {
      id,
    },
  });
}

export async function createClass(data: {
  name: string;
  code: string;
  sortOrder: number;
  active: boolean;
}) {
  return prisma.class.create({
    data,
  });
}

export async function updateClass(
  id: string,
  data: {
    name?: string;
    code?: string;
    sortOrder?: number;
    active?: boolean;
  }
) {
  return prisma.class.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteClass(id: string) {
  return prisma.class.delete({
    where: {
      id,
    },
  });
}
