import { PlatformFeatureKey, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function code(value: string) {
  return value.replaceAll(" ", "_").toUpperCase();
}

async function main() {
  const publisher = await prisma.publisher.upsert({
    where: { slug: "bluegate" },
    update: { name: "Bluegate Publishers", active: true },
    create: {
      id: "publisher_bluegate",
      name: "Bluegate Publishers",
      shortName: "Bluegate",
      slug: "bluegate",
      portalTitle: "Bluegate Platform",
      aiName: "Bluegate AI",
    },
  });

  const implemented = new Set<PlatformFeatureKey>([
    PlatformFeatureKey.AI_STUDIO,
    PlatformFeatureKey.BOOK_APPROVALS,
    PlatformFeatureKey.RESOURCES,
    PlatformFeatureKey.ASSIGNMENTS,
    PlatformFeatureKey.ASSESSMENTS,
    PlatformFeatureKey.INTERACTIVE_QUIZZES,
    PlatformFeatureKey.STUDENT_AI,
    PlatformFeatureKey.REPORTS,
    PlatformFeatureKey.TUTOR_PLATFORM,
    PlatformFeatureKey.PARENT_PORTAL,
    PlatformFeatureKey.NOTIFICATIONS,
  ]);
  const enabledForBluegate = new Set<PlatformFeatureKey>([
    PlatformFeatureKey.AI_STUDIO,
    PlatformFeatureKey.BOOK_APPROVALS,
    PlatformFeatureKey.RESOURCES,
    PlatformFeatureKey.NOTIFICATIONS,
  ]);

  for (const key of Object.values(PlatformFeatureKey)) {
    const feature = await prisma.featureDefinition.upsert({
      where: { key },
      update: { implemented: implemented.has(key), active: true },
      create: {
        id: `feature_${key.toLowerCase()}`,
        key,
        name: key
          .split("_")
          .map((part) => part[0] + part.slice(1).toLowerCase())
          .join(" "),
        implemented: implemented.has(key),
        active: true,
      },
    });
    await prisma.publisherFeature.upsert({
      where: {
        publisherId_featureId: {
          publisherId: publisher.id,
          featureId: feature.id,
        },
      },
      update: { enabled: enabledForBluegate.has(key) },
      create: {
        publisherId: publisher.id,
        featureId: feature.id,
        enabled: enabledForBluegate.has(key),
      },
    });
  }

  const password = await bcrypt.hash("Admin@123", 10);
  await prisma.user.upsert({
    where: { email: "admin@bluegatepublishers.com" },
    update: { publisherId: publisher.id },
    create: {
      name: "Bluegate Admin",
      email: "admin@bluegatepublishers.com",
      password,
      role: UserRole.ADMIN,
      publisherId: publisher.id,
    },
  });

  const classNames = [
    "Nursery",
    "LKG",
    "UKG",
    ...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`),
  ];
  for (const [index, name] of classNames.entries()) {
    await prisma.class.upsert({
      where: { code: code(name) },
      update: {},
      create: { name, code: code(name), sortOrder: index + 1, active: true },
    });
  }

  const subjects = [
    "English",
    "Hindi",
    "Mathematics",
    "Science",
    "Social Science",
    "EVS",
    "Computer",
    "Artificial Intelligence",
    "GK",
    "Moral Science",
    "Drawing",
    "Sanskrit",
  ];
  for (const [index, name] of subjects.entries()) {
    await prisma.subject.upsert({
      where: { code: code(name) },
      update: {},
      create: { name, code: code(name), sortOrder: index + 1, active: true },
    });
  }

  const series = [
    "Bluegate Foundation",
    "Bluegate Excellence",
    "Bluegate Smart Learning",
    "Bluegate Olympiad",
    "Bluegate AI Series",
    "Bluegate Coding",
    "Bluegate Future Skills",
  ];
  for (const name of series) {
    await prisma.bookSeries.upsert({
      where: { code: code(name) },
      update: { publisherId: publisher.id },
      create: {
        name,
        code: code(name),
        publisherId: publisher.id,
        active: true,
      },
    });
  }

  console.log(
    "Publisher content foundation seed completed. Operational school data is not seeded.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "Database seed failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
