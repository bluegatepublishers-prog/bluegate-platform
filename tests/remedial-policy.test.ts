import assert from "node:assert/strict";
import test from "node:test";
import { buildRemedialDraft, REMEDIAL_POLICY } from "../lib/remedials/policy";

const refs = [
  { type: "STUDENT_AI" as const, labelSnapshot: "Fractions", required: false, bookId: "b", chapterId: "c" },
  { type: "INTERACTIVE_PRACTICE" as const, labelSnapshot: "Fractions", required: true, bookId: "b", chapterId: "c" },
  { type: "REVISION_HUB" as const, labelSnapshot: "Fractions", required: true, bookId: "b", chapterId: "c" },
  { type: "REVISION_HUB" as const, labelSnapshot: "Fractions", required: true, bookId: "b", chapterId: "c" },
];

test("remedial mapping is deterministic, prioritized, and deduplicated", () => {
  const now = new Date("2026-07-13T00:00:00Z");
  const first = buildRemedialDraft({ severity: "HIGH", references: refs, now });
  const second = buildRemedialDraft({ severity: "HIGH", references: [...refs].reverse(), now });
  assert.deepEqual(first, second);
  assert.deepEqual(first.recommendations.map((x) => x.type), ["REVISION_HUB", "INTERACTIVE_PRACTICE", "STUDENT_AI"]);
  assert.equal(first.priority, 75);
  assert.equal(first.dueAt.toISOString(), "2026-07-27T00:00:00.000Z");
  assert.equal(first.policyVersion, REMEDIAL_POLICY.version);
});

test("critical gaps receive the highest priority and shortest due window", () => {
  const draft = buildRemedialDraft({ severity: "CRITICAL", references: refs, now: new Date("2026-07-13T00:00:00Z") });
  assert.equal(draft.priority, 100);
  assert.equal(draft.dueAt.toISOString(), "2026-07-20T00:00:00.000Z");
});
