"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { SchoolStaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireSchool } from "@/lib/school-dashboard";
import { deleteFile, isManagedFileUrl } from "@/lib/storage";

const value = (form: FormData, key: string, max = 160) => String(form.get(key) ?? "").trim().slice(0, max);
const email = (form: FormData) => value(form, "email", 254).toLowerCase();

export async function saveSchoolProfile(form: FormData) {
  const school = await requireSchool();
  const schoolName = value(form, "schoolName", 160);
  const nextEmail = email(form);
  if (!schoolName || !nextEmail || !nextEmail.includes("@")) return;
  const submittedLogo = value(form, "logoUrl", 1000);
  if (submittedLogo && !isSchoolLogoUrl(submittedLogo, school.id)) return;
  const logoUrl = submittedLogo || null;
  const previousLogo = school.logoUrl;
  await prisma.$transaction([
    prisma.school.update({ where: { id: school.id }, data: { schoolName, principalName: value(form, "principalName") || null, address: value(form, "address", 300) || null, city: value(form, "city", 80), state: value(form, "state", 80), pincode: value(form, "pincode", 12) || null, logoUrl } }),
    prisma.user.update({ where: { id: school.userId }, data: { email: nextEmail, phone: value(form, "phone", 30) || null } }),
  ]);
  if (previousLogo && previousLogo !== logoUrl) await deleteFile(previousLogo);
  revalidatePath("/school-dashboard", "layout");
}

function isSchoolLogoUrl(url: string, schoolId: string) {
  if (!isManagedFileUrl(url)) return false;
  try { return new URL(url).pathname.slice(1).startsWith(`schools/${schoolId}/logo/`); }
  catch { return false; }
}

export async function createSchoolTeacher(form: FormData) {
  const school = await requireSchool();
  const name = value(form, "name", 120);
  const teacherEmail = email(form);
  if (!name || !teacherEmail || !teacherEmail.includes("@")) return;
  const password = await hashPassword(randomBytes(32).toString("base64url"));
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email: teacherEmail, password, role: "TEACHER", phone: value(form, "phone", 30) || null } });
    await tx.teacher.create({ data: { userId: user.id, schoolId: school.id, schoolName: school.schoolName, designation: value(form, "designation", 80) || "Teacher", subject: value(form, "subject", 100) || "Not assigned", classes: value(form, "classes", 100) || "Not assigned", verified: true, active: true } });
    await tx.schoolStaffMembership.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      update: { role: SchoolStaffRole.TEACHER, active: true },
      create: { schoolId: school.id, userId: user.id, role: SchoolStaffRole.TEACHER, active: true, joinedAt: new Date() },
    });
  });
  revalidatePath("/school-dashboard/teachers");
  revalidatePath("/school-dashboard/staff");
  revalidatePath("/school-dashboard");
}

export async function updateSchoolTeacher(teacherId: string, form: FormData) {
  const school = await requireSchool();
  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId: school.id }, select: { id: true, userId: true } });
  const name = value(form, "name", 120), teacherEmail = email(form);
  if (!teacher || !name || !teacherEmail || !teacherEmail.includes("@")) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: teacher.userId }, data: { name, email: teacherEmail, phone: value(form, "phone", 30) || null } }),
    prisma.teacher.update({ where: { id: teacher.id }, data: { designation: value(form, "designation", 80) || "Teacher", subject: value(form, "subject", 100) || "Not assigned", classes: value(form, "classes", 100) || "Not assigned" } }),
  ]);
  revalidatePath("/school-dashboard/teachers");
  revalidatePath("/school-dashboard/teacher-assignments");
}

export async function setSchoolTeacherActive(form: FormData) {
  const school = await requireSchool();
  const teacherId = value(form, "teacherId");
  const active = value(form, "active") === "true";
  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId: school.id }, select: { id: true, userId: true } });
  if (!teacher) return;
  await prisma.$transaction(async (tx) => {
    await tx.teacher.update({ where: { id: teacher.id }, data: { active, verified: active, status: active ? "APPROVED" : "SUSPENDED" } });
    await tx.schoolStaffMembership.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: teacher.userId } },
      update: { role: SchoolStaffRole.TEACHER, active },
      create: { schoolId: school.id, userId: teacher.userId, role: SchoolStaffRole.TEACHER, active, joinedAt: new Date() },
    });
    if (!active) await tx.teacherAssignment.updateMany({ where: { teacherId: teacher.id, schoolId: school.id, active: true }, data: { active: false } });
  });
  revalidatePath("/school-dashboard/teachers");
  revalidatePath("/school-dashboard/staff");
  revalidatePath("/school-dashboard/teacher-assignments");
  revalidatePath("/school-dashboard");
}

export async function addSchoolStaffMembership(form: FormData) {
  const school = await requireSchool();
  const identifier = value(form, "identifier", 254).toLowerCase();
  const roleInput = value(form, "role", 32);
  if (!identifier || !Object.values(SchoolStaffRole).includes(roleInput as SchoolStaffRole)) return;
  const role = roleInput as SchoolStaffRole;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { id: identifier }],
    },
    select: {
      id: true,
      role: true,
      teacher: { select: { id: true, schoolId: true } },
    },
  });
  if (!user) return;
  if (role === SchoolStaffRole.TEACHER && user.teacher?.schoolId !== school.id) return;
  await prisma.schoolStaffMembership.create({
    data: {
      schoolId: school.id,
      userId: user.id,
      role,
      active: true,
      joinedAt: new Date(),
    },
  }).catch(() => null);
  revalidatePath("/school-dashboard/staff");
}

export async function updateSchoolStaffMembership(form: FormData) {
  const school = await requireSchool();
  const membershipId = value(form, "membershipId", 64);
  const roleInput = value(form, "role", 32);
  const active = value(form, "active") === "true";
  if (!membershipId || !Object.values(SchoolStaffRole).includes(roleInput as SchoolStaffRole)) return;
  const membership = await prisma.schoolStaffMembership.findFirst({
    where: { id: membershipId, schoolId: school.id },
    select: { id: true },
  });
  if (!membership) return;
  await prisma.schoolStaffMembership.update({
    where: { id: membership.id },
    data: { role: roleInput as SchoolStaffRole, active },
  });
  revalidatePath("/school-dashboard/staff");
}
