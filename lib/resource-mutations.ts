import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTeacherResourceEntitlementAccess } from "@/lib/entitlements/resource";
import {
  authorizeAndCreateResourceBookmark as createBookmarkWithDependencies,
  authorizeAndRecordResourceDownload as recordDownloadWithDependencies,
  authorizeAndRemoveResourceBookmark as removeBookmarkWithDependencies,
  type ResourceMutationDependencies,
} from "@/lib/resource-mutation-policy";

type Bookmark = Prisma.BookmarkGetPayload<object>;

const defaultDependencies: ResourceMutationDependencies<Bookmark> = {
  authorizeTeacherResource: requireTeacherResourceEntitlementAccess,
  findBookmark: (teacherId, resourceId) =>
    prisma.bookmark.findFirst({ where: { teacherId, resourceId } }),
  createBookmark: (teacherId, resourceId) =>
    prisma.bookmark.upsert({
      where: { teacherId_resourceId: { teacherId, resourceId } },
      update: {},
      create: { teacherId, resourceId },
    }),
  deleteBookmarks: async (teacherId, resourceId) => {
    const result = await prisma.bookmark.deleteMany({
      where: { teacherId, resourceId },
    });
    return result.count;
  },
  recordDownload: async (teacherId, resourceId) => {
    await prisma.download.create({ data: { teacherId, resourceId } });
  },
};

export function authorizeAndRecordResourceDownload(
  userId: string,
  resourceId: string,
) {
  return recordDownloadWithDependencies(userId, resourceId, defaultDependencies);
}

export function authorizeAndCreateResourceBookmark(
  userId: string,
  resourceId: string,
) {
  return createBookmarkWithDependencies(userId, resourceId, defaultDependencies);
}

export function authorizeAndRemoveResourceBookmark(
  userId: string,
  resourceId: string,
) {
  return removeBookmarkWithDependencies(userId, resourceId, defaultDependencies);
}
