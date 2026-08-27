import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReadiness } from "../lib/readiness";

test("readiness reports healthy application, configuration, and database", async () => {
  assert.deepEqual(await evaluateReadiness({ databaseConfigured: true, authenticationConfigured: true, checkDatabase: async () => undefined }), { application: "ok", configuration: "ok", database: "ok", ready: true });
});

test("readiness fails closed when critical configuration is missing", async () => {
  const result = await evaluateReadiness({ databaseConfigured: true, authenticationConfigured: false, checkDatabase: async () => undefined });
  assert.equal(result.ready, false);
  assert.equal(result.configuration, "missing");
  assert.equal(result.database, "ok");
});

test("readiness distinguishes database outage without exposing provider details", async () => {
  const result = await evaluateReadiness({ databaseConfigured: true, authenticationConfigured: true, checkDatabase: async () => { throw new Error("private provider detail"); } });
  assert.deepEqual(result, { application: "ok", configuration: "ok", database: "unavailable", ready: false });
  assert.doesNotMatch(JSON.stringify(result), /private provider detail/);
});

test("readiness does not query a missing database configuration", async () => {
  let queried = false;
  const result = await evaluateReadiness({ databaseConfigured: false, authenticationConfigured: true, checkDatabase: async () => { queried = true; } });
  assert.equal(queried, false);
  assert.equal(result.database, "not_configured");
  assert.equal(result.ready, false);
});
