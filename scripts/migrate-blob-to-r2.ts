import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { scanStorageInventory } from "../lib/storage/storage-inventory";
import { createBlobMigrationDependencies } from "../lib/storage/blob-migration-runtime";
import {
  migrateBatch,
  planMigration,
  type MigrationManifestEntry,
} from "../lib/storage/blob-migration";

type Options = {
  dryRun: boolean;
  execute: boolean;
  limit?: number;
  offset: number;
  resourceId?: string;
  resume: boolean;
  manifestPath: string;
};

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.execute && process.env.ALLOW_BLOB_MIGRATION !== "YES") {
    throw new Error("Execution requires ALLOW_BLOB_MIGRATION=YES. Use --dry-run to inspect safely.");
  }
  const resource = options.resourceId
    ? await prisma.resource.findUnique({ where: { id: options.resourceId }, select: { publisherId: true } })
    : null;
  const publisherIds = options.resourceId
    ? resource?.publisherId ? [resource.publisherId] : []
    : (await prisma.publisher.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map(item => item.id);

  const files = (await Promise.all(publisherIds.map(id => scanStorageInventory(id)))).flat();
  const plan = planMigration(files, {
    resourceId: options.resourceId,
    offset: options.offset,
    limit: options.limit,
  });
  const resume = options.resume ? await readManifest(options.manifestPath) : [];
  const entries = await migrateBatch(plan, createBlobMigrationDependencies(), { dryRun: options.dryRun, resume });
  const manifest = [...resume, ...entries];
  await writeFile(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const summary = entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
    return counts;
  }, {});
  process.stdout.write(`${JSON.stringify({ dryRun: options.dryRun, planned: plan.length, processed: entries.length, summary, manifest: options.manifestPath }, null, 2)}\n`);
}

function parseOptions(args: string[]): Options {
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const integer = (flag: string, fallback?: number) => {
    const raw = value(flag);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative integer.`);
    return parsed;
  };
  const execute = args.includes("--execute");
  return {
    execute,
    dryRun: args.includes("--dry-run") || !execute,
    limit: integer("--limit"),
    offset: integer("--offset", 0)!,
    resourceId: value("--resource"),
    resume: args.includes("--resume"),
    manifestPath: path.resolve(value("--manifest") || "blob-migration-manifest.json"),
  };
}

async function readManifest(filePath: string): Promise<MigrationManifestEntry[]> {
  try {
    const value = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : "Migration failed."}\n`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
