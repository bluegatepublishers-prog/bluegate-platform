import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlobMigrationDependencies, MigrationManifestEntry } from "../lib/storage/blob-migration";

type Options = {
  dryRun: boolean;
  execute: boolean;
  limit?: number;
  offset: number;
  resourceId?: string;
  resume: boolean;
  manifestPath: string;
};

const HELP = `Blob to R2 migration planner

Usage:
  npx tsx scripts/migrate-blob-to-r2.ts [options]

Options:
  --help                 Show this help without initializing database or storage clients
  --dry-run              Plan migration only (default; never uploads or updates database references)
  --execute              Perform the migration (requires ALLOW_BLOB_MIGRATION=YES)
  --limit <number>       Process at most this many planned files
  --offset <number>      Skip this many planned files (default: 0)
  --resource <id>        Limit planning to one Resource ID
  --resume               Skip completed entries from the existing manifest
  --manifest <path>      Manifest output path (default: blob-migration-manifest.json)
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(HELP);
    return;
  }
  const options = parseOptions(args);
  if (options.execute && process.env.ALLOW_BLOB_MIGRATION !== "YES") throw new Error("Execution requires ALLOW_BLOB_MIGRATION=YES. Use --dry-run to inspect safely.");

  const [{ prisma }, { scanStorageInventoryWithDatabase }, migration] = await Promise.all([
    import("../lib/prisma"),
    import("../lib/storage/storage-inventory-core"),
    import("../lib/storage/blob-migration"),
  ]);
  try {
    const resource = options.resourceId ? await prisma.resource.findUnique({ where: { id: options.resourceId }, select: { publisherId: true } }) : null;
    const publisherIds = options.resourceId
      ? resource?.publisherId ? [resource.publisherId] : []
      : (await prisma.publisher.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map(item => item.id);
    const files = (await Promise.all(publisherIds.map(id => scanStorageInventoryWithDatabase(prisma, id)))).flat();
    const plan = migration.planMigration(files, { resourceId: options.resourceId, offset: options.offset, limit: options.limit });
    const resume = options.resume ? await readManifest(options.manifestPath) : [];
    const dependencies = options.dryRun
      ? dryRunDependencies()
      : (await import("../lib/storage/blob-migration-cli-runtime")).createBlobMigrationCliDependencies(prisma);
    const entries = await migration.migrateBatch(plan, dependencies, { dryRun: options.dryRun, resume });
    const manifest = [...resume, ...entries];
    await writeFile(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const summary = entries.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.status] = (counts[entry.status] ?? 0) + 1;
      return counts;
    }, {});
    process.stdout.write(`${JSON.stringify({ dryRun: options.dryRun, planned: plan.length, processed: entries.length, summary, manifest: options.manifestPath }, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

function dryRunDependencies(): BlobMigrationDependencies {
  const unexpected = async () => { throw new Error("Dry run attempted a storage or database mutation."); };
  return { fetchSource: unexpected, headObject: unexpected, putObject: unexpected, updateReference: unexpected };
}

function parseOptions(args: string[]): Options {
  const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const integer = (flag: string, fallback?: number) => {
    const raw = value(flag);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative integer.`);
    return parsed;
  };
  const execute = args.includes("--execute");
  return { execute, dryRun: args.includes("--dry-run") || !execute, limit: integer("--limit"), offset: integer("--offset", 0)!, resourceId: value("--resource"), resume: args.includes("--resume"), manifestPath: path.resolve(value("--manifest") || "blob-migration-manifest.json") };
}

async function readManifest(filePath: string): Promise<MigrationManifestEntry[]> {
  try { const value = JSON.parse(await readFile(filePath, "utf8")); return Array.isArray(value) ? value : []; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : "Migration failed."}\n`);
  process.exitCode = 1;
});
