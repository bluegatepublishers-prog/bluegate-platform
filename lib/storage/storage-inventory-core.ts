import type { PrismaClient } from "@prisma/client";
import { makeStorageRecord, type StorageFileRecord } from "./storage-records";

type StorageInventoryDatabase = Pick<PrismaClient, "publisher" | "school" | "book" | "resource">;

export async function scanStorageInventoryWithDatabase(
  database: StorageInventoryDatabase,
  publisherId: string,
): Promise<StorageFileRecord[]> {
  const [publisher, schools, books, resources] = await Promise.all([
    database.publisher.findUnique({
      where: { id: publisherId },
      select: { id: true, name: true, createdAt: true, logoUrl: true, faviconUrl: true },
    }),
    database.school.findMany({
      where: { publisherId },
      select: { id: true, schoolName: true, logoUrl: true, user: { select: { createdAt: true } } },
    }),
    database.book.findMany({
      where: { publisherId },
      select: { id: true, title: true, createdAt: true, coverImage: true, samplePdf: true, publicPreviewPdf: true, fullBookPdf: true, galleryImages: true },
    }),
    database.resource.findMany({
      where: { publisherId },
      select: { id: true, title: true, createdAt: true, fileUrl: true, originalFileName: true, mimeType: true, fileSizeBytes: true, thumbnail: true },
    }),
  ]);
  if (!publisher) return [];
  const files: StorageFileRecord[] = [];
  const add = (record: Parameters<typeof makeStorageRecord>[0]) => {
    if (record.value.trim()) files.push(makeStorageRecord(record));
  };
  for (const [field, value, scope] of [
    ["logoUrl", publisher.logoUrl, "publisher-logo"],
    ["faviconUrl", publisher.faviconUrl, "publisher-favicon"],
  ] as const) if (value) add({ entityType: "Publisher", entityId: publisher.id, field, publisherId, publisherName: publisher.name, title: publisher.name, value, scope, sizeBytes: null, createdAt: publisher.createdAt });

  for (const school of schools) if (school.logoUrl) add({ entityType: "School", entityId: school.id, field: "logoUrl", publisherId, publisherName: publisher.name, schoolId: school.id, title: school.schoolName, value: school.logoUrl, scope: "school-logo", sizeBytes: null, createdAt: school.user.createdAt });

  for (const book of books) {
    for (const [field, value, scope] of [
      ["coverImage", book.coverImage, "book-cover"], ["samplePdf", book.samplePdf, "book-sample"],
      ["publicPreviewPdf", book.publicPreviewPdf, "book-public-preview"], ["fullBookPdf", book.fullBookPdf, "book-full"],
    ] as const) if (value) add({ entityType: "Book", entityId: book.id, field, publisherId, publisherName: publisher.name, title: book.title, value, scope, sizeBytes: null, createdAt: book.createdAt });
    book.galleryImages.forEach((value, arrayIndex) => add({ entityType: "Book", entityId: book.id, field: "galleryImages", arrayIndex, publisherId, publisherName: publisher.name, title: book.title, value, scope: "book-gallery", sizeBytes: null, createdAt: book.createdAt }));
  }

  for (const resource of resources) {
    add({ entityType: "Resource", entityId: resource.id, field: "fileUrl", publisherId, publisherName: publisher.name, title: resource.title, value: resource.fileUrl, scope: "resource-file", filename: resource.originalFileName, mimeType: resource.mimeType, sizeBytes: resource.fileSizeBytes === null ? null : Number(resource.fileSizeBytes), createdAt: resource.createdAt });
    if (resource.thumbnail) add({ entityType: "Resource", entityId: resource.id, field: "thumbnail", publisherId, publisherName: publisher.name, title: resource.title, value: resource.thumbnail, scope: "resource-thumbnail", sizeBytes: null, createdAt: resource.createdAt });
  }
  return files;
}
