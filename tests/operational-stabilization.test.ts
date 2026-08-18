import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("publisher seed contains no operational school, teacher, class, or section fixtures", () => {
  const seed = read("prisma/seed.ts");
  assert.doesNotMatch(seed, /Bluegate Demonstration School/);
  assert.doesNotMatch(seed, /teacher@bluegatepublishers\.com/);
  assert.doesNotMatch(seed, /school@bluegatepublishers\.com/);
  assert.doesNotMatch(seed, /prisma\.(school|teacher|academicYear|schoolClass|classSection)\.(create|upsert)/);
  assert.match(seed, /prisma\.bookSeries\.upsert/);
  assert.match(seed, /PlatformFeatureKey\.ASSIGNMENTS/);
});

test("cleanup is exact-target, dry-run-first, local-only, and publisher preserving", () => {
  const cleanup = read("scripts/cleanup-operational-demo.ts");
  assert.match(cleanup, /DEMO_SCHOOL_EMAIL/);
  assert.match(cleanup, /DEMO_TEACHER_EMAIL/);
  assert.match(cleanup, /DEMO_SCHOOL_NAME/);
  assert.match(cleanup, /process\.argv\.includes\("--apply"\)/);
  assert.match(cleanup, /Refusing operational cleanup: DATABASE_URL is not local/);
  assert.match(cleanup, /publisherContentPreserved/);
  assert.doesNotMatch(cleanup, /prisma\.(book|resource|bookChapter)\.delete/);
});

test("teacher classrooms and resources use only current official subject assignments", () => {
  const classroom = read("lib/classroom.ts");
  const resource = read("lib/resource-access-policy.ts");
  assert.match(classroom, /academicYear: \{ active: true, current: true/);
  assert.match(classroom, /subjectId: \{ in: assignedSubjectIds \}/);
  assert.doesNotMatch(classroom, /isClassTeacher \? \{\} : \{ subjectId/);
  assert.match(resource, /subjectId: \{ not: null \}/);
  assert.match(resource, /academicYear: \{ active: true, current: true \}/);
});

test("classroom assignments require one officially assigned subject", () => {
  const validation = read("lib/assignments/validation.ts");
  const builder = read("components/assignments/AssignmentBuilder.tsx");
  assert.match(validation, /sectionSubjectId: requiredId/);
  assert.match(builder, /name="sectionSubjectId" required/);
  assert.doesNotMatch(builder, /General class work/);
});

test("book assignment requires direct entitled book compatibility", () => {
  const policy = read("lib/section-subject-content-policy.ts");
  const actions = read("app/school-dashboard/academic-actions.ts");
  assert.match(policy, /schoolEntitlements:/);
  assert.match(policy, /isSectionSubjectBookCompatible/);
  assert.match(actions, /isSectionSubjectBookCompatible/);
  assert.match(actions, /assignApprovedBook/);
  assert.match(actions, /data: \{ bookId \}/);
});

test("resources inherit independently from section subject assignment and audience", () => {
  const policy = read("lib/resource-access-policy.ts");
  const entitlement = read("lib/entitlements/resource.ts");
  const download = read("lib/storage/protected-download.ts");
  assert.doesNotMatch(policy, /bookAdoptions:/);
  assert.doesNotMatch(entitlement, /bookAdoptions:/);
  assert.doesNotMatch(download, /bookAdoptions:/);
  assert.match(entitlement, /audience: \{ in: \[ResourceAudience\.STUDENT, ResourceAudience\.BOTH\] \}/);
});

test("school dashboard has books, resources, and a non-horizontal mobile menu", () => {
  const navigation = read("components/school/SchoolNavigation.tsx");
  const books = read("app/school-dashboard/books/page.tsx");
  const resources = read("app/school-dashboard/resources/page.tsx");
  const inspections = read("app/school-dashboard/inspection-requests/page.tsx");
  assert.match(navigation, /href: "\/school-dashboard\/books"/);
  assert.doesNotMatch(navigation, /overflow-x-auto/);
  assert.match(navigation, /School menu/);
  for (const label of ["Publisher Catalogue", "My School Books", "Assign approved book"]) {
    assert.match(books, new RegExp(label));
  }
  for (const label of ["Publisher Resources", "Assign Resources", "Assigned Resources"]) {
    assert.match(resources, new RegExp(label));
  }
  assert.doesNotMatch(navigation + books + resources + inspections, /overflow-x-auto|min-w-\[[^\]]+\]|<table/);
});
