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
  void data;
  throw new Error("Global master data changes require platform authorization.");
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
  void id; void data;
  throw new Error("Global master data changes require platform authorization.");
}

export async function deleteSubject(id: string) {
  void id;
  throw new Error("Global master data changes require platform authorization.");
}
