import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Bluegate Database...");

  // ----------------------------
  // Admin User
  // ----------------------------

  const password = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@bluegatepublishers.com",
    },
    update: {},
    create: {
      name: "Bluegate Admin",
      email: "admin@bluegatepublishers.com",
      password,
      role: UserRole.ADMIN,
    },
  });

  // ----------------------------
  // Classes
  // ----------------------------

  const classNames = [
    "Nursery",
    "LKG",
    "UKG",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ];

  for (let i = 0; i < classNames.length; i++) {
    await prisma.class.upsert({
      where: {
        code: classNames[i]
          .replaceAll(" ", "_")
          .toUpperCase(),
      },
      update: {},
      create: {
        name: classNames[i],
        code: classNames[i]
          .replaceAll(" ", "_")
          .toUpperCase(),
        sortOrder: i + 1,
        active: true,
      },
    });
  }

  // ----------------------------
  // Subjects
  // ----------------------------

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

  for (let i = 0; i < subjects.length; i++) {
    await prisma.subject.upsert({
      where: {
        code: subjects[i]
          .replaceAll(" ", "_")
          .toUpperCase(),
      },
      update: {},
      create: {
        name: subjects[i],
        code: subjects[i]
          .replaceAll(" ", "_")
          .toUpperCase(),
        sortOrder: i + 1,
        active: true,
      },
    });
  }

  // ----------------------------
  // Book Series
  // ----------------------------

  const series = [
    "Bluegate Foundation",
    "Bluegate Excellence",
    "Bluegate Smart Learning",
    "Bluegate Olympiad",
    "Bluegate AI Series",
    "Bluegate Coding",
    "Bluegate Future Skills",
  ];

  for (const item of series) {
    await prisma.bookSeries.upsert({
      where: {
        code: item.replaceAll(" ", "_").toUpperCase(),
      },
      update: {},
      create: {
        name: item,
        code: item.replaceAll(" ", "_").toUpperCase(),
        active: true,
      },
    });
  }

  console.log("✅ Database Seed Completed");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });