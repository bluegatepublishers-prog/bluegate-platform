import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseTimeMinutes } from "../lib/timetable-time";

const actions = readFileSync("app/school-dashboard/timetable/actions.ts", "utf8");

test("timetable parser converts strict browser HH:mm values to wall-clock minutes", () => {
  assert.equal(parseTimeMinutes("08:00"), 480);
  assert.equal(parseTimeMinutes("14:00"), 840);
  assert.equal(parseTimeMinutes("00:00"), 0);
  assert.equal(parseTimeMinutes("23:59"), 1439);
});

test("timetable parser rejects invalid or non-canonical values", () => {
  for (const value of ["", "8:00", "24:00", "12:60", "abc", "08:00:00"]) {
    assert.throws(() => parseTimeMinutes(value), /Enter a valid time\./);
  }
});

test("timetable actions use the centralized parser for school timing and period slots", () => {
  assert.match(actions, /schoolStartMinute: parseTimeMinutes\(value\(form, "schoolStartMinute"\)\)/);
  assert.match(actions, /schoolEndMinute: parseTimeMinutes\(value\(form, "schoolEndMinute"\)\)/);
  assert.match(actions, /startMinute: parseTimeMinutes\(value\(form, "startMinute"\)\)/);
  assert.match(actions, /endMinute: parseTimeMinutes\(value\(form, "endMinute"\)\)/);
  assert.doesNotMatch(actions, /timeMinutes\(/);
  assert.doesNotMatch(actions, /\\\\d\{2\}/);
  assert.equal(parseTimeMinutes("08:40") - parseTimeMinutes("08:00"), 40);
});