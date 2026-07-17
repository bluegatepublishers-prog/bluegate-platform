import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export async function getClasses() {
  await requireLivePublisherAdmin();
  return prisma.class.findMany({
    orderBy: {
      sortOrder: "asc",
    },
  });
}

export async function getClass(id: string) {
  await requireLivePublisherAdmin();
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
  void data;
  throw new Error("Global master data changes require platform authorization.");
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
  void id; void data;
  throw new Error("Global master data changes require platform authorization.");
}

export async function deleteClass(id: string) {
  void id;
  throw new Error("Global master data changes require platform authorization.");
}
