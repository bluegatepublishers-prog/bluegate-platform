import { NextResponse } from 'next/server';
import { requireSchool } from '@/lib/school-dashboard';
import { activateStudentAccounts, StudentAccountActivationAuthorizationError } from '@/lib/student-account-activation';
import { buildStudentCredentialsWorkbook } from '@/lib/student-account-credentials-workbook';

const CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function POST(request: Request) {
  try {
    const school = await requireSchool();
    if (!school.publisherId) return NextResponse.json({ ok: false }, { status: 403 });
    const body = await request.json().catch(() => null) as { studentIds?: unknown } | null;
    if (!body || !Array.isArray(body.studentIds) || body.studentIds.some((id) => typeof id !== 'string')) return NextResponse.json({ ok: false }, { status: 400 });
    const result = await activateStudentAccounts({ schoolId: school.id, publisherId: school.publisherId, actorUserId: school.userId, studentIds: body.studentIds });
    const workbook = await buildStudentCredentialsWorkbook(result.credentials);
    const buffer = await workbook.xlsx.writeBuffer();
    const failures = result.failures.map(({ admissionNumber, studentName, message }) => ({ admissionNumber, studentName, message })).slice(0, 50);
    const summary = Buffer.from(JSON.stringify({ requested: result.requested, activated: result.activated, alreadyActive: result.alreadyActive, failed: result.failed, failures })).toString('base64url');
    const response = new NextResponse(buffer, { headers: { 'Content-Type': CONTENT_TYPE, 'Cache-Control': 'private, no-store', 'Content-Disposition': 'attachment; filename=Student Login Credentials.xlsx', 'X-Bluegate-Activation-Result': summary } });
    return response;
  } catch (error) {
    if (error instanceof StudentAccountActivationAuthorizationError) return NextResponse.json({ ok: false }, { status: 400 });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
