import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decideBookEntitlement } from "../lib/entitlements/book-policy";

const read = (path: string) => readFileSync(path, "utf8");

test("T-05B direct mapping is the teacher/student runtime source of truth", () => {
  const entitlement = read("lib/entitlements/book.ts");
  const teacher = read("lib/teacher-dashboard.ts");
  const student = read("lib/student-subjects.ts");
  assert.match(entitlement, /prisma\.sectionSubject\.(findMany|findFirst)/);
  assert.match(entitlement, /bookId: book\.id/);
  assert.match(teacher, /book: \{ include: \{ series: true \} \}/);
  assert.match(student, /book: \{/);
  assert.doesNotMatch(entitlement, /SchoolBookAdoption|schoolBookAdoption/);
  assert.doesNotMatch(student, /bookAdoptions/);
});

test("raw book ids cannot satisfy teacher or student access without direct scope", () => {
  const base = {
    authenticated: true,
    recordFound: true,
    published: true,
    publisherActive: true,
    samePublisher: true,
    schoolActive: true,
    academicContext: true,
    assignment: true,
    enrollment: false,
    schoolEntitled: true,
    scopeAssigned: false,
  } as const;
  assert.deepEqual(decideBookEntitlement({ ...base, role: "TEACHER" }), { allowed: false, reason: "BOOK_NOT_APPROVED" });
  assert.deepEqual(decideBookEntitlement({ ...base, role: "STUDENT", assignment: false, enrollment: true }), { allowed: false, reason: "BOOK_NOT_APPROVED" });
});

test("protected PDF remains centralized and same-origin", () => {
  const route = read("app/api/books/[bookId]/full-pdf/route.ts");
  assert.match(route, /getBookEntitlementForAuthenticatedUser/);
  assert.match(route, /getObjectBytes/);
  assert.doesNotMatch(route, /NextResponse\.redirect/);
});

test("student dashboard readiness uses direct entitled SectionSubject.book", () => {
  const dashboard = read("lib/student-dashboard.ts");
  assert.match(dashboard, /book: \{/);
  assert.match(dashboard, /schoolEntitlements:/);
  assert.doesNotMatch(dashboard, /bookAdoptions/);
});
