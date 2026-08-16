import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("app/school-dashboard/planner/actions.ts", "utf8");

function actionBody(name: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = actions.indexOf("export async function ", start + 1);
  return actions.slice(start, next === -1 ? actions.length : next);
}

test("all School Planner mutations enforce the canonical PLANNER feature", () => {
  const create = actionBody("createSchoolPlannerItem");
  const update = actionBody("updateSchoolPlannerStatus");
  const reschedule = actionBody("rescheduleSchoolPlannerItem");

  assert.match(create, /await requireSchoolFeature\("PLANNER"\)/);
  assert.match(update, /const school=await requireSchool\(\);await requireSchoolFeature\("PLANNER"\);/);
  assert.match(reschedule, /const school=await requireSchool\(\);await requireSchoolFeature\("PLANNER"\);/);
  assert.equal((actions.match(/await requireSchoolFeature\("PLANNER"\)/g) ?? []).length, 3);
});

test("Planner mutations retain tenant ownership and reschedule history", () => {
  const update = actionBody("updateSchoolPlannerStatus");
  const reschedule = actionBody("rescheduleSchoolPlannerItem");

  assert.match(update, /where:\{id,schoolId:school\.id,sectionId:null/);
  assert.match(reschedule, /where:\{id,schoolId:school\.id,sectionId:null/);
  assert.match(reschedule, /prisma\.\$transaction/);
  assert.match(reschedule, /academicPlannerReschedule\.create/);
  assert.match(reschedule, /createdByUserId:school\.userId/);
});

test("Planner keeps the centralized School feature mapping", () => {
  const definitions = readFileSync("lib/school-feature-entitlements.ts", "utf8");
  assert.match(definitions, /key: "PLANNER"[\s\S]*publisherFeature: PlatformFeatureKey\.CALENDAR/);
});
