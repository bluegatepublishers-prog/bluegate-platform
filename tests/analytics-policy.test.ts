import assert from "node:assert/strict";
import test from "node:test";
import { average, calculateStreaks, percent, weightedCompletion } from "../lib/analytics-policy";

test("analytics percentages and averages are deterministic and bounded", () => {
  assert.equal(percent(1, 4), 25);
  assert.equal(percent(2, 0), 0);
  assert.equal(percent(12, 10), 100);
  assert.equal(average([50, null, 75, undefined]), 62.5);
  assert.equal(average([]), null);
  assert.equal(weightedCompletion([25, 75]), 50);
});

test("streaks deduplicate same-day activity and allow an active yesterday streak", () => {
  const now = new Date("2026-07-13T12:00:00.000Z");
  const activities = ["2026-07-09", "2026-07-10", "2026-07-10", "2026-07-11", "2026-07-12"].map((date) => ({ occurredAt: new Date(`${date}T08:00:00.000Z`) }));
  assert.deepEqual(calculateStreaks(activities, now), { current: 4, longest: 4 });
});

test("an old streak remains historical but is not current", () => {
  const activities = ["2026-07-01", "2026-07-02"].map((date) => ({ occurredAt: new Date(`${date}T08:00:00.000Z`) }));
  assert.deepEqual(calculateStreaks(activities, new Date("2026-07-13T12:00:00.000Z")), { current: 0, longest: 2 });
});
