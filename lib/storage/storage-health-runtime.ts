import "server-only";

import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "./provider";
import { scanStorageInventory } from "./storage-inventory";
import { generateStorageHealthReport } from "./storage-health";
import { uploadPrefixForScope } from "./upload-policy";
import type { StorageObjectMetadata, UploadScope } from "./types";

const PUBLISHER_SCOPES: UploadScope[] = [
  "book-cover", "book-gallery", "book-sample", "book-public-preview", "book-full",
  "publisher-logo", "publisher-favicon", "resource-thumbnail", "resource-file",
];

export async function listPublisherStorageObjects(publisherId: string, maximumObjects = 20_000) {
  const schools = await prisma.school.findMany({ where: { publisherId }, select: { id: true } });
  const prefixes = [
    ...PUBLISHER_SCOPES.map(scope => `${uploadPrefixForScope(scope)}/${publisherId}/`),
    ...schools.map(school => `${uploadPrefixForScope("school-logo")}/${school.id}/`),
  ];
  const provider = getStorageProvider();
  const objects: StorageObjectMetadata[] = [];
  for (const prefix of prefixes) {
    let continuationToken: string | undefined;
    do {
      const page = await provider.listObjects({ prefix, continuationToken, maxKeys: 1000 });
      objects.push(...page.objects);
      continuationToken = page.continuationToken;
    } while (continuationToken && objects.length < maximumObjects);
  }
  return objects.slice(0, maximumObjects);
}

export async function inspectPublisherStorageHealth(publisherId: string) {
  const [files, objects] = await Promise.all([
    scanStorageInventory(publisherId),
    listPublisherStorageObjects(publisherId),
  ]);
  return generateStorageHealthReport(files, objects);
}
