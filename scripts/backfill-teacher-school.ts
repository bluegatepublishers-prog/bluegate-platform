import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const [schools, teachers] = await Promise.all([
    prisma.school.findMany({ select: { id: true, schoolName: true } }),
    prisma.teacher.findMany({
      where: dryRun ? undefined : { schoolId: null },
      select: { id: true, schoolName: true },
    }),
  ]);

  const schoolsByName = new Map<string, string[]>();
  for (const school of schools) {
    const key = normalize(school.schoolName);
    schoolsByName.set(key, [...(schoolsByName.get(key) ?? []), school.id]);
  }

  let linked = 0;
  let unmatched = 0;
  let ambiguous = 0;

  for (const teacher of teachers) {
    const matches = schoolsByName.get(normalize(teacher.schoolName)) ?? [];
    if (matches.length === 0) {
      unmatched += 1;
      continue;
    }
    if (matches.length > 1) {
      ambiguous += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { schoolId: matches[0] },
      });
    }
    linked += 1;
  }

  console.log({ dryRun, scanned: teachers.length, linked, unmatched, ambiguous });
}

main()
  .catch((error: unknown) => {
    console.error(
      "Teacher-school backfill failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
