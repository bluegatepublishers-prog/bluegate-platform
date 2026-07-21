import "server-only";

import { prisma } from "@/lib/prisma";

export interface ResourceFormOption {
  id: string;
  name: string;
}

export interface ResourceBookOption {
  id: string;
  title: string;
  classId: string;
  subjectId: string;
  seriesId: string | null;
  className: string;
  subjectName: string;
  seriesName: string | null;
}

export interface ResourceFormOptions {
  classes: ResourceFormOption[];
  subjects: ResourceFormOption[];
  series: ResourceFormOption[];
  books: ResourceBookOption[];
}

export async function getResourceFormOptions(publisherId: string): Promise<ResourceFormOptions> {
  const [classes, subjects, series, books] = await Promise.all([
    prisma.class.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.bookSeries.findMany({
      where: { publisherId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.book.findMany({
      where: { publisherId },
      select: {
        id: true,
        title: true,
        classId: true,
        subjectId: true,
        seriesId: true,
        class: { select: { name: true } },
        subject: { select: { name: true } },
        series: { select: { name: true } },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    classes,
    subjects,
    series,
    books: books.map((book) => ({
      id: book.id,
      title: book.title,
      classId: book.classId,
      subjectId: book.subjectId,
      seriesId: book.seriesId,
      className: book.class.name,
      subjectName: book.subject.name,
      seriesName: book.series?.name ?? null,
    })),
  };
}
