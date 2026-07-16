import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveEffectiveStudentPlan,
  type StudentPlanGrantCandidate,
} from "../lib/entitlements/student-plan-policy";

const now = new Date("2026-07-13T12:00:00.000Z");
const year = "academic-year-a";
const grant = (
  input: Partial<StudentPlanGrantCandidate> &
    Pick<StudentPlanGrantCandidate, "plan" | "source">,
): StudentPlanGrantCandidate => ({
  academicYearId: year,
  active: true,
  startsAt: new Date("2026-06-01T00:00:00.000Z"),
  endsAt: new Date("2027-03-31T23:59:59.999Z"),
  ...input,
});

test("no grant resolves to SCHOOL_BASIC", () => {
  assert.deepEqual(resolveEffectiveStudentPlan(year, [], now), {
    plan: "SCHOOL_BASIC",
    source: "DEFAULT_SCHOOL_BASIC",
    academicYearId: year,
    startsAt: null,
    endsAt: null,
  });
});

test("school premium grant resolves to SCHOOL_PREMIUM", () => {
  assert.equal(
    resolveEffectiveStudentPlan(
      year,
      [grant({ plan: "SCHOOL_PREMIUM", source: "SCHOOL" })],
      now,
    ).plan,
    "SCHOOL_PREMIUM",
  );
});

test("individual premium overrides school premium", () => {
  const result = resolveEffectiveStudentPlan(
    year,
    [
      grant({ plan: "SCHOOL_PREMIUM", source: "SCHOOL" }),
      grant({ plan: "INDIVIDUAL_PREMIUM", source: "INDIVIDUAL" }),
    ],
    now,
  );
  assert.equal(result.plan, "INDIVIDUAL_PREMIUM");
  assert.equal(result.source, "INDIVIDUAL");
});

test("mentor plan is strongest", () => {
  assert.equal(
    resolveEffectiveStudentPlan(
      year,
      [
        grant({ plan: "INDIVIDUAL_PREMIUM", source: "INDIVIDUAL" }),
        grant({
          plan: "INDIVIDUAL_PREMIUM_MENTOR",
          source: "PUBLISHER_ADMIN",
        }),
      ],
      now,
    ).plan,
    "INDIVIDUAL_PREMIUM_MENTOR",
  );
});

test("inactive, expired, future, and wrong-year grants are ignored", () => {
  const ignored = [
    grant({ plan: "INDIVIDUAL_PREMIUM_MENTOR", source: "INDIVIDUAL", active: false }),
    grant({
      plan: "INDIVIDUAL_PREMIUM_MENTOR",
      source: "INDIVIDUAL",
      endsAt: new Date("2026-07-12T23:59:59.999Z"),
    }),
    grant({
      plan: "INDIVIDUAL_PREMIUM_MENTOR",
      source: "INDIVIDUAL",
      startsAt: new Date("2026-07-14T00:00:00.000Z"),
    }),
    grant({
      plan: "INDIVIDUAL_PREMIUM_MENTOR",
      source: "INDIVIDUAL",
      academicYearId: "academic-year-b",
    }),
  ];
  assert.equal(resolveEffectiveStudentPlan(year, ignored, now).plan, "SCHOOL_BASIC");
});
