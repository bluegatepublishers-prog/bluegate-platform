import assert from "node:assert/strict";
import test from "node:test";
import { parseGapBackfillArgs, runGapBackfillWithDependencies } from "../lib/gaps/backfill";

test("backfill requires a bounded explicit tenant and year scope", () => {
  assert.throws(() => parseGapBackfillArgs(["--dry-run"]));
  assert.throws(() => parseGapBackfillArgs(["--publisher=p1", "--academic-year=y1", "--limit=501"]));
  assert.deepEqual(parseGapBackfillArgs(["--publisher=p1", "--academic-year=y1", "--limit=25", "--cursor=c1", "--dry-run"]), { publisherId: "p1", academicYearId: "y1", limit: 25, cursor: "c1", dryRun: true });
});

test("dry-run lists analytics rows without recomputing or mutating gaps", async () => {
  let recomputes = 0;
  const result = await runGapBackfillWithDependencies({ publisherId: "p1", academicYearId: "y1", limit: 2, dryRun: true }, { list: async () => [{ id: "a", studentId: "s1" }, { id: "b", studentId: "s2" }], recompute: async () => { recomputes += 1; } });
  assert.deepEqual(result, { dryRun: true, candidates: 2, processed: 0, nextCursor: "b" });
  assert.equal(recomputes, 0);
});

test("resumable execution processes only the selected analytics page", async () => {
  const scopes: string[] = [];
  const result = await runGapBackfillWithDependencies({ publisherId: "p1", academicYearId: "y1", limit: 2, dryRun: false }, { list: async () => [{ id: "a", studentId: "s1" }], recompute: async (scope) => { scopes.push(`${scope.studentId}:${scope.academicYearId}`); } });
  assert.deepEqual(scopes, ["s1:y1"]); assert.equal(result.nextCursor, null); assert.equal(result.processed, 1);
});
