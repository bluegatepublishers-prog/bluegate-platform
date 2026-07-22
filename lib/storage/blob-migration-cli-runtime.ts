import { HeadObjectCommand, PutObjectCommand, S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import type { PrismaClient } from "@prisma/client";
import { getR2Config } from "./config-core";
import { normalizeAndValidateObjectKey } from "./object-key";
import type { BlobMigrationDependencies } from "./blob-migration";
import type { StorageFileRecord } from "./storage-records";

export function createBlobMigrationCliDependencies(prisma: PrismaClient): BlobMigrationDependencies {
  const config = getR2Config();
  const client = new S3Client({ region: "auto", endpoint: config.endpoint, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return {
    async fetchSource(url) {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com")) throw new Error("Unsupported migration source.");
      const response = await fetch(url, { redirect: "error" });
      if (!response.ok) throw new Error("Blob source is unavailable.");
      const body = new Uint8Array(await response.arrayBuffer());
      return { body, contentType: response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "application/octet-stream", sizeBytes: body.byteLength };
    },
    async headObject(rawKey) {
      const key = normalizeAndValidateObjectKey(rawKey);
      try {
        const object = await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: key }));
        return { key, contentType: object.ContentType, contentLength: object.ContentLength, eTag: object.ETag?.replaceAll('"', ""), lastModified: object.LastModified, customMetadata: object.Metadata };
      } catch (error) {
        if (error instanceof S3ServiceException && (error.name === "NotFound" || error.$metadata.httpStatusCode === 404)) return null;
        throw new Error("R2 object verification failed.");
      }
    },
    async putObject(input) {
      const key = normalizeAndValidateObjectKey(input.key);
      await client.send(new PutObjectCommand({ Bucket: config.bucketName, Key: key, Body: input.body, ContentType: input.contentType, Metadata: input.metadata }));
      return { key, contentType: input.contentType, contentLength: input.body.byteLength, customMetadata: input.metadata };
    },
    updateReference: input => updateReference(prisma, input),
  };
}

async function updateReference(prisma: PrismaClient, input: { file: StorageFileRecord; expectedValue: string; nextValue: string }) {
  const { file, expectedValue, nextValue } = input;
  if (file.entityType === "Resource") {
    const field = file.field as "fileUrl" | "thumbnail";
    const result = await prisma.resource.updateMany({ where: { id: file.entityId, publisherId: file.publisherId, [field]: expectedValue }, data: { [field]: nextValue } });
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
