"use server";

import { revalidatePath } from "next/cache";

import {
  createPublisherSchool,
  transitionPublisherSchool,
  updatePublisherSchoolProfile,
  type SchoolLifecycleAction,
} from "@/lib/school-lifecycle";
import { redirect } from "next/navigation";

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
