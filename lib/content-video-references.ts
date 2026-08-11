import { prisma } from "@/lib/prisma";

export type VideoContentReference = {
  bookTitle: string;
  location: string;
};

function containsVideoResource(value: unknown, resourceId: string): boolean {
  if (Array.isArray(value)) return value.some((entry) => containsVideoResource(entry, resourceId));
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.resourceId === resourceId) return true;
  if (record.targetType === "RESOURCE" && record.targetId === resourceId) return true;
  return Object.values(record).some((entry) => containsVideoResource(entry, resourceId));
}

/**
 * V2 frame references are document JSON rather than relational rows. This
 * read-only scan is used only before the deliberate library archive action.
 */
export async function findPublisherVideoContentReferences(publisherId: string, resourceId: string): Promise<VideoContentReference[]> {
  const [parts, units, chapters, modules, topics] = await Promise.all([
    prisma.bookPart.findMany({ where: { book: { publisherId } }, select: { title: true, content: true, book: { select: { title: true } } } }),
    prisma.bookUnit.findMany({ where: { book: { publisherId } }, select: { title: true, content: true, book: { select: { title: true } } } }),
    prisma.bookChapter.findMany({ where: { book: { publisherId } }, select: { title: true, content: true, book: { select: { title: true } } } }),
    prisma.bookModule.findMany({ where: { book: { publisherId } }, select: { title: true, content: true, book: { select: { title: true } } } }),
    prisma.bookTopic.findMany({ where: { book: { publisherId } }, select: { title: true, content: true, book: { select: { title: true } } } }),
  ]);
  return [
    ...parts.map((entry) => ({ entry, kind: "Part" })),
    ...units.map((entry) => ({ entry, kind: "Unit" })),
    ...chapters.map((entry) => ({ entry, kind: "Chapter" })),
    ...modules.map((entry) => ({ entry, kind: "Module" })),
    ...topics.map((entry) => ({ entry, kind: "Topic" })),
  ].filter(({ entry }) => containsVideoResource(entry.content, resourceId))
    .map(({ entry, kind }) => ({ bookTitle: entry.book.title, location: kind + ": " + entry.title }));
}
