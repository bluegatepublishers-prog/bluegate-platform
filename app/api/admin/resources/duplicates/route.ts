import { NextResponse } from "next/server";
import { PlatformFeatureKey } from "@prisma/client";

import {
  findLikelyResourceDuplicates,
  isSafeExternalResourceUrl,
} from "@/lib/admin-resource-library";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";

export async function POST(request: Request) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;
  if (
    !(await isPublisherFeatureEnabled(
      actor.publisherId,
      PlatformFeatureKey.RESOURCES,
    ))
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const originalFileName =
    typeof body.originalFileName === "string" ? body.originalFileName : null;
  const fileSizeBytes =
    typeof body.fileSizeBytes === "number" &&
    Number.isInteger(body.fileSizeBytes) &&
    body.fileSizeBytes > 0
      ? body.fileSizeBytes
      : null;
  const externalUrl =
    typeof body.externalUrl === "string" && isSafeExternalResourceUrl(body.externalUrl)
      ? body.externalUrl
      : null;

  const matches = await findLikelyResourceDuplicates(actor.publisherId, {
    originalFileName,
    fileSizeBytes,
    externalUrl,
  });

  return NextResponse.json({
    matches: matches.map((match) => ({
      ...match,
      fileSizeBytes: match.fileSizeBytes?.toString() ?? null,
      updatedAt: match.updatedAt.toISOString(),
    })),
  });
}
