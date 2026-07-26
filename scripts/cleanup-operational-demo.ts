import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_SCHOOL_EMAIL = "school@bluegatepublishers.com";
const DEMO_TEACHER_EMAIL = "teacher@bluegatepublishers.com";
const DEMO_SCHOOL_NAME = "Bluegate Demonstration School";
const APPLY_CONFIRMATION = "DELETE_BLUEGATE_DEMO_SCHOOL";

function databaseHost() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return new URL(value).hostname.toLowerCase();
}

function isLocalDatabase(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function main() {
  const host = databaseHost();
  const apply = process.argv.includes("--apply");
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm="))
    ?.slice("--confirm=".length);

  const school = await prisma.school.findFirst({
    where: {
      schoolName: DEMO_SCHOOL_NAME,
      user: { email: DEMO_SCHOOL_EMAIL },
      publisher: { slug: "bluegate" },
    },
    select: { id: true, userId: true, schoolName: true, publisherId: true },
  });
  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId: school?.id ?? "__missing__",
      user: { email: DEMO_TEACHER_EMAIL },
    },
    select: { id: true, userId: true },
  });

  const publisherContent = await prisma.$transaction([
    prisma.book.count(),
    prisma.bookChapter.count(),
    prisma.resource.count(),
    prisma.videoLesson.count(),
    prisma.bookSeries.count(),
    prisma.subject.count(),
  ]);
  console.log({
    mode: apply ? "apply-requested" : "dry-run",
    databaseHost: host,
    target: school ?? "seeded demo school not found",
    publisherContentPreserved: {
      books: publisherContent[0],
      bookChapters: publisherContent[1],
      resources: publisherContent[2],
      videos: publisherContent[3],
      series: publisherContent[4],
      subjects: publisherContent[5],
    },
  });
  if (!school) return;

  const blockers = await Promise.all([
    prisma.student.count({ where: { schoolId: school.id } }),
    prisma.teacherAssignment.count({ where: { schoolId: school.id } }),
    prisma.schoolBookAdoption.count({ where: { schoolId: school.id } }),
    prisma.classMaterial.count({ where: { schoolId: school.id } }),
    prisma.classroomAssignment.count({ where: { schoolId: school.id } }),
    prisma.assignmentSubmission.count({ where: { schoolId: school.id } }),
    prisma.assessment.count({ where: { schoolId: school.id } }),
    prisma.assessmentAttempt.count({ where: { schoolId: school.id } }),
    prisma.inspectionRequest.count({ where: { schoolId: school.id } }),
    prisma.schoolOnboardingReview.count({ where: { schoolId: school.id } }),
    prisma.teacherSchoolRequest.count({ where: { schoolId: school.id } }),
  ]);
  const blockerSummary = {
    students: blockers[0],
    teacherAssignments: blockers[1],
    bookAdoptions: blockers[2],
    classMaterials: blockers[3],
    classroomAssignments: blockers[4],
    assignmentSubmissions: blockers[5],
    assessments: blockers[6],
    assessmentAttempts: blockers[7],
    inspectionRequests: blockers[8],
    onboardingReviews: blockers[9],
    teacherRequests: blockers[10],
  };
  console.log({ operationalDependencyReview: blockerSummary });

  if (!apply) {
    console.log(
      "Dry run only. Apply is permitted only against a local disposable database after every non-zero dependency is reviewed.",
    );
    return;
  }
  if (!isLocalDatabase(host)) {
    throw new Error("Refusing operational cleanup: DATABASE_URL is not local.");
  }
  if (confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`Pass --confirm=${APPLY_CONFIRMATION} to apply local cleanup.`);
  }
  if (Object.values(blockerSummary).some((count) => count > 0)) {
    throw new Error(
      "Refusing cleanup because the demo school has dependent operational records. Review and clean them explicitly first.",
    );
  }

  await prisma.$transaction(async (tx) => {
    if (teacher) await tx.user.delete({ where: { id: teacher.userId } });
    await tx.user.delete({ where: { id: school.userId } });
  });
  console.log("Seeded operational demo school and teacher removed from the local database.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Operational cleanup failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
