import "server-only";

import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "./provider";
import type { BlobMigrationDependencies } from "./blob-migration";
import type { StorageFileRecord } from "./storage-records";

export function createBlobMigrationDependencies(): BlobMigrationDependencies {
  const provider = getStorageProvider();
  return {
    async fetchSource(url) {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com")) throw new Error("Unsupported migration source.");
      const response = await fetch(url, { redirect: "error" });
      if (!response.ok) throw new Error("Blob source is unavailable.");
      const body = new Uint8Array(await response.arrayBuffer());
      return { body, contentType: response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "application/octet-stream", sizeBytes: body.byteLength };
    },
    headObject: key => provider.headObject({ key }),
    putObject: input => provider.putObject({ key: input.key, body: input.body, contentType: input.contentType, customMetadata: input.metadata }),
    updateReference,
  };
}

async function updateReference(input: { file: StorageFileRecord; expectedValue: string; nextValue: string }) {
  const { file, expectedValue, nextValue } = input;
  if (file.entityType === "Resource") {
    if (file.field === "fileUrl") {
      const result = await prisma.resource.updateMany({ where: { id: file.entityId, publisherId: file.publisherId, fileUrl: expectedValue }, data: { fileUrl: nextValue } });
      return result.count === 1;
    }
    const result = await prisma.resource.updateMany({ where: { id: file.entityId, publisherId: file.publisherId, thumbnail: expectedValue }, data: { thumbnail: nextValue } });
    return result.count === 1;
  }
  if (file.entityType === "Book") {
    if (file.field === "galleryImages") {
      return prisma.$transaction(async tx => {
        const book = await tx.book.findFirst({ where: { id: file.entityId, publisherId: file.publisherId }, select: { galleryImages: true } });
        if (!book || file.arrayIndex === undefined || book.galleryImages[file.arrayIndex] !== expectedValue) return false;
        const galleryImages = [...book.galleryImages];
        galleryImages[file.arrayIndex] = nextValue;
        await tx.book.update({ where: { id: file.entityId }, data: { galleryImages } });
        return true;
      });
    }
    const field = file.field as "coverImage" | "samplePdf" | "publicPreviewPdf" | "fullBookPdf";
    const result = await prisma.book.updateMany({ where: { id: file.entityId, publisherId: file.publisherId, [field]: expectedValue }, data: { [field]: nextValue } });
    return result.count === 1;
  }
  if (file.entityType === "School") {
    const result = await prisma.school.updateMany({ where: { id: file.entityId, publisherId: file.publisherId, logoUrl: expectedValue }, data: { logoUrl: nextValue } });
    return result.count === 1;
  }
  const field = file.field as "logoUrl" | "faviconUrl";
  const result = await prisma.publisher.updateMany({ where: { id: file.entityId, [field]: expectedValue }, data: { [field]: nextValue } });
  return result.count === 1;
}
