"use server";

import { revalidatePath } from "next/cache";

import { updateMentorProfile } from "@/lib/mentor-dashboard";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveMentorProfileAction(formData: FormData) {
  await updateMentorProfile({
    name: value(formData, "name"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
  });

  revalidatePath("/mentor-dashboard/profile");
  revalidatePath("/mentor-dashboard");
}
