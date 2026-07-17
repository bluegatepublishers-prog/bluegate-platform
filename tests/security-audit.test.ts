import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SecurityAuditOutcome, UserRole } from "@prisma/client";
import {
  canReadSecurityAuditEvent,
  buildSecurityAuditEventSnapshot,
  executeAtomicAuditedMutation,
  normalizeSecurityAuditMetadata,
  securityAuditReadScope,
  UnsafeSecurityAuditMetadataError,
} from "../lib/security-audit-policy";

type FakeTransaction = { businessWrites: string[]; events: string[] };

function atomicHarness(options: { failAudit?: boolean } = {}) {
  const committed: FakeTransaction = { businessWrites: [], events: [] };
  return {
    committed,
    dependencies: {
      async transaction<T>(operation: (tx: FakeTransaction) => Promise<T>) {
        const draft: FakeTransaction = {
          businessWrites: [...committed.businessWrites],
          events: [...committed.events],
        };
        const result = await operation(draft);
        committed.businessWrites = draft.businessWrites;
        committed.events = draft.events;
        return result;
      },
      async insert(tx: FakeTransaction, event: string) {
        if (options.failAudit) throw new Error("AUDIT_INSERT_FAILED");
        tx.events.push(event);
      },
    },
  };
}

test("successful privileged mutation commits exactly one SUCCESS event atomically", async () => {
  const harness = atomicHarness();
  const result = await executeAtomicAuditedMutation(
    harness.dependencies,
    "SUCCESS",
    async (tx) => {
      tx.businessWrites.push("publisher-updated");
      return "done";
    },
  );
  assert.equal(result, "done");
  assert.deepEqual(harness.committed, {
    businessWrites: ["publisher-updated"],
    events: ["SUCCESS"],
  });
});

test("audit insertion failure rolls back the privileged mutation", async () => {
  const harness = atomicHarness({ failAudit: true });
  await assert.rejects(
    executeAtomicAuditedMutation(harness.dependencies, "SUCCESS", async (tx) => {
      tx.businessWrites.push("book-deleted");
    }),
    /AUDIT_INSERT_FAILED/,
  );
  assert.deepEqual(harness.committed, { businessWrites: [], events: [] });
});

test("actor role and publisher are immutable event-time snapshots", () => {
  const actor = { userId: "admin-a", role: UserRole.ADMIN, publisherId: "publisher-a" };
  const event = buildSecurityAuditEventSnapshot({
    actor,
    action: "publisher.book.update",
    targetType: "Book",
    targetId: "book-a",
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { changedFields: ["publicationState"] },
  });
  actor.publisherId = "publisher-b";
  assert.equal(event.actorUserId, "admin-a");
  assert.equal(event.actorRole, UserRole.ADMIN);
  assert.equal(event.publisherId, "publisher-a");
  assert.deepEqual(event.metadata, { changedFields: ["publicationState"] });
});

test("unauthenticated noise and malformed role contexts cannot create audit input", () => {
  assert.throws(() => buildSecurityAuditEventSnapshot({
    actor: undefined as never,
    action: "publisher.resource.delete",
    targetType: "Resource",
    outcome: SecurityAuditOutcome.DENIED,
  }), /trusted security audit actor/);
  assert.throws(() => buildSecurityAuditEventSnapshot({
    actor: { userId: "owner", role: UserRole.SUPER_ADMIN, publisherId: "publisher-a" },
    action: "platform.publisher.update",
    targetType: "Publisher",
    outcome: SecurityAuditOutcome.SUCCESS,
  }), /Invalid platform audit actor/);
});

test("metadata is explicit, shallow, bounded, and secret excluding", () => {
  assert.deepEqual(normalizeSecurityAuditMetadata({
    changedFields: ["active", "branding"],
    enabled: true,
    fileCount: 2,
  }), { changedFields: ["active", "branding"], enabled: true, fileCount: 2 });
  for (const metadata of [
    { password: "NeverStore1!" },
    { resetToken: "secret" },
    { rawError: "database-failure" },
    { unknownKey: "value" },
    { scope: { nested: "value" } },
    { changedFields: Array.from({ length: 21 }, (_, index) => `field${index}`) },
  ]) {
    assert.throws(
      () => normalizeSecurityAuditMetadata(metadata as never),
      UnsafeSecurityAuditMetadataError,
    );
  }
});

test("Publisher Admin audit access is tenant-isolated and excludes platform-neutral events", () => {
  const adminA = { role: "ADMIN", publisherId: "publisher-a" };
  assert.deepEqual(securityAuditReadScope(adminA), { kind: "PUBLISHER", publisherId: "publisher-a" });
  assert.equal(canReadSecurityAuditEvent(adminA, { publisherId: "publisher-a" }), true);
  assert.equal(canReadSecurityAuditEvent(adminA, { publisherId: "publisher-b" }), false);
  assert.equal(canReadSecurityAuditEvent(adminA, { publisherId: null }), false);
  assert.equal(canReadSecurityAuditEvent({ role: "SCHOOL", publisherId: "publisher-a" }, { publisherId: "publisher-a" }), false);
  assert.equal(canReadSecurityAuditEvent({ role: "SUPER_ADMIN", publisherId: null }, { publisherId: null }), true);
  assert.equal(canReadSecurityAuditEvent({ role: "SUPER_ADMIN", publisherId: null }, { publisherId: "publisher-b" }), true);
});

test("trusted cross-tenant denials are target-neutral and cannot expose foreign IDs", () => {
  const source = readFileSync("lib/security-audit.ts", "utf8");
  assert.match(source, /targetId: null/);
  for (const path of [
    "app/api/admin/books/[id]/route.ts",
    "app/api/admin/resources/[id]/route.ts",
    "app/api/admin/teachers/[id]/route.ts",
  ]) {
    const route = readFileSync(path, "utf8");
    assert.match(route, /recordTrustedDeniedAudit/);
    assert.match(route, /reasonCode: "CROSS_TENANT_SCOPE"/);
  }
});

test("append-only migration blocks update and delete without cascade relations", () => {
  const migration = readFileSync("prisma/migrations/20260717180000_security_audit_events/migration.sql", "utf8");
  const executableSql = migration.replace(/^--.*$/gm, "");
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(migration, /BEFORE UPDATE OR DELETE ON "SecurityAuditEvent"/);
  assert.match(migration, /RAISE EXCEPTION 'SecurityAuditEvent is append-only'/);
  assert.doesNotMatch(executableSql, /FOREIGN KEY|ON DELETE CASCADE/i);
  const model = schema.match(/model SecurityAuditEvent \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(model, /actorUserId\s+String\?/);
  assert.match(model, /publisherId\s+String\?/);
  assert.doesNotMatch(model, /@relation|onDelete/);
});

test("application exposes insert-only audit service and no update or delete API", () => {
  const service = readFileSync("lib/security-audit.ts", "utf8");
  assert.match(service, /securityAuditEvent\.create/);
  assert.doesNotMatch(service, /securityAuditEvent\.(?:update|updateMany|delete|deleteMany|upsert)/);
  assert.doesNotMatch(service, /export async function .*SecurityAudit.*(?:update|delete)/i);
});
