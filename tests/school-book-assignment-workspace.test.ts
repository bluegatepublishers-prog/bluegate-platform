import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('app/school-dashboard/books/page.tsx');
const assignments = read('app/school-dashboard/teacher-assignments/page.tsx');

test('School Books is a compact entitled-book list with section usage', () => {
  assert.match(page, /schoolEntitlements/);
  assert.match(page, /Assigned sections/);
  assert.match(page, /teacher-assignments/);
  assert.doesNotMatch(page, /SchoolBookAssignmentWorkspace/);
});

test('Teacher Assignments owns the class, section, subject, and book workflow', () => {
  assert.match(assignments, /SchoolTeacherAssignmentManager/);
  assert.match(assignments, /SchoolTeacherAssignmentRemoveButton/);
});
