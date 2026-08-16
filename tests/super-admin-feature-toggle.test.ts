import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getPublisherFeatureEnablementError } from "../lib/platform-feature-policy";

const read = (path: string) => readFileSync(path, "utf8");

test("publisher feature readiness permits only implemented and active features", () => {
  assert.equal(getPublisherFeatureEnablementError({ implemented: true, active: true }, true), null);
  assert.equal(getPublisherFeatureEnablementError({ implemented: false, active: true }, true), "Feature is not ready for publisher access.");
  assert.equal(getPublisherFeatureEnablementError({ implemented: true, active: false }, true), "Feature is not ready for publisher access.");
  assert.equal(getPublisherFeatureEnablementError({ implemented: false, active: false }, true), "Feature is not ready for publisher access.");
  assert.equal(getPublisherFeatureEnablementError({ implemented: false, active: false }, false), null);
});

test("Super Admin publisher feature mutation is guarded and audited", () => {
  const source = read("app/super-admin/publishers/actions.ts");
  assert.match(source, /requireSuperAdmin/);
  assert.match(source, /implemented: true/);
  assert.match(source, /active: true/);
  assert.match(source, /getPublisherFeatureEnablementError\(feature, enabled\)/);
  assert.match(source, /reasonCode: "VALIDATION_FAILED"/);
  assert.match(source, /publisherFeature\.upsert/);
});
