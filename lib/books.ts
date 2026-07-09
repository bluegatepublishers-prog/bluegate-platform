import { prisma } from "@/lib/prisma";
import { toBookPersistenceData } from "@/lib/book-form-data";
import type { BookFormData } from "@/types/book-form";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function getBooks() {
  return prisma.book.findMany({
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
  return prisma.book.findUnique({
    where: {
      id,
    },
    include: {
      class: true,
      subject: true,
      series: true,
    },
  });
}

export async function createBook(data: BookFormData) {
  return prisma.book.create({
    data: {
      ...toBookPersistenceData(data),
      slug: generateSlug(data.title),
    },
  });
}

export async function updateBook(
  id: string,
  data: BookFormData
) {
  return prisma.book.update({
    where: {
      id,
    },
    data: {
      ...toBookPersistenceData(data),
      slug: generateSlug(data.title),
    },
  });
}

export async function deleteBook(id: string) {
  return prisma.book.delete({
    where: {
      id,
    },
  });
}
