import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const shell = read("components/teacher/TeachModeShell.tsx");
const route = read("app/teacher-dashboard/classes/[sectionId]/teach/page.tsx");
const reader = read("components/books/SmartBookReader.tsx");
const planner = read("app/teacher-dashboard/planner/page.tsx");

test("Teach Mode uses the existing reader and browser fullscreen lifecycle", () => {
  assert.match(shell, /requestFullscreen\(\)/);
  assert.match(shell, /fullscreenchange/);
  assert.match(shell, /document\.exitFullscreen/);
  assert.match(shell, /Exit Teaching Mode/);
  assert.match(route, /SmartBookReader/);
  assert.match(route, /getTeachingPlanPageData/);
});

test("Teach Mode preserves class and subject context on reader exit", () => {
  assert.match(route, /backHref/);
  assert.match(route, /showBackLink={false}/);
  assert.match(reader, /backHref\?: string/);
  assert.match(reader, /showBackLink\?: boolean/);
  assert.match(reader, /resolvedBackLabel/);
});

test("central Planner exposes Teach for persisted timetable periods", () => {
  assert.match(planner, /teachLink/);
  assert.match(planner, />Teach<\/Link>/);
});
