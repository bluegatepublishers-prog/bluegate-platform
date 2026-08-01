"use server";

import { SchoolAccessPlan, SchoolAccessStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createPublisherSchool,
  transitionPublisherSchool,
  updatePublisherSchoolProfile,
  type SchoolLifecycleAction,
} from "@/lib/school-lifecycle";
import { redirect } from "next/navigation";
import { updatePublisherSchoolAccess } from "@/lib/school-access";

function value(form: FormData, key: string) {
  return form.get(key);
}

export async function changeSchoolLifecycleAction(schoolId: string, form: FormData) {
  await transitionPublisherSchool(
    schoolId,
    String(value(form, "lifecycleAction") ?? "") as SchoolLifecycleAction,
    value(form, "reason"),
  );
  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath("/admin/school-requests");
  revalidatePath("/admin");
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(`${text}T00:00:00.000Z`) : null;
}

export async function updateSchoolAccessAction(schoolId: string, form: FormData) {
  await updatePublisherSchoolAccess(schoolId, {
    plan: String(value(form, "plan")) as SchoolAccessPlan,
    status: String(value(form, "accessStatus")) as SchoolAccessStatus,
    startsAt: optionalDate(value(form, "startsAt")),
    expiresAt: optionalDate(value(form, "expiresAt")),
    notes: String(value(form, "notes") ?? ""),
  });
  revalidatePath("/admin");
  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${schoolId}`);
}

export async function updateSchoolProfileAction(schoolId: string, form: FormData) {
  await updatePublisherSchoolProfile(schoolId, {
    schoolName: value(form, "schoolName"),
    city: value(form, "city"),
    state: value(form, "state"),
    principalName: value(form, "principalName"),
    address: value(form, "address"),
    pincode: value(form, "pincode"),
  });
  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${schoolId}`);
}

export async function createSchoolAction(form: FormData) {
  const school = await createPublisherSchool({
    schoolName: value(form, "schoolName"),
    city: value(form, "city"),
    state: value(form, "state"),
    principalName: value(form, "principalName"),
    email: value(form, "email"),
    phone: value(form, "phone"),
  });
  revalidatePath("/admin/schools");
  redirect(`/admin/schools/${school.id}`);
}
