"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export async function getSeries() {
  const actor = await requireLivePublisherAdmin();
  return prisma.bookSeries.findMany({
    where: { publisherId: actor.publisherId },
    orderBy: { name: "asc" },
  });
}

export async function getSeriesItem(id: string) {
  const actor = await requireLivePublisherAdmin();
  return prisma.bookSeries.findFirst({
    where: { id, publisherId: actor.publisherId },
  });
}

export async function createSeries(data: {
  name: string;
  code: string;
  description: string;
  active: boolean;
}) {
  const actor = await requireLivePublisherAdmin();

  const existing = await prisma.bookSeries.findUnique({
    where: { code: data.code },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A series with this code already exists.");
  }

  await prisma.bookSeries.create({
    data: {
      ...data,
      publisherId: actor.publisherId,
    },
  });

  revalidatePath("/admin/master/series");
  redirect("/admin/master/series");
}

export async function updateSeries(
  id: string,
  data: {
    name: string;
    code: string;
    description: string;
    active: boolean;
  },
) {
  const actor = await requireLivePublisherAdmin();

  const existing = await prisma.bookSeries.findUnique({
    where: { code: data.code },
    select: { id: true },
  });

  if (existing && existing.id !== id) {
    throw new Error("A series with this code already exists.");
  }

  const current = await prisma.bookSeries.findFirst({
    where: { id, publisherId: actor.publisherId },
    select: { id: true },
  });

  if (!current) {
    throw new Error("Series not found.");
  }

  await prisma.bookSeries.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/master/series");
  redirect("/admin/master/series");
}

export async function deleteSeries(id: string) {
  const actor = await requireLivePublisherAdmin();

  const series = await prisma.bookSeries.findFirst({
    where: { id, publisherId: actor.publisherId },
    select: { id: true },
  });

  if (!series) {
    throw new Error("Series not found.");
  }

  const dependencyCount = await prisma.book.count({ where: { seriesId: id } });

  if (dependencyCount > 0) {
    throw new Error(
      `Cannot delete this series because ${dependencyCount} book${dependencyCount === 1 ? "" : "s"} reference it.`,
    );
  }

  await prisma.bookSeries.delete({ where: { id } });
  revalidatePath("/admin/master/series");
  redirect("/admin/master/series");
}