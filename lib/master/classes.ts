"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  await requireLivePublisherAdmin();

  const existing = await prisma.class.findUnique({
    where: { code: data.code },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A class with this code already exists.");
  }

  await prisma.class.create({ data });
  revalidatePath("/admin/master/classes");
  redirect("/admin/master/classes");
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
  await requireLivePublisherAdmin();

  const existing = await prisma.class.findUnique({
    where: { code: data.code ?? "" },
    select: { id: true },
  });

  if (existing && existing.id !== id) {
    throw new Error("A class with this code already exists.");
  }

  await prisma.class.update({ where: { id }, data });
  revalidatePath("/admin/master/classes");
  redirect("/admin/master/classes");
}

export async function deleteClass(id: string) {
  await requireLivePublisherAdmin();

  const dependencyCount = await prisma.book.count({ where: { classId: id } });

  if (dependencyCount > 0) {
    throw new Error(
      `Cannot delete this class because ${dependencyCount} book${dependencyCount === 1 ? "" : "s"} reference it.`,
    );
  }

  await prisma.class.delete({ where: { id } });
  revalidatePath("/admin/master/classes");
  redirect("/admin/master/classes");
}
