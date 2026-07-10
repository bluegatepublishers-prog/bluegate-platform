import { prisma } from "@/lib/prisma";

export type InspectionRequestRecord = Awaited<
  ReturnType<typeof getInspectionRequests>
>[number];

export async function getInspectionRequests(query?: string) {
  const search = query?.trim();
  return prisma.inspectionRequest.findMany({
    where: search
      ? {
          OR: [
            { teacherName: { contains: search, mode: "insensitive" } },
            { schoolName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
            { bookTitle: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function getInspectionRequestById(id: string) {
  return prisma.inspectionRequest.findUnique({ where: { id } });
}
