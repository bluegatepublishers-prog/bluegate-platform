export type GapBackfillOptions = {
  publisherId: string;
  academicYearId: string;
  cursor?: string;
  limit: number;
  dryRun: boolean;
};

export function parseGapBackfillArgs(args: string[]): GapBackfillOptions {
  const value = (name: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3).trim();
  const publisherId = value("publisher");
  const academicYearId = value("academic-year");
  const limit = Number(value("limit") ?? 100);
  if (!publisherId || !academicYearId) throw new Error("--publisher and --academic-year are required.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("--limit must be an integer from 1 to 500.");
  return { publisherId, academicYearId, cursor: value("cursor") || undefined, limit, dryRun: args.includes("--dry-run") };
}

export async function runGapBackfillWithDependencies(
  options: GapBackfillOptions,
  dependencies: {
    list: (options: GapBackfillOptions) => Promise<Array<{ id: string; studentId: string }>>;
    recompute: (scope: { studentId: string; academicYearId: string }) => Promise<unknown>;
  },
) {
  const rows = await dependencies.list(options);
  let processed = 0;
  if (!options.dryRun) {
    for (const row of rows) {
      await dependencies.recompute({ studentId: row.studentId, academicYearId: options.academicYearId });
      processed += 1;
    }
  }
  return { dryRun: options.dryRun, candidates: rows.length, processed, nextCursor: rows.length === options.limit ? rows.at(-1)?.id ?? null : null };
}
