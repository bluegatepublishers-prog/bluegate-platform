import { PlatformFeatureKey } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  authorizePublisherAdminApi,
  publisherAdminNotFound,
} from "@/lib/publisher-admin-authorization";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (!(await isPublisherFeatureEnabled(actor.publisherId, PlatformFeatureKey.RESOURCES))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const bookId = new URL(request.url).searchParams.get("bookId") ?? "";
  const [resource, book] = await Promise.all([
    prisma.resource.findFirst({
      where: { id, publisherId: actor.publisherId },
      select: { id: true },
    }),
    prisma.book.findFirst({
      where: { id: bookId, publisherId: actor.publisherId },
      select: {
        id: true,
        parts: { where: { archived: false }, orderBy: { displayOrder: "asc" }, select: { id: true, title: true } },
        units: { where: { archived: false }, orderBy: { displayOrder: "asc" }, select: { id: true, title: true } },
        chapters: { where: { archived: false }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true } },
        modules: { where: { archived: false }, orderBy: { displayOrder: "asc" }, select: { id: true, title: true } },
        topics: { where: { archived: false }, orderBy: { displayOrder: "asc" }, select: { id: true, title: true } },
      },
    }),
  ]);
  if (!resource || !book) return publisherAdminNotFound();
  return NextResponse.json(book);
}
