import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

import { buildStudentCredentialsWorkbook } from '../lib/student-account-credentials-workbook';
import { generateInitialPassword, hashPassword, verifyPassword } from '../lib/password';

const root = process.cwd();
const activationSource = fs.readFileSync(path.join(root, 'lib/student-account-activation.ts'), 'utf8');
const querySource = fs.readFileSync(path.join(root, 'lib/student-account-queries.ts'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'app/school-dashboard/students/accounts/activate/route.ts'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'components/school/StudentAccountsClient.tsx'), 'utf8');

const credential = {
  admissionNumber: 'ADM-001',
  studentName: 'Asha Rao',
  className: '3',
  sectionName: 'A',
  rollNumber: null,
  loginId: 'bg-abcd-efgh',
  initialPassword: 'A-secure-password-1',
};

test('credentials workbook has the exact student credential columns', async () => {
  const workbook = await buildStudentCredentialsWorkbook([credential]);
  assert.deepEqual(Array.from(workbook.getWorksheet('Student Credentials')?.getRow(1).values as unknown[]).slice(1), ['Admission Number', 'Student Name', 'Class', 'Section', 'Roll Number', 'Login ID', 'Initial Password']);
});

test('credentials workbook contains only the newly activated row', async () => {
  const workbook = await buildStudentCredentialsWorkbook([credential]);
  const row = workbook.getWorksheet('Student Credentials')?.getRow(2).values;
  assert.deepEqual(Array.from(row as unknown[]).slice(1), ['ADM-001', 'Asha Rao', '3', 'A', 'Not provided', 'bg-abcd-efgh', 'A-secure-password-1']);
});

test('credentials workbook includes secure handling instructions', async () => {
  const workbook = await buildStudentCredentialsWorkbook([credential]);
  const sheet = workbook.getWorksheet('Instructions');
  assert.ok(sheet);
  assert.match(String(sheet?.getCell('A1').value), /Credentials/);
  assert.match(String(sheet?.getCell('B2').value), /secure/i);
  assert.match(String(sheet?.getCell('B5').value), /not stored/i);
});

test('credentials workbook survives an XLSX round trip in memory', async () => {
  const workbook = await buildStudentCredentialsWorkbook([credential]);
  const bytes = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(bytes as any);
  assert.equal(loaded.worksheets.length, 2);
  assert.equal(loaded.getWorksheet('Student Credentials')?.getRow(2).getCell(6).value, 'bg-abcd-efgh');
});

test('credentials workbook has no internal ids or password hashes', async () => {
  const workbook = await buildStudentCredentialsWorkbook([credential]);
  const bytes = await workbook.xlsx.writeBuffer();
  const text = Buffer.from(bytes).toString('latin1');
  assert.doesNotMatch(text, /studentId|passwordHash|userId/);
});

test('initial passwords verify against their stored hash', async () => {
  const password = generateInitialPassword();
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword(password + 'x', hash), false);
});

test('activation uses the canonical student login generator', () => assert.match(activationSource, /generateUniqueStudentLoginId/));
test('activation uses a serializable transaction', () => assert.match(activationSource, /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/));
test('activation uses a per-student advisory lock', () => assert.match(activationSource, /pg_advisory_xact_lock/));
test('activation rechecks school ownership inside the transaction', () => assert.match(activationSource, /schoolId: input\.schoolId/));
test('activation rechecks publisher ownership and activity', () => assert.match(activationSource, /publisherId: input\.publisherId/));
test('activation requires a current active enrollment', () => assert.match(activationSource, /status: .*ACTIVE/));
test('activation creates STUDENT users', () => assert.match(activationSource, /role: UserRole\.STUDENT/));
test('school-managed accounts never receive a fake email', () => assert.match(activationSource, /email: null/));
test('activation links the student with a guarded updateMany', () => assert.match(activationSource, /tx\.student\.updateMany/));
test('activation does not mutate enrollment during account creation', () => assert.doesNotMatch(activationSource, /tx\.studentEnrollment\.(update|create|upsert)/));
test('activation does not create email challenges', () => assert.doesNotMatch(activationSource, /EmailVerificationChallenge/));
test('activation is bounded in batches of 25', () => assert.match(activationSource, /STUDENT_ACCOUNT_ACTIVATION_CONCURRENCY = 25/));
test('activation has a maximum selection bound', () => assert.match(activationSource, /STUDENT_ACCOUNT_ACTIVATION_MAX_SELECTION = 5000/));
test('activation verifies all selected ids before processing', () => assert.match(activationSource, /ownedStudents\.length !== studentIds\.length/));
test('already active accounts are reported without new credentials', () => assert.match(activationSource, /status: .*ALREADY_ACTIVE/));
test('audit summary records activation counts', () => assert.match(activationSource, /activatedCount/));
test('workspace reads all school students in one query', () => assert.match(querySource, /prisma\.student\.findMany/));
test('workspace resolves one current enrollment per student', () => assert.match(querySource, /take: 1/));
test('workspace computes unavailable rows without persisting status', () => assert.match(querySource, /INELIGIBLE/));
test('route never puts credentials in JSON', () => assert.doesNotMatch(routeSource, /JSON\.stringify\(result\.credentials/));
test('route disables caching for credentials', () => assert.match(routeSource, /Cache-Control.*private, no-store/));
test('route sets the required workbook filename', () => assert.match(routeSource, /Student Login Credentials\.xlsx/));
test('client uses a confirmation step', () => assert.match(clientSource, /window\.confirm/));
test('client downloads the workbook as a blob', () => assert.match(clientSource, /response\.blob/));
test('client does not persist credentials in browser storage', () => assert.doesNotMatch(clientSource, /localStorage|sessionStorage/));
test('client supports all, not activated, and active filters', () => assert.match(clientSource, /ALL/));
