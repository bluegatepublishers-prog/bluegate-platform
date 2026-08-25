import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migrations = readFileSync("prisma/migrations/20260821110000_add_seasonal_timetable_and_emergency_holiday/migration.sql", "utf8");

test("activity persistence audit keeps this change additive and migration-free", () => {
  assert.match(schema, /teachingPeriodId\s+String\?/);
  assert.match(schema, /model ClassroomAssignment/);
  assert.match(schema, /model Assessment/);
  assert.doesNotMatch(schema.slice(schema.indexOf("model Assessment"), schema.indexOf("model Assessment") + 5000), /teachingPeriodId/);
  assert.ok(migrations.length > 0);
});
