import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

test('S-UX-01 navigation groups People registrations', () => {
  const nav = source('components/school/SchoolNavigation.tsx');
  assert.match(nav, /Registration Requests/);
  assert.match(nav, /const people/);
});

test('S-UX-01 navigation keeps the requested Academics labels', () => {
  const nav = source('components/school/SchoolNavigation.tsx');
  for (const label of ['Academic Year', 'Classes & Sections', 'Subjects', 'Teacher Assignments', 'Books']) assert.match(nav, new RegExp(label));
  assert.doesNotMatch(nav, /Books & Resources/);
});

test('S-UX-01 places Timetable under Planning', () => {
  const nav = source('components/school/SchoolNavigation.tsx');
  assert.match(nav, /const planning/);
  assert.match(nav, /visiblePlanning.map/);
  assert.match(nav, /Timetable/);
});

test('S-UX-01 People pages use compact tabular projections', () => {
  for (const file of ['app/school-dashboard/people/page.tsx', 'app/school-dashboard/students/page.tsx', 'app/school-dashboard/teachers/page.tsx', 'app/school-dashboard/staff/page.tsx', 'app/school-dashboard/people/mentors/page.tsx', 'app/school-dashboard/teacher-requests/page.tsx']) assert.match(source(file), /<table|CompactList/);
});

test('S-UX-01 student creation reuses the existing secure action', () => {
  const page = source('app/school-dashboard/students/page.tsx');
  assert.match(page, /action={createStudent}/);
  assert.doesNotMatch(page, /name="password"/);
});

test('S-UX-01 teacher creation preserves the existing secure action', () => {
  const page = source('app/school-dashboard/teachers/page.tsx');
  assert.match(page, /action={createSchoolTeacher}/);
  assert.doesNotMatch(page, /name="password"/);
});

test('S-UX-01 assignment manager supports one panel with teacher class section', () => {
  const page = source('app/school-dashboard/teacher-assignments/page.tsx');
  const manager = source('components/school/SchoolTeacherAssignmentManager.tsx');
  assert.match(page, /SchoolTeacherAssignmentManager/);
  for (const field of ['teacherId', 'schoolClassId', 'sectionId']) assert.match(manager, new RegExp(field));
});

test('S-UX-01 assignment manager supports multiple subjects', () => {
  const manager = source('components/school/SchoolTeacherAssignmentManager.tsx');
  assert.match(manager, /name="subjectIds"/);
  assert.match(manager, /setSubjectIds/);
});

test('S-UX-01 assignment manager exposes class teacher choice', () => {
  const manager = source('components/school/SchoolTeacherAssignmentManager.tsx');
  assert.match(manager, /name="classTeacher"/);
  assert.match(manager, /Make class teacher/);
});

test('S-UX-01 book resolution queries published active entitlements', () => {
  const service = source('lib/school-teacher-assignments.ts');
  assert.match(service, /published: true/);
  assert.match(service, /archived: false/);
  assert.match(service, /status: "ACTIVE"/);
});

test('S-UX-01 book resolution matches class and subject', () => {
  const service = source('lib/school-teacher-assignments.ts');
  assert.ok(service.includes('book.subject.id === subject.subjectId'));
  assert.ok(service.includes('normalizeAcademicName(book.class.name)'));
});

test('S-UX-01 exactly one book auto-resolves', () => {
  const service = source('lib/school-teacher-assignments.ts');
  assert.ok(service.includes('candidates.length === 1 ? candidates[0].id'));
});

test('S-UX-01 multiple books require an explicit selection', () => {
  const manager = source('components/school/SchoolTeacherAssignmentManager.tsx');
  const service = source('lib/school-teacher-assignments.ts');
  assert.match(manager, /candidates.length > 1/);
  assert.match(manager, /required/);
  assert.match(service, /candidates.length > 1 && !resolved/);
});

test('S-UX-01 no-book assignments remain valid but warn', () => {
  const manager = source('components/school/SchoolTeacherAssignmentManager.tsx');
  const service = source('lib/school-teacher-assignments.ts');
  assert.match(manager, /No entitled book available/);
  assert.match(service, /bookId: resolved/);
});

test('S-UX-01 book mapping is updated on SectionSubject in the assignment transaction', () => {
  const service = source('lib/school-teacher-assignments.ts');
  assert.ok(service.includes('prisma.$transaction'));
  assert.ok(service.includes('tx.sectionSubject.update'));
});

test('S-UX-01 reassignments deactivate previous subject assignments', () => {
  const service = source('lib/school-teacher-assignments.ts');
  assert.match(service, /type: TeacherAssignmentType.SUBJECT_TEACHER/);
  assert.match(service, /active: false, endedAt: new Date()/);
});

test('S-UX-01 assignment removal is explicit and scoped to the current school', () => {
  const service = source('lib/school-teacher-assignments.ts');
  const page = source('app/school-dashboard/teacher-assignments/page.tsx');
  assert.match(service, /removeSchoolTeacherAssignments/);
  assert.match(service, /schoolId: school.id, teacherId, sectionId/);
  assert.match(page, /SchoolTeacherAssignmentRemoveButton/);
});

test('S-UX-01 Books page shows assigned sections and routes back to assignments', () => {
  const books = source('app/school-dashboard/books/page.tsx');
  assert.match(books, /Assigned sections/);
  assert.match(books, /teacher-assignments/);
  assert.doesNotMatch(books, /SchoolBookAssignmentWorkspace/);
});

test('S-UX-01 class subject editing keeps book mapping out of the class workflow', () => {
  const page = source('app/school-dashboard/classes/[id]/page.tsx');
  const manager = source('components/school/SectionSubjectContentManager.tsx');
  assert.ok(page.includes('showBook={false}'));
  assert.ok(manager.includes('showBook?: boolean'));
});
