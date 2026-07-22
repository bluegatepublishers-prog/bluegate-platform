import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { UserRole } from "@prisma/client";
import {
  prepareProtectedResourceDownloadWithDependencies,
  resolveProtectedStorageTarget,
  type LiveDownloadUser,
  type ProtectedDownloadAuditInput,
  type ProtectedDownloadDependencies,
  type ProtectedDownloadRole,
} from "../lib/storage/protected-download-policy";

const resourceId = "resource-a";
const publisherId = "publisher-a";
const objectKey = `resources/files/${publisherId}/object-a/resource.pdf`;
const signedUrl = "https://signed.invalid/resource.pdf?signature=secret-value";
const serverService = readFileSync("lib/storage/protected-download.ts", "utf8");

function fixture(input: {
  role?: ProtectedDownloadRole;
  session?: boolean;
  active?: boolean;
  eligible?: boolean;
  authorized?: boolean;
  resourcePublisherId?: string;
  published?: boolean;
  fileUrl?: string;
  objectExists?: boolean;
  signingFailure?: boolean;
}) {
  const role = input.role ?? "TEACHER";
  const actor: LiveDownloadUser = {
    id: "user-a",
    role: role as UserRole,
    active: input.active ?? true,
    eligible: input.eligible ?? true,
    publisherId,
  };
  const events: string[] = [];
  const audits: ProtectedDownloadAuditInput[] = [];
  let persisted = 0;
  const dependencies: ProtectedDownloadDependencies = {
    async getSessionUser() {
      events.push("session");
      return input.session === false ? null : { id: actor.id, role: actor.role };
    },
    async findLiveUser() {
      events.push("live-user");
      return actor;
    },
    async authorizeResource() {
      events.push("authorize");
      if (input.authorized === false) return null;
      return {
        resource: {
          id: resourceId,
          publisherId: input.resourcePublisherId ?? publisherId,
          title: "Resource",
          fileUrl: input.fileUrl ?? objectKey,
          originalFileName: "resource.pdf",
          published: input.published ?? true,
        },
        history:
          role === "TEACHER" || role === "STUDENT"
            ? { kind: role, actorId: `${role.toLowerCase()}-a` }
            : undefined,
      };
    },
    async headObject() {
      events.push("head");
      return input.objectExists ?? true;
    },
    async signObject() {
      events.push("sign");
      if (input.signingFailure) throw new Error("provider secret must stay hidden");
      return { url: signedUrl, expiresAt: "2026-07-22T12:00:00.000Z" };
    },
    async persistSuccess() {
      events.push("persist-success-audit");
      persisted += 1;
    },
    async recordAudit(audit) {
      events.push(`audit-${audit.outcome.toLowerCase()}`);
      audits.push(audit);
    },
  };
  return { actor, dependencies, events, audits, persisted: () => persisted };
}

async function prepare(
  role: ProtectedDownloadRole,
  dependencies: ProtectedDownloadDependencies,
  id = resourceId,
) {
  return prepareProtectedResourceDownloadWithDependencies(
    { resourceId: id, allowedRoles: [role], disposition: "attachment" },
    dependencies,
  );
}

test("unauthenticated protected download is denied before resource access", async () => {
  const f = fixture({ session: false });
  assert.deepEqual(await prepare("TEACHER", f.dependencies), {
    ok: false,
    status: 401,
    code: "UNAUTHENTICATED",
    message: "Authentication required.",
  });
  assert.deepEqual(f.events, ["session"]);
});

for (const role of ["TEACHER", "SCHOOL", "STUDENT", "ADMIN"] as const) {
  test(`valid ${role.toLowerCase()} access signs and persists only after authorization`, async () => {
    const f = fixture({ role });
    const result = await prepare(role, f.dependencies);
    assert.equal(result.ok, true);
    assert.deepEqual(f.events, [
      "session",
      "live-user",
      "authorize",
      "head",
      "sign",
      "persist-success-audit",
    ]);
    assert.equal(f.persisted(), 1);
  });
}

test("cross-tenant access is denied without signing or history", async () => {
  const f = fixture({ resourcePublisherId: "publisher-b" });
  const result = await prepare("TEACHER", f.dependencies);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 404);
  assert.equal(f.events.includes("sign"), false);
  assert.equal(f.persisted(), 0);
  assert.equal(f.audits[0]?.outcome, "DENIED");
});

test("inactive users are denied before resource authorization", async () => {
  const f = fixture({ active: false });
  const result = await prepare("TEACHER", f.dependencies);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 403);
  assert.equal(f.events.includes("authorize"), false);
  assert.equal(f.persisted(), 0);
});

test("SUPER_ADMIN receives no implicit tenant download access", async () => {
  const f = fixture({ role: "SUPER_ADMIN" });
  const result = await prepare("SUPER_ADMIN", f.dependencies);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 403);
  assert.equal(f.events.includes("authorize"), false);
  assert.equal(f.audits[0]?.outcome, "DENIED");
});

test("malformed resource IDs are denied before resource authorization", async () => {
  const f = fixture({});
  const result = await prepare("TEACHER", f.dependencies, "../resource-a");
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 404);
  assert.equal(f.events.includes("authorize"), false);
  assert.equal(f.audits[0]?.reasonCode, "VALIDATION_FAILED");
});

test("unpublished resources are denied without signing or history", async () => {
  const f = fixture({ role: "ADMIN", published: false });
  const result = await prepare("ADMIN", f.dependencies);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 404);
  assert.equal(f.events.includes("sign"), false);
  assert.equal(f.persisted(), 0);
});

test("malformed or foreign storage values return a sanitized conflict", async () => {
  const f = fixture({ fileUrl: "https://evil.invalid/private?token=secret" });
  const result = await prepare("TEACHER", f.dependencies);
  assert.deepEqual(result, {
    ok: false,
    status: 409,
    code: "INVALID_RESOURCE_STATE",
    message: "Resource file is unavailable.",
  });
  assert.equal(JSON.stringify(result).includes("token=secret"), false);
  assert.equal(JSON.stringify(f.audits).includes("evil.invalid"), false);
  assert.equal(f.persisted(), 0);
});

test("signed URL generation failure is audited without URL or secret leakage", async () => {
  const f = fixture({ signingFailure: true });
  const result = await prepare("TEACHER", f.dependencies);
  assert.deepEqual(result, {
    ok: false,
    status: 500,
    code: "STORAGE_SIGNING_FAILED",
    message: "Could not prepare the resource file.",
  });
  assert.equal(f.persisted(), 0);
  assert.equal(f.audits[0]?.outcome, "FAILURE");
  assert.equal(JSON.stringify(f.audits).includes("secret"), false);
  assert.equal(JSON.stringify(result).includes("signed.invalid"), false);
});

test("missing object creates no download history", async () => {
  const f = fixture({ role: "STUDENT", objectExists: false });
  const result = await prepare("STUDENT", f.dependencies);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 404);
  assert.equal(f.events.includes("sign"), false);
  assert.equal(f.persisted(), 0);
});

test("storage target accepts only tenant resource keys or approved legacy URLs", () => {
  assert.deepEqual(resolveProtectedStorageTarget(objectKey, publisherId), {
    kind: "OBJECT_KEY",
    key: objectKey,
  });
  assert.throws(
    () => resolveProtectedStorageTarget("resources/files/publisher-b/file.pdf", publisherId),
  );
  assert.throws(() => resolveProtectedStorageTarget("", publisherId));
  const legacy =
    "https://example.public.blob.vercel-storage.com/publishers/publisher-a/resources/files/resource.pdf";
  assert.deepEqual(resolveProtectedStorageTarget(legacy, publisherId), {
    kind: "LEGACY_URL",
    url: legacy,
  });
});

test("server adapter records sanitized success, denial, and signing-failure audits", () => {
  assert.match(serverService, /action: "storage\.download"/);
  assert.match(serverService, /SecurityAuditOutcome\.SUCCESS/);
  assert.match(serverService, /SecurityAuditOutcome\.DENIED/);
  assert.match(serverService, /SecurityAuditOutcome\.FAILURE/);
  assert.match(serverService, /metadata: \{ scope, fileOperation: "download" \}/);
  assert.doesNotMatch(serverService, /metadata: \{[^}]*url/i);
});
