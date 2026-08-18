import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

test('S-UX-01A exposes a serializable result contract with stable codes', () => {
  const action = read('app/school-dashboard/teacher-assignments/actions.ts');
  const service = read('lib/school-teacher-assignments.ts');
  assert.match(action, /AssignmentActionResult/);
  for (const code of ['TEACHER_NOT_AVAILABLE', 'CLASS_NOT_AVAILABLE', 'SECTION_NOT_AVAILABLE', 'SUBJECT_NOT_AVAILABLE', 'BOOK_SELECTION_REQUIRED', 'BOOK_NOT_ELIGIBLE', 'ASSIGNMENT_NOT_AVAILABLE']) assert.match(service, new RegExp(code));
});

test('S-UX-01A catches only the expected domain error', () => {
  const action = read('app/school-dashboard/teacher-assignments/actions.ts');
  assert.match(action, /instanceof SchoolTeacherAssignmentError/);
  assert.match(action, /console\.error/);
  assert.match(action, /throw error/);
});

test('S-UX-01A preserves redirects and unexpected failures', () => {
  const action = read('app/school-dashboard/teacher-assignments/actions.ts');
  assert.match(action, /unstable_rethrow/);
  assert.match(action, /Unexpected school teacher assignment/);
});

test('S-UX-01A create and edit use controlled action state', () => {
  const manager = read('components/school/SchoolTeacherAssignmentManager.tsx');
  assert.match(manager, /useActionState/);
  assert.match(manager, /action=\{formAction\}/);
  assert.match(manager, /state\.message/);
});

test('S-UX-01A expected save failures render an accessible form alert', () => {
  const manager = read('components/school/SchoolTeacherAssignmentManager.tsx');
  assert.match(manager, /role="alert"/);
  assert.match(manager, /state\.message/);
});

test('S-UX-01A field errors are associated with teacher, class, section, and book controls', () => {
  const manager = read('components/school/SchoolTeacherAssignmentManager.tsx');
  for (const id of ['assignment-teacher', 'assignment-class', 'assignment-section', 'bookField']) assert.match(manager, new RegExp(id));
  assert.match(manager, /aria-describedby/);
});

test('S-UX-01A prevents duplicate Save submissions and restores on failure', () => {
  const manager = read('components/school/SchoolTeacherAssignmentManager.tsx');
  assert.match(manager, /disabled=\{pending\}/);
  assert.match(manager, /Saving/);
});

test('S-UX-01A remove uses inline safe feedback and refreshes successful state', () => {
  const remove = read('components/school/SchoolTeacherAssignmentRemoveButton.tsx');
  assert.match(remove, /useActionState/);
  assert.match(remove, /role="alert"/);
  assert.match(read('app/school-dashboard/teacher-assignments/actions.ts'), /Assignment removed/);
  assert.match(remove, /router\.refresh/);
});

test('S-UX-01A prevents duplicate Remove submissions', () => {
  const remove = read('components/school/SchoolTeacherAssignmentRemoveButton.tsx');
  assert.match(remove, /disabled=\{pending\}/);
  assert.match(remove, /Removing/);
});

test('S-UX-01A keeps one, multiple, and zero-book rules unchanged', () => {
  const service = read('lib/school-teacher-assignments.ts');
  assert.match(service, /candidates\.length === 1/);
  assert.match(service, /BOOK_SELECTION_REQUIRED/);
  assert.match(service, /bookId: resolved/);
});

test('S-UX-01A rejects stale or ineligible selected books safely', () => {
  const service = read('lib/school-teacher-assignments.ts');
  assert.match(service, /BOOK_NOT_ELIGIBLE/);
  assert.match(service, /published: true/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /normalizeAcademicName/);
});

test('S-UX-01A keeps authorization checks before mutation', () => {
  const service = read('lib/school-teacher-assignments.ts');
  assert.match(service, /schoolId: school\.id/);
  assert.match(service, /schoolMemberships/);
  assert.match(service, /prisma\.\$transaction/);
  assert.match(service, /tx\.sectionSubject\.update/);
});

test('S-UX-01A treats stale removal as a recoverable expected result', () => {
  const service = read('lib/school-teacher-assignments.ts');
  assert.match(service, /updateMany/);
  assert.match(service, /ASSIGNMENT_NOT_AVAILABLE/);
});

test('S-UX-01A does not restore SchoolBookAdoption runtime authorization', () => {
  const service = read('lib/school-teacher-assignments.ts');
  assert.doesNotMatch(service, /SchoolBookAdoption|bookAdoptions/);
});

test('S-UX-01A has no Prisma schema or migration scope', () => {
  assert.equal(read('prisma/schema.prisma').includes('S-UX-01A'), false);
});
