import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { EmailVerificationPurpose, Prisma, SchoolOnboardingStatus, TeacherOnboardingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { BLUEGATE_PUBLISHER_ID } from "@/lib/publisher-context";
import { createEmailVerificationChallenge, deliverEmailVerificationChallenge } from "@/lib/account-security";
import { maskEmail } from "@/lib/account-security-policy";
import { cleanText, normalizeAccountEmail, normalizeActivationCode, normalizeAdmissionNumber, normalizeEmail, sameCalendarDate, validEmail, validatePassword } from "./onboarding-policy";

export class OnboardingError extends Error {}
const unavailable = "We could not create or activate this account with the details provided.";

export function activationCodeHash(code: string) {
  const pepper = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!pepper) throw new OnboardingError("Account activation is temporarily unavailable.");
  return createHash("sha256").update(`${pepper}:${normalizeActivationCode(code)}`).digest("hex");
}

export function generateActivationCode() {
  return randomBytes(6).toString("hex").toUpperCase().replace(/(.{4})(?=.)/g, "$1-");
}

export async function createPendingSchool(input: Record<string, unknown>) {
  const schoolName = cleanText(input.schoolName, 160), principalName = cleanText(input.principalName, 120), email = normalizeEmail(input.email), phone = cleanText(input.phone, 30), address = cleanText(input.address, 300), city = cleanText(input.city, 80), state = cleanText(input.state, 80), pincode = cleanText(input.pincode, 12);
  const passwordError = validatePassword(input.password, input.confirmPassword);
  if (!schoolName || !principalName || !normalizeAccountEmail(email, "SCHOOL").ok || !validEmail(email) || !phone || !address || !city || !state || !/^\d{6}$/.test(pincode) || passwordError) throw new OnboardingError(passwordError ?? "Complete every required field with valid details.");
  const publisher = await prisma.publisher.findFirst({ where: { id: BLUEGATE_PUBLISHER_ID, active: true }, select: { id: true, name: true } });
  if (!publisher || await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new OnboardingError(unavailable);
  const password = await hashPassword(String(input.password));
  try {
    const challenge = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name: principalName, email, phone, password, role: "SCHOOL", publisherId: publisher.id } });
      await tx.school.create({ data: { userId: user.id, publisherId: publisher.id, schoolName, principalName, address, city, state, pincode, status: SchoolOnboardingStatus.PENDING }, select: { id: true } });
      return createEmailVerificationChallenge(tx, { userId: user.id, email, purpose: EmailVerificationPurpose.SCHOOL_SIGNUP, brandName: publisher.name });
    });
    const delivery = await deliverEmailVerificationChallenge(challenge);
    return { challengeReference: challenge.reference, maskedEmail: maskEmail(email), deliveryState: delivery.state };
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OnboardingError(unavailable); throw error; }
}

export async function listApprovedSchools(query = "") {
  return prisma.school.findMany({ where: { status: SchoolOnboardingStatus.APPROVED, publisher: { active: true }, OR: query ? [{ schoolName: { contains: query, mode: "insensitive" } }, { city: { contains: query, mode: "insensitive" } }, { state: { contains: query, mode: "insensitive" } }] : undefined }, select: { id: true, schoolName: true, city: true, state: true }, orderBy: [{ schoolName: "asc" }, { id: "asc" }], take: 50 });
}

export async function createPendingTeacher(input: Record<string, unknown>) {
  const name = cleanText(input.name, 120), email = normalizeEmail(input.email), phone = cleanText(input.phone, 30), schoolId = cleanText(input.schoolId, 64), designation = cleanText(input.designation, 80), subject = cleanText(input.subject, 100), classes = cleanText(input.classes, 100);
  const passwordError = validatePassword(input.password, input.confirmPassword);
  if (!name || !normalizeAccountEmail(email, "TEACHER").ok || !validEmail(email) || !phone || !schoolId || !designation || !subject || !classes || passwordError) throw new OnboardingError(passwordError ?? "Complete every required field with valid details.");
  const school = await prisma.school.findFirst({ where: { id: schoolId, status: SchoolOnboardingStatus.APPROVED, publisher: { active: true } }, select: { id: true, schoolName: true, publisherId: true, publisher: { select: { name: true } } } });
  if (!school?.publisherId || !school.publisher || await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new OnboardingError(unavailable);
  const publisherName = school.publisher.name;
  const password = await hashPassword(String(input.password));
  try {
    const challenge = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, phone, password, passwordChangedAt: new Date(), role: "TEACHER", publisherId: school.publisherId } });
      const teacher = await tx.teacher.create({ data: { userId: user.id, schoolName: school.schoolName, designation, subject, classes, verified: false, active: false, status: TeacherOnboardingStatus.PENDING } });
      await tx.teacherSchoolRequest.create({ data: { teacherId: teacher.id, schoolId: school.id, publisherId: school.publisherId!, activeKey: `${teacher.id}:${school.id}` }, select: { id: true } });
      return createEmailVerificationChallenge(tx, { userId: user.id, email, purpose: EmailVerificationPurpose.TEACHER_SIGNUP, brandName: publisherName });
    });
    const delivery = await deliverEmailVerificationChallenge(challenge);
    return { challengeReference: challenge.reference, maskedEmail: maskEmail(email), deliveryState: delivery.state };
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OnboardingError(unavailable); throw error; }
}

export async function activateStudentAccount(input: Record<string, unknown>) {
  const code = normalizeActivationCode(input.activationCode), admissionNumber = normalizeAdmissionNumber(input.admissionNumber), dateOfBirth = cleanText(input.dateOfBirth, 10), suppliedEmail = normalizeEmail(input.email);
  const passwordError = validatePassword(input.password, input.confirmPassword);
  if (code.length !== 12 || !admissionNumber || !normalizeAccountEmail(suppliedEmail, "EMAIL_ACTIVATED_STUDENT").ok || !validEmail(suppliedEmail) || passwordError) throw new OnboardingError(passwordError ?? unavailable);
  const codeHash = activationCodeHash(code), now = new Date();
  const password = await hashPassword(String(input.password));
  const challenge = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`activation:${codeHash}`}))`;
    const activation = await tx.studentActivationCode.findUnique({ where: { codeHash }, include: { student: true, school: { include: { publisher: { select: { active: true } } } } } });
    if (!activation || activation.usedAt || activation.revokedAt || activation.expiresAt <= now || activation.student.schoolId !== activation.schoolId || activation.school.status !== SchoolOnboardingStatus.APPROVED || !activation.school.publisherId || !activation.school.publisher?.active || activation.student.userId || !activation.student.active || normalizeAdmissionNumber(activation.student.admissionNumber) !== admissionNumber || (activation.student.dateOfBirth && !sameCalendarDate(activation.student.dateOfBirth, dateOfBirth)) || !activation.student.email || !validEmail(activation.student.email)) throw new OnboardingError(unavailable);
    const email = normalizeEmail(activation.student.email);
    if (email !== suppliedEmail) throw new OnboardingError(unavailable);
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new OnboardingError(unavailable);
    const user = await tx.user.create({ data: { name: activation.student.name, email, password, passwordChangedAt: now, role: "STUDENT", publisherId: activation.school.publisherId } });
    const linked = await tx.student.updateMany({ where: { id: activation.studentId, userId: null, schoolId: activation.schoolId }, data: { userId: user.id } });
    if (linked.count !== 1) throw new OnboardingError(unavailable);
    return createEmailVerificationChallenge(tx, { userId: user.id, email, purpose: EmailVerificationPurpose.STUDENT_ACTIVATION, brandName: "Bluegate", studentActivationCodeId: activation.id });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const delivery = await deliverEmailVerificationChallenge(challenge);
  return { challengeReference: challenge.reference, maskedEmail: maskEmail(suppliedEmail), deliveryState: delivery.state };
}
