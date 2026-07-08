import { prisma } from "@/lib/prisma";

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

export async function createBook(data: {
  title: string;
  subtitle?: string;
  isbn?: string;
  description?: string;
  coverImage?: string;
  samplePdf?: string;
  featured?: boolean;
  published?: boolean;
  classId: string;
  subjectId: string;
  seriesId?: string | null;
}) {
  return prisma.book.create({
    data: {
      ...data,
      slug: generateSlug(data.title),
    },
  });
}

export async function updateBook(
  id: string,
  data: {
    title?: string;
    subtitle?: string;
    isbn?: string;
    description?: string;
    coverImage?: string;
    samplePdf?: string;
    featured?: boolean;
    published?: boolean;
    classId?: string;
    subjectId?: string;
    seriesId?: string | null;
  }
) {
  return prisma.book.update({
    where: {
      id,
    },
    data: {
      ...data,
      ...(data.title && {
        slug: generateSlug(data.title),
      }),
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