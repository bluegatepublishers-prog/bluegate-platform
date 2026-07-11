import { PrismaClient, TeacherAiPlan, UserRole } from "@prisma/client";
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

  // ----------------------------
  // Teacher Test Account
  // ----------------------------

  const teacherPassword = await bcrypt.hash("Teacher@123", 10);
  const teacherUser = await prisma.user.upsert({
    where: {
      email: "teacher@bluegatepublishers.com",
    },
    update: {
      name: "Bluegate Teacher",
      password: teacherPassword,
      role: UserRole.TEACHER,
    },
    create: {
      name: "Bluegate Teacher",
      email: "teacher@bluegatepublishers.com",
      password: teacherPassword,
      role: UserRole.TEACHER,
    },
  });

  await prisma.teacher.upsert({
    where: {
      userId: teacherUser.id,
    },
    update: {
      schoolName: "Bluegate Demonstration School",
      designation: "Senior Teacher",
      subject: "Science",
      classes: "Classes 6-8",
      verified: true,
      aiPlan: TeacherAiPlan.PREMIUM,
      aiDailyLimit: 5,
      aiPlanExpiresAt: null,
    },
    create: {
      userId: teacherUser.id,
      schoolName: "Bluegate Demonstration School",
      designation: "Senior Teacher",
      subject: "Science",
      classes: "Classes 6-8",
      verified: true,
      aiPlan: TeacherAiPlan.PREMIUM,
      aiDailyLimit: 5,
      aiPlanExpiresAt: null,
    },
  });

  // ----------------------------
  // School Test Account
  // ----------------------------

  const schoolPassword = await bcrypt.hash("School@123", 10);
  const schoolUser = await prisma.user.upsert({
    where: {
      email: "school@bluegatepublishers.com",
    },
    update: {
      name: "Bluegate School Admin",
      password: schoolPassword,
      role: UserRole.SCHOOL,
    },
    create: {
      name: "Bluegate School Admin",
      email: "school@bluegatepublishers.com",
      password: schoolPassword,
      role: UserRole.SCHOOL,
    },
  });

  const school = await prisma.school.upsert({
    where: {
      userId: schoolUser.id,
    },
    update: {
      schoolName: "Bluegate Demonstration School",
      city: "New Delhi",
      state: "Delhi",
    },
    create: {
      userId: schoolUser.id,
      schoolName: "Bluegate Demonstration School",
      city: "New Delhi",
      state: "Delhi",
    },
  });

  await prisma.teacher.update({
    where: {
      userId: teacherUser.id,
    },
    data: {
      schoolId: school.id,
    },
  });

  console.log("✅ Database Seed Completed");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Database seed failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
