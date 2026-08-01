import "server-only";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { notFound } from "next/navigation";

export async function requirePublisherAdminBookOwnership(bookId: string) {
  const actor = await requireLivePublisherAdmin();
  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!book) notFound();
  return actor;
}

export async function requirePublisherAdminResourceOwnership(resourceId: string) {
  const actor = await requireLivePublisherAdmin();
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!resource) notFound();
  return actor;
}

export async function requirePublisherAdminSchoolOwnership(schoolId: string) {
  const actor = await requireLivePublisherAdmin();
  const school = await prisma.school.findFirst({
    where: { id: schoolId, publisherId: actor.publisherId },
    select: { id: true },
  });
  if (!school) notFound();
  return actor;
}

export async function requirePublisherAdminTeacherOwnership(teacherId: string) {
  const actor = await requireLivePublisherAdmin();
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, school: { publisherId: actor.publisherId } },
    select: { id: true },
  });
  if (!teacher) notFound();
  return actor;
}

export async function validatePublisherAdminBookRelations(input: {
  publisherId: string;
  classId: string;
  subjectId: string;
  seriesId: string | null;
  boardId: string | null;
  allowInactiveBoardId?: string | null;
}) {
  const [bookClass, subject, series, board] = await Promise.all([
    prisma.class.findFirst({ where: { id: input.classId, active: true }, select: { id: true } }),
    prisma.subject.findFirst({ where: { id: input.subjectId, active: true }, select: { id: true } }),
    input.seriesId
      ? prisma.bookSeries.findFirst({
          where: { id: input.seriesId, publisherId: input.publisherId, active: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.boardId
      ? prisma.board.findFirst({
          where: {
            id: input.boardId,
            publisherId: input.publisherId,
            OR: [{ active: true }, ...(input.allowInactiveBoardId === input.boardId ? [{ id: input.boardId }] : [])],
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return Boolean(bookClass && subject && (!input.seriesId || series) && (!input.boardId || board));
}
