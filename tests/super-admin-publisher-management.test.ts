import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parsePublisherCreationInput } from "../lib/super-admin-publisher-policy";

const read = (path: string) => readFileSync(path, "utf8");

test("Publisher creation input is normalized and does not accept unsafe slugs", () => {
  assert.deepEqual(parsePublisherCreationInput({
    name: "  New   Publisher ",
    slug: "  New Publisher ",
    shortName: " NP ",
    supportEmail: " SUPPORT@EXAMPLE.COM ",
  }), {
    name: "New Publisher",
    slug: "new-publisher",
    shortName: "NP",
    supportEmail: "support@example.com",
  });
  assert.throws(() => parsePublisherCreationInput({ name: "Publisher", slug: "bad_slug" }), /lowercase slug/);
  assert.throws(() => parsePublisherCreationInput({ name: "", slug: "publisher" }), /name is required/);
});

test("Publisher lifecycle persistence uses the existing active field", () => {
  const schema = read("prisma/schema.prisma");
  const publisher = schema.slice(schema.indexOf("model Publisher {"), schema.indexOf("model FeatureDefinition {"));
  assert.match(publisher, /active\s+Boolean\s+@default\(true\)/);
  assert.doesNotMatch(publisher, /\bstatus\s+\w+/);
  assert.doesNotMatch(publisher, /archivedAt|suspendedAt|pausedAt/);
});

test("Super Admin Publisher management is independently guarded and safe", () => {
  const actions = read("app/super-admin/publishers/management-actions.ts");
  assert.match(actions, /requireSuperAdmin\(\)/g);
  assert.match(actions, /enabled: false/);
  assert.match(actions, /publisherFeature\.createMany/);
  assert.match(actions, /writeSecurityAuditEvent/);
  assert.doesNotMatch(actions, /export const initialPublisherCreateState|export type PublisherCreateState/);
  assert.match(read("lib/super-admin-publisher-policy.ts"), /export const initialPublisherCreateState/);
  assert.match(actions, /setPublisherActive\(id, false\)/);
  assert.match(actions, /setPublisherActive\(id, true\)/);
  assert.doesNotMatch(actions, /password|hashPassword|user\.create|publisher\.delete/);

  const existingActions = read("app/super-admin/publishers/actions.ts");
  assert.match(existingActions, /requireSuperAdmin\(\)/g);
  assert.match(existingActions, /togglePublisherFeature/);
  assert.doesNotMatch(existingActions, /publisher\.delete/);
});

test("Publisher list/detail expose Add, Suspend, and Reactivate but no destructive delete", () => {
  const list = read("app/super-admin/publishers/page.tsx");
  const detail = read("app/super-admin/publishers/[id]/page.tsx");
  assert.match(list, /\/super-admin\/publishers\/new/);
  assert.match(list, /Suspend/);
  assert.match(list, /Reactivate/);
  assert.match(detail, /Suspend Publisher/);
  assert.match(detail, /Reactivate Publisher/);
  assert.doesNotMatch(detail, /publisher\.delete|deletePublisher/);
});

test("Super Admin shell identifies Edora and uses the global logout path", () => {
  const layout = read("app/super-admin/layout.tsx");
  const logout = read("components/super-admin/SuperAdminAccountMenu.tsx");
  assert.match(layout, /Edora Learning Pvt Ltd/);
  assert.match(layout, /Platform Features/);
  assert.match(logout, /signOut\(\{ callbackUrl: "\/super-admin\/login" \}\)/);
});
