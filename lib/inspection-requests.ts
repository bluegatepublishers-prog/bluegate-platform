import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export type InspectionRequestRecord = Awaited<
  ReturnType<typeof getInspectionRequests>
>[number];

export async function getInspectionRequests(query?: string) {
  const actor = await requireLivePublisherAdmin();
  const search = query?.trim();
  return prisma.inspectionRequest.findMany({
    where: {
      publisherId: actor.publisherId,
      ...(search ? {
          OR: [
            { teacherName: { contains: search, mode: "insensitive" } },
            { schoolName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
            { bookTitle: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInspectionRequestById(id: string) {
  const actor = await requireLivePublisherAdmin();
  return prisma.inspectionRequest.findFirst({
    where: { id, publisherId: actor.publisherId },
  });
}
