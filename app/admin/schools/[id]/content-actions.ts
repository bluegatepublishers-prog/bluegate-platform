"use server";

import { revalidatePath } from "next/cache";

import {
  assignSchoolBooks,
  assignSchoolResources,
  transitionSchoolBookEntitlement,
  transitionSchoolResourceEntitlement,
  type EntitlementLifecycleAction,
} from "@/lib/school-content-entitlements";

function selected(formData: FormData, key: string) {
  return formData.getAll(key).map(String);
}

function lifecycleAction(formData: FormData): EntitlementLifecycleAction {
  const value = String(formData.get("action") ?? "");
  if (["pause", "resume", "revoke", "restore", "archive"].includes(value)) {
    return value as EntitlementLifecycleAction;
  }
  throw new Error("Unsupported entitlement action.");
}

export async function assignSchoolBooksAction(schoolId: string, formData: FormData) {
  await assignSchoolBooks(schoolId, selected(formData, "bookId"));
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath(`/admin/schools/${schoolId}/books`);
}

export async function changeSchoolBookEntitlementAction(
  schoolId: string,
  entitlementId: string,
  formData: FormData,
) {
  await transitionSchoolBookEntitlement(
    schoolId,
    entitlementId,
    lifecycleAction(formData),
    formData.get("reason"),
  );
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath(`/admin/schools/${schoolId}/books`);
}

export async function assignSchoolResourcesAction(schoolId: string, formData: FormData) {
  await assignSchoolResources(schoolId, selected(formData, "resourceId"));
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath(`/admin/schools/${schoolId}/resources`);
}

export async function changeSchoolResourceEntitlementAction(
  schoolId: string,
  entitlementId: string,
  formData: FormData,
) {
  await transitionSchoolResourceEntitlement(
    schoolId,
    entitlementId,
    lifecycleAction(formData),
    formData.get("reason"),
  );
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath(`/admin/schools/${schoolId}/resources`);
}
