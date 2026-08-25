import "server-only";

import type { Prisma } from "@prisma/client";

import { BLUEGATE_PUBLISHER_ID } from "@/lib/publisher-context";

export const BLUEGATE_PUBLIC_CATALOGUE_PUBLISHER_ID = BLUEGATE_PUBLISHER_ID;

export function getPublicCatalogueBookWhere(
  extra: Prisma.BookWhereInput = {},
): Prisma.BookWhereInput {
  return {
    AND: [
      {
        publisherId: BLUEGATE_PUBLISHER_ID,
        publicCatalogueVisible: true,
        published: true,
        archived: false,
        publisherTenant: { active: true },
      },
      extra,
    ],
  };
}
