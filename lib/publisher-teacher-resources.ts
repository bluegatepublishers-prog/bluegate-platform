import "server-only";

import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage/provider";
import {
  extensionOf,
  uploadPrefixForScope,
  uploadRules,
} from "@/lib/storage/upload-policy";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";

const MAX_FOLDER_NAME_LENGTH = 160;

export class PublisherTeacherResourceError extends Error {}

export function defaultTeacherResourceTitle(fileName: string) {
  const name = fileName.trim();
  const extension = extensionOf(name);
  const title = name.slice(0, Math.max(0, name.length - extension.length)).trim();
  return title.slice(0, 255) || "Untitled PDF";
}

function normalizedFolderName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > MAX_FOLDER_NAME_LENGTH) {
    throw new PublisherTeacherResourceError("Enter a folder name of up to 160 characters.");
  }
  return name;
}

async function requireOwnedFolder(input: {
  publisherId: string;
  bookId: string;
  folderId: string | null;
}) {
  if (!input.folderId) return null;
  const folder = await prisma.publisherTeacherResourceFolder.findFirst({
    where: {
      id: input.folderId,
      publisherId: input.publisherId,
      bookId: input.bookId,
      archivedAt: null,
    },
    select: { id: true, parentFolderId: true, name: true },
  });
  if (!folder) throw new PublisherTeacherResourceError("The selected folder is unavailable.");
  return folder;
}

export async function listPublisherTeacherResources(input: {
  publisherId: string;
  bookId: string;
  folderId?: string | null;
}) {
  const currentFolder = await requireOwnedFolder({
    ...input,
    folderId: input.folderId ?? null,
  });
  const allFolders = await prisma.publisherTeacherResourceFolder.findMany({
    where: { publisherId: input.publisherId, bookId: input.bookId, archivedAt: null },
    select: { id: true, parentFolderId: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  const parentFolders = currentFolder ? allFolders : [];  const folders = await prisma.publisherTeacherResourceFolder.findMany({
    where: {
      publisherId: input.publisherId,
      bookId: input.bookId,
      parentFolderId: currentFolder?.id ?? null,
      archivedAt: null,
    },
    select: { id: true, parentFolderId: true, name: true, updatedAt: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  const resources = currentFolder ? await prisma.publisherTeacherResource.findMany({
    where: {
      publisherId: input.publisherId,
      bookId: input.bookId,
      folderId: currentFolder?.id ?? null,
      archivedAt: null,
    },
    select: {
      id: true,
      folderId: true,
      title: true,
      originalFileName: true,
      sizeBytes: true,
      published: true,
      updatedAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
  }) : [];
  const breadcrumb = currentFolder
    ? buildBreadcrumb(currentFolder, parentFolders)
    : [];
  return {
    currentFolder,
    breadcrumb,
    folders,
    resources: resources.map((resource) => ({ ...resource, sizeBytes: resource.sizeBytes.toString() })),
    folderOptions: allFolders,
  };
}

function buildBreadcrumb(
  current: { id: string; parentFolderId: string | null; name: string },
  all: Array<{ id: string; parentFolderId: string | null; name: string }>,
) {
  const byId = new Map(all.map((folder) => [folder.id, folder]));
  const result = [current];
  const seen = new Set([current.id]);
  let parentId = current.parentFolderId;
  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    result.unshift(parent);
    seen.add(parent.id);
    parentId = parent.parentFolderId;
  }
  return result;
}

export async function createPublisherTeacherResourceFolder(input: {
  publisherId: string;
  bookId: string;
  parentFolderId?: string | null;
  name: string;
}) {
  const parentFolderId = input.parentFolderId ?? null;
  await requireOwnedFolder({ ...input, folderId: parentFolderId });
  const name = normalizedFolderName(input.name);
  const existing = await prisma.publisherTeacherResourceFolder.findFirst({
    where: { bookId: input.bookId, parentFolderId, name },
    select: { id: true, archivedAt: true },
  });
  if (existing?.archivedAt === null) {
    throw new PublisherTeacherResourceError("A folder with this name already exists here.");
  }
  const order = await prisma.publisherTeacherResourceFolder.aggregate({
    where: { publisherId: input.publisherId, bookId: input.bookId, parentFolderId },
    _max: { sortOrder: true },
  });
  return prisma.publisherTeacherResourceFolder.create({
    data: {
      publisherId: input.publisherId,
      bookId: input.bookId,
      parentFolderId,
      name,
      sortOrder: (order._max.sortOrder ?? -1) + 1,
    },
    select: { id: true, name: true, parentFolderId: true },
  });
}

export async function renamePublisherTeacherResourceFolder(input: {
  publisherId: string;
  bookId: string;
  folderId: string;
  name: string;
}) {
  const folder = await requireOwnedFolder({ ...input, folderId: input.folderId });
  const name = normalizedFolderName(input.name);
  if (name === folder!.name) return folder;
  const sibling = await prisma.publisherTeacherResourceFolder.findFirst({
    where: { bookId: input.bookId, parentFolderId: folder!.parentFolderId, name, archivedAt: null },
    select: { id: true },
  });
  if (sibling) throw new PublisherTeacherResourceError("A folder with this name already exists here.");
  return prisma.publisherTeacherResourceFolder.update({ where: { id: folder!.id }, data: { name } });
}

export async function createPublisherTeacherResource(input: {
  publisherId: string;
  bookId: string;
  folderId: string | null;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
}) {
  if (extensionOf(input.originalFileName) !== ".pdf" || input.contentType.toLowerCase() !== "application/pdf") {
    throw new PublisherTeacherResourceError("Teacher Resources accept PDF files only.");
  }
  const folder = await requireOwnedFolder(input);
  const key = normalizeAndValidateObjectKey(input.objectKey);
  const prefix = `${uploadPrefixForScope("teacher-resource-pdf")}/${input.publisherId}/`;
  if (!key.startsWith(prefix)) throw new PublisherTeacherResourceError("The uploaded PDF is unavailable.");
  const provider = getStorageProvider();
  const metadata = await provider.headObject({ key });
  const maxSize = uploadRules["teacher-resource-pdf"].maxSize;
  if (!metadata || metadata.contentType?.toLowerCase() !== "application/pdf" || metadata.contentLength !== input.sizeBytes || !metadata.contentLength || metadata.contentLength > maxSize) {
    throw new PublisherTeacherResourceError("The uploaded PDF could not be verified.");
  }
  const bytes = await provider.getObjectBytes({ key, maxBytes: maxSize });
  if (new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new PublisherTeacherResourceError("The uploaded file is not a valid PDF.");
  }
  const order = await prisma.publisherTeacherResource.aggregate({
    where: { publisherId: input.publisherId, bookId: input.bookId, folderId: folder!.id, archivedAt: null },
    _max: { sortOrder: true },
  });
  return prisma.publisherTeacherResource.create({
    data: {
      publisherId: input.publisherId,
      bookId: input.bookId,
      folderId: folder!.id,
      title: defaultTeacherResourceTitle(input.originalFileName),
      objectKey: key,
      originalFileName: input.originalFileName.trim().slice(0, 255),
      contentType: "application/pdf",
      sizeBytes: BigInt(input.sizeBytes),
      sortOrder: (order._max.sortOrder ?? -1) + 1,
    },
    select: { id: true, title: true },
  });
}

async function requireOwnedResource(input: { publisherId: string; bookId: string; resourceId: string }) {
  const resource = await prisma.publisherTeacherResource.findFirst({
    where: { id: input.resourceId, publisherId: input.publisherId, bookId: input.bookId },
    select: { id: true, folderId: true, title: true, archivedAt: true },
  });
  if (!resource) throw new PublisherTeacherResourceError("The teacher resource is unavailable.");
  return resource;
}

export async function renamePublisherTeacherResource(input: { publisherId: string; bookId: string; resourceId: string; title: string }) {
  const resource = await requireOwnedResource(input);
  if (resource.archivedAt) throw new PublisherTeacherResourceError("Archived resources cannot be changed.");
  const title = input.title.trim().replace(/\s+/g, " ").slice(0, 255);
  if (!title) throw new PublisherTeacherResourceError("Enter a resource title.");
  return prisma.publisherTeacherResource.update({ where: { id: resource.id }, data: { title } });
}

export async function setPublisherTeacherResourcePublished(input: { publisherId: string; bookId: string; resourceId: string; published: boolean }) {
  const resource = await requireOwnedResource(input);
  if (resource.archivedAt) throw new PublisherTeacherResourceError("Archived resources cannot be published.");
  return prisma.publisherTeacherResource.update({ where: { id: resource.id }, data: { published: input.published } });
}

export async function movePublisherTeacherResource(input: { publisherId: string; bookId: string; resourceId: string; folderId: string }) {
  const resource = await requireOwnedResource(input);
  if (resource.archivedAt) throw new PublisherTeacherResourceError("Archived resources cannot be moved.");
  const folder = await requireOwnedFolder({ ...input, folderId: input.folderId });
  return prisma.publisherTeacherResource.update({ where: { id: resource.id }, data: { folderId: folder!.id } });
}

export async function archivePublisherTeacherResource(input: { publisherId: string; bookId: string; resourceId: string }) {
  const resource = await requireOwnedResource(input);
  if (resource.archivedAt) return resource;
  return prisma.publisherTeacherResource.update({ where: { id: resource.id }, data: { archivedAt: new Date(), published: false } });
}

export async function getPublisherTeacherResourceForDelivery(input: { publisherId: string; bookId: string; resourceId: string }) {
  return prisma.publisherTeacherResource.findFirst({
    where: { id: input.resourceId, publisherId: input.publisherId, bookId: input.bookId, archivedAt: null },
    select: { id: true, title: true, objectKey: true, originalFileName: true, contentType: true },
  });
}

/** Future teacher authorization can call this only after resolving teacher-to-book entitlement. */
export async function listPublishedTeacherResourcesForBook(input: { publisherId: string; bookId: string }) {
  return prisma.publisherTeacherResource.findMany({
    where: { publisherId: input.publisherId, bookId: input.bookId, published: true, archivedAt: null },
    select: { id: true, title: true, folderId: true, originalFileName: true, updatedAt: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}
