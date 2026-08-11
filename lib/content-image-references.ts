import { prisma } from "@/lib/prisma";

export type ImageContentReference = {
  bookTitle: string;
  location: string;
};

export function containsImageResource(value: unknown, resourceId: string): boolean {
  if (Array.isArray(value)) return value.some((entry) => containsImageResource(entry, resourceId));
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.resourceId === resourceId) return true;
  if (record.targetType === "RESOURCE" && record.targetId === resourceId) return true;
  return Object.values(record).some((entry) => containsImageResource(entry, resourceId));
}

/**
 * V2 image frames are stored in document JSON rather than relational rows.
 * Scan publisher-owned authoring content before the deliberate library archive.
 */
export async function findPublisherImageContentReferences(publisherId: string, resourceId: string): Promise<ImageContentReference[]> {
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
  ].filter(({ entry }) => containsImageResource(entry.content, resourceId))
    .map(({ entry, kind }) => ({ bookTitle: entry.book.title, location: kind + ": " + entry.title }));
}
