"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "@/lib/parent-dashboard";
import { prisma } from "@/lib/prisma";

export type ParentActionState = { ok: boolean; message: string };

const asText = (form: FormData, key: string, maxLength = 120) => String(form.get(key) ?? "").trim().slice(0, maxLength);

export async function saveParentProfile(_: ParentActionState, form: FormData): Promise<ParentActionState> {
  const parent = await requireParent();
  const name = asText(form, "name", 120);
  const email = asText(form, "email", 254).toLowerCase();
  const phone = asText(form, "phone", 30);

  if (!name || !email.includes("@")) {
    return { ok: false, message: "Enter a valid name and email address." };
  }

  const duplicate = await prisma.user.findFirst({
    where: {
      id: { not: parent.userId },
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (duplicate) {
    return { ok: false, message: "That email address is already in use." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: parent.userId }, data: { name, email, phone: phone || null } }),
    prisma.parent.update({ where: { id: parent.id }, data: { phone: phone || null } }),
  ]);

  revalidatePath("/parent-dashboard");
  revalidatePath("/parent-dashboard/profile");
  revalidatePath("/parent-dashboard/settings");

  return { ok: true, message: "Profile updated successfully." };
}