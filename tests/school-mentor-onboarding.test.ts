import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("school mentor onboarding reuses existing identity, membership, assignment, and password challenge models", () => {
  const schema = read("prisma/schema.prisma");
  const service = read("lib/school-mentors.ts");
  for (const model of ["Mentor", "SchoolStaffMembership", "MentorStudentAssignment", "PasswordResetChallenge"]) assert.match(schema, new RegExp(`model ${model}\\b`));
  assert.match(service, /tx\.mentor\.create/);
  assert.match(service, /tx\.schoolStaffMembership\.create/);
  assert.match(service, /assignPrimaryMentor/);
  assert.match(service, /tx\.passwordResetChallenge\.create/);
});

test("mentor management is scoped through the authenticated school membership", () => {
  const service = read("lib/school-mentors.ts");
  assert.match(service, /const school = await requireSchool\(\)/);
  assert.match(service, /schoolId: school\.id/);
  assert.match(service, /publisherId: school\.publisherId/);
  assert.match(service, /source: MentorAssignmentSource\.SCHOOL/);
  assert.doesNotMatch(service, /mentorNote\.find|notes:/i);
});

test("school never creates or exposes a mentor password and activation tokens are hashed and expiring", () => {
  const service = read("lib/school-mentors.ts");
  const newPage = read("app/school-dashboard/people/mentors/new/page.tsx");
  const detail = read("app/school-dashboard/people/mentors/[mentorId]/page.tsx");
  assert.match(service, /hashPassword\(randomBytes/);
  assert.match(service, /mustChangePassword: true/);
  assert.match(service, /hashSecurityValue\("password-reset-completion"/);
  assert.match(service, /completionExpiresAt: expiresAt/);
  assert.doesNotMatch(newPage, /name="password"/);
  assert.doesNotMatch(detail, /user\.password|passwordHash/);
});

test("mentor activation sets the private password and clears login setup state", () => {
  const service = read("lib/school-mentors.ts");
  const page = read("app/(auth)/mentor-activate/page.tsx");
  assert.match(service, /validatePassword/);
  assert.match(service, /emailVerifiedAt: now, mustChangePassword: false/);
  assert.match(service, /staffMemberships\.length === 0/);
  assert.match(page, /MentorActivationForm/);
});

test("school People navigation includes Mentors without a new top-level sidebar section", () => {
  const navigation = read("components/school/SchoolNavigation.tsx");
  const people = navigation.slice(navigation.indexOf("const people"), navigation.indexOf("const academics"));
  assert.match(people, /"Mentors", "\/school-dashboard\/people\/mentors"/);
  assert.equal((navigation.match(/link\("Mentors"/g) ?? []).length, 0);
});
