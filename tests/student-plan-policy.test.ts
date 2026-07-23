import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveStudentPlan, isStudentPlanGrantActive } from "@/lib/entitlements/student-plan-policy";
import { buildStudentSubjectViewModels } from "@/lib/student-subject-policy";

function makeGrant(overrides: {
  academicYearId?: string;
  plan?: "SCHOOL_BASIC" | "SCHOOL_PREMIUM" | "INDIVIDUAL_PREMIUM" | "INDIVIDUAL_PREMIUM_MENTOR";
  source?: "SCHOOL" | "MANUAL_TEST" | "PUBLISHER_ADMIN" | "INDIVIDUAL";
  active?: boolean;
  startsAt?: Date;
  endsAt?: Date | null;
} = {}) {
  return {
    academicYearId: overrides.academicYearId ?? "year-1",
    plan: overrides.plan ?? "SCHOOL_BASIC",
    source: overrides.source ?? "SCHOOL",
    active: overrides.active ?? true,
    startsAt: overrides.startsAt ?? new Date("2025-01-01T00:00:00Z"),
    endsAt: overrides.endsAt ?? null,
  };
}

test("student plan policy falls back to SCHOOL_BASIC when no active grants exist", () => {
  const result = resolveEffectiveStudentPlan("year-1", [], new Date("2025-06-01T00:00:00Z"));
  assert.equal(result.plan, "SCHOOL_BASIC");
  assert.equal(result.source, "DEFAULT_SCHOOL_BASIC");
});

test("student plan policy prefers higher plan strength", () => {
  const grants = [
    makeGrant({ plan: "SCHOOL_BASIC", source: "SCHOOL" }),
    makeGrant({ plan: "INDIVIDUAL_PREMIUM", source: "INDIVIDUAL" }),
  ];
  const result = resolveEffectiveStudentPlan("year-1", grants, new Date("2025-06-01T00:00:00Z"));
  assert.equal(result.plan, "INDIVIDUAL_PREMIUM");
  assert.equal(result.source, "INDIVIDUAL");
});

test("student plan policy breaks ties by source strength", () => {
  const grants = [
    makeGrant({ plan: "SCHOOL_PREMIUM", source: "SCHOOL" }),
    makeGrant({ plan: "SCHOOL_PREMIUM", source: "PUBLISHER_ADMIN" }),
  ];
  const result = resolveEffectiveStudentPlan("year-1", grants, new Date("2025-06-01T00:00:00Z"));
  assert.equal(result.source, "PUBLISHER_ADMIN");
});

test("student plan policy ignores inactive or expired grants", () => {
  const now = new Date("2025-06-01T00:00:00Z");
  const grants = [
    makeGrant({ active: false }),
    makeGrant({ startsAt: new Date("2025-07-01T00:00:00Z") }),
    makeGrant({ endsAt: new Date("2025-05-01T00:00:00Z") }),
  ];
  const result = resolveEffectiveStudentPlan("year-1", grants, now);
  assert.equal(result.plan, "SCHOOL_BASIC");
});

test("isStudentPlanGrantActive returns true for matching active in-window grant", () => {
  const g = makeGrant({ startsAt: new Date("2025-01-01T00:00:00Z"), endsAt: new Date("2025-12-31T00:00:00Z") });
  assert.equal(isStudentPlanGrantActive(g, "year-1", new Date("2025-06-01T00:00:00Z")), true);
});

test("isStudentPlanGrantActive returns false when academicYearId mismatches", () => {
  const g = makeGrant();
  assert.equal(isStudentPlanGrantActive(g, "year-2", new Date("2025-06-01T00:00:00Z")), false);
});

test("student subject policy returns subjects without approved adoptions", () => {
  const viewModels = buildStudentSubjectViewModels(
    { schoolId: "school-1", publisherId: "pub-1", academicYearId: "year-1", schoolClassId: "class-1", className: "Class 1", sectionId: "section-1", resourcesEnabled: false },
    [
      {
        id: "ss-1",
        sectionId: "section-1",
        active: true,
        sortOrder: 1,
        subject: { id: "sub-1", name: "Math", code: "MATH", active: true },
        adoptions: [],
        resources: [],
        assignments: [],
      },
    ],
  );
  assert.equal(viewModels.length, 1);
  assert.equal(viewModels[0].hasApprovedBook, false);
});

test("student subject policy normalizes class names for adoption matching", () => {
  const viewModels = buildStudentSubjectViewModels(
    { schoolId: "school-1", publisherId: "pub-1", academicYearId: "year-1", schoolClassId: "class-1", className: "Class 1", sectionId: "section-1", resourcesEnabled: false },
    [
      {
        id: "ss-1",
        sectionId: "section-1",
        active: true,
        sortOrder: 1,
        subject: { id: "sub-1", name: "Math", code: "MATH", active: true },
        adoptions: [
          {
            schoolId: "school-1",
            publisherId: "pub-1",
            academicYearId: "year-1",
            schoolClassId: "class-1",
            sectionId: "section-1",
            sectionSubjectId: "ss-1",
            status: "APPROVED",
            active: true,
            book: {
              id: "book-1",
              publisherId: "pub-1",
              subjectId: "sub-1",
              title: "Math Book",
              coverImage: null,
              published: true,
              class: { name: "Class 1" },
              subject: { name: "Math" },
              series: null,
            },
          },
        ],
        resources: [],
        assignments: [],
      },
    ],
  );
  assert.equal(viewModels[0].hasApprovedBook, true);
  assert.equal(viewModels[0].book?.id, "book-1");
});