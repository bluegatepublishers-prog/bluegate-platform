import { prisma } from "@/lib/prisma";
import { toBookPersistenceData } from "@/lib/book-form-data";
import type { BookFormData } from "@/types/book-form";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function getBooks() {
  const actor = await requireLivePublisherAdmin();
  return prisma.book.findMany({
    where: { publisherId: actor.publisherId },
    include: {
      class: true,
      subject: true,
      series: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getBook(id: string) {
  const actor = await requireLivePublisherAdmin();
  return prisma.book.findFirst({
    where: { id, publisherId: actor.publisherId },
    include: {
      class: true,
      subject: true,
      series: true,
    },
  });
}

export async function createBook(data: BookFormData) {
  const actor = await requireLivePublisherAdmin();
  return prisma.book.create({
    data: {
      ...toBookPersistenceData(data),
      slug: generateSlug(data.title),
      publisherId: actor.publisherId,
    },
  });
}

export async function updateBook(
  id: string,
  data: BookFormData
) {
  const actor = await requireLivePublisherAdmin();
  const updated = await prisma.book.updateMany({
    where: { id, publisherId: actor.publisherId },
    data: {
      ...toBookPersistenceData(data),
      slug: generateSlug(data.title),
    },
  });
  if (updated.count !== 1) return null;
  return prisma.book.findFirst({ where: { id, publisherId: actor.publisherId } });
}

export async function deleteBook(id: string) {
  const actor = await requireLivePublisherAdmin();
  return prisma.book.deleteMany({ where: { id, publisherId: actor.publisherId } });
}
