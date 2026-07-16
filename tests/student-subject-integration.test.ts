import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(path), "utf8");

test("student subject resolver starts from requireStudent and server-owned enrollment scope", () => {
  const resolver = source("lib/student-subjects.ts");
  assert.match(resolver, /const identity = await requireStudent\(\)/);
  assert.match(resolver, /sectionId: enrollment\.sectionId/);
  assert.match(resolver, /academicYearId: enrollment\.academicYearId/);
  assert.match(resolver, /publisherId: publisher\.id/);
});

test("student subject selects omit protected book and resource URLs", () => {
  const resolver = source("lib/student-subjects.ts");
  assert.doesNotMatch(resolver, /fullBookPdf:\s*true|fileUrl:\s*true/);
  assert.match(resolver, /audience: \{ in: \[ResourceAudience\.STUDENT, ResourceAudience\.BOTH\] \}/);
});

test("resource route authorizes before redirecting and never returns a denied URL", () => {
  const route = source("app/api/student/resources/[resourceId]/open/route.ts");
  assert.match(route, /await requireStudent\(\)/);
  const authorize = route.indexOf("await resolveStudentResource");
  const redirect = route.indexOf("NextResponse.redirect(resource.fileUrl");
  assert.ok(authorize >= 0 && authorize < redirect);
  assert.doesNotMatch(route.slice(route.indexOf("if (!resource)"), redirect), /fileUrl/);
  assert.match(route, /private, no-store/);
  assert.match(route, /no-referrer/);
});

test("resource resolver composes the central entitlement engine", () => {
  const resolver = source("lib/student-subjects.ts");
  assert.match(resolver, /resolveResourceEntitlementForAuthenticatedUser/);
  assert.match(resolver, /authorizeStudentResourceFromSubjects/);
});

test("subject detail validates route ID and full book uses protected endpoint", () => {
  const page = source("app/student-dashboard/subjects/[sectionSubjectId]/page.tsx");
  assert.match(page, /await getStudentSubject\(sectionSubjectId\)/);
  assert.match(page, /if \(!subject\) notFound\(\)/);
  const book = source("components/student/StudentBookCard.tsx");
  assert.match(book, /\/student-dashboard\/books\/\$\{book\.id\}/);
  assert.doesNotMatch(book, /fullBookPdf|public preview/i);
  const reader = source("components/student/StudentPdfReader.tsx");
  assert.match(reader, /\/api\/books\/\$\{bookId\}\/full-pdf/);
  assert.doesNotMatch(reader, /fullBookPdf|Download/);
});

test("navigation enables completed student modules but keeps later modules unavailable", () => {
  const navigation = source("components/student/StudentNavigation.tsx");
  assert.match(navigation, /href: "\/student-dashboard\/subjects".*available: true/);
  assert.match(navigation, /href: "\/student-dashboard\/books".*available: true/);
  assert.match(navigation, /Reports/);
  assert.doesNotMatch(navigation, /Assignments|Gap Analysis|Mentor/);
});
