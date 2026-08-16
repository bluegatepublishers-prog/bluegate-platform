import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/attendance.ts", "utf8");

function sessionCreator() {
  const start = source.indexOf("async function findOrCreateTeacherSession");
  const end = source.indexOf("export async function getTeacherAttendanceWorkspace", start);
  assert.notEqual(start, -1, "missing teacher session creator");
  assert.notEqual(end, -1, "missing teacher attendance workspace");
  return source.slice(start, end);
}

test("attendance session advisory lock uses a transaction-safe Prisma execution path", () => {
  const creator = sessionCreator();

  assert.equal((source.match(/pg_advisory_xact_lock/g) ?? []).length, 1);
  assert.doesNotMatch(creator, /\$queryRaw[^\n]*pg_advisory_xact_lock/);
  assert.match(
    creator,
    /tx\.\$executeRaw`SELECT pg_advisory_xact_lock\(hashtext\(\$\{identityKey\}\)\)`/,
  );
  assert.match(creator, /prisma\.\$transaction\(async \(tx\)/);
  assert.ok(creator.indexOf("prisma.$transaction") < creator.indexOf("tx.$executeRaw"));
  assert.ok(creator.indexOf("tx.$executeRaw") < creator.indexOf("tx.attendanceSession.findFirst"));
  assert.ok(creator.indexOf("tx.attendanceSession.findFirst") < creator.indexOf("tx.attendanceSession.create"));
});
