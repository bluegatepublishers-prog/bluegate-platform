import { prisma } from "../lib/prisma";
import { parseGapBackfillArgs, runGapBackfillWithDependencies } from "../lib/gaps/backfill";
import { recomputeStudentGaps } from "../lib/gaps/detect";

async function main() {
  const options = parseGapBackfillArgs(process.argv.slice(2));
  const result = await runGapBackfillWithDependencies(options, {
    list: (input) => prisma.studentAnalytics.findMany({
      where: { publisherId: input.publisherId, academicYearId: input.academicYearId },
      orderBy: { id: "asc" },
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit,
      select: { id: true, studentId: true },
    }),
    recompute: recomputeStudentGaps,
  });
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Gap backfill failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
