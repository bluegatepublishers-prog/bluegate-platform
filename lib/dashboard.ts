import { prisma } from "@/lib/prisma";

export async function getDashboard(userId: string) {
  // Teacher Profile
  const teacher = await prisma.teacher.findUnique({
    where: {
      userId,
    },
    include: {
      user: true,
      downloads: {
        include: {
          resource: true,
        },
        orderBy: {
          downloadedAt: "desc",
        },
        take: 5,
      },
      bookmarks: true,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found.");
  }

  // Latest Resources
  const latestResources = await prisma.resource.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  return {
    teacher,

    stats: {
      resources: await prisma.resource.count(),

      downloads: teacher.downloads.length,

      bookmarks: teacher.bookmarks.length,

      training: 0, // Training module will be added later
    },

    latestResources,

    recentDownloads: teacher.downloads,
  };
}