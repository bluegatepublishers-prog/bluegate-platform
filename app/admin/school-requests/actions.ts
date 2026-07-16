"use server";
import { revalidatePath } from "next/cache";
import { reviewSchoolRequest } from "@/lib/onboarding-approvals";
export async function reviewSchoolAction(form: FormData){await reviewSchoolRequest({schoolId:String(form.get("schoolId")??""),status:String(form.get("status")??""),reason:form.get("reason")});revalidatePath("/admin/school-requests");}
