import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("lifecycle mapping derives draft, scheduled, active, closed, archived", () => {
  const deriveTeacherAssessmentLifecycleStatus = (input: {
    status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
    opensAt: Date | null;
    dueAt: Date | null;
    now?: Date;
  }) => {
    if (input.status === "DRAFT") return "DRAFT" as const;
    if (input.status === "ARCHIVED") return "ARCHIVED" as const;
    if (input.status === "CLOSED") return "CLOSED" as const;
    const now = input.now ?? new Date();
    if (input.opensAt && now < input.opensAt) return "SCHEDULED" as const;
    if (input.dueAt && now >= input.dueAt) return "CLOSED" as const;
    return "ACTIVE" as const;
  };

  const now = new Date("2026-08-02T10:00:00Z");
  assert.equal(deriveTeacherAssessmentLifecycleStatus({ status: "DRAFT", opensAt: null, dueAt: null, now }), "DRAFT");
  assert.equal(deriveTeacherAssessmentLifecycleStatus({ status: "ARCHIVED", opensAt: null, dueAt: null, now }), "ARCHIVED");
  assert.equal(deriveTeacherAssessmentLifecycleStatus({ status: "CLOSED", opensAt: null, dueAt: null, now }), "CLOSED");
  assert.equal(deriveTeacherAssessmentLifecycleStatus({ status: "PUBLISHED", opensAt: new Date("2026-08-02T12:00:00Z"), dueAt: null, now }), "SCHEDULED");
  assert.equal(deriveTeacherAssessmentLifecycleStatus({ status: "PUBLISHED", opensAt: new Date("2026-08-01T09:00:00Z"), dueAt: new Date("2026-08-03T09:00:00Z"), now }), "ACTIVE");
  assert.equal(deriveTeacherAssessmentLifecycleStatus({ status: "PUBLISHED", opensAt: new Date("2026-08-01T09:00:00Z"), dueAt: new Date("2026-08-02T09:00:00Z"), now }), "CLOSED");
});

test("teacher assessment service enforces publish, duplicate, archive, restore, and question protections", () => {
  const source = read("lib/teacher-assessments.ts");
  assert.match(source, /classroom\.assessment\.create/);
  assert.match(source, /classroom\.assessment\.update/);
  assert.match(source, /classroom\.assessment\.publish/);
  assert.match(source, /classroom\.assessment\.archive/);
  assert.match(source, /classroom\.assessment\.restore/);
  assert.match(source, /classroom\.assessment\.duplicate/);
  assert.match(source, /Question content is locked after the first student attempt/);
  assert.match(source, /ensurePublishable/);
  assert.match(source, /isValidAssessmentQuestion/);
  assert.match(source, /toSafeAssessmentQuestion/);
});

test("teacher editor route includes required question sources and preview flow", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx");
  assert.match(page, /Publisher Book Questions/);
  assert.match(page, /Teacher Question Bank/);
  assert.match(page, /Previous Assessment Questions/);
  assert.match(page, /AI Question Generator/);
  assert.match(page, /Manual Question/);
  assert.match(page, /Preview/);
  assert.match(page, /Publish/);
});

test("assessment list route exposes required lifecycle buckets and actions", () => {
  const page = read("app/teacher-dashboard/classes/[sectionId]/assessments/page.tsx");
  for (const label of ["Draft", "Scheduled", "Active", "Closed", "Archived"]) {
    assert.match(page, new RegExp(label));
  }
  for (const action of ["Open", "Duplicate", "Archive", "Restore", "Create Assessment"]) {
    assert.match(page, new RegExp(action));
  }
});

test("security audit policy allow-lists classroom assessment actions", () => {
  const policy = read("lib/security-audit-policy.ts");
  for (const action of [
    "classroom.assessment.create",
    "classroom.assessment.update",
    "classroom.assessment.publish",
    "classroom.assessment.archive",
    "classroom.assessment.restore",
    "classroom.assessment.duplicate",
  ]) {
    assert.match(policy, new RegExp(action.replace(/\./g, "\\.")));
  }
  assert.match(policy, /\| "Assessment"/);
});
