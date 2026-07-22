"use server";
import { revalidatePath } from "next/cache";import { reviewTeacherRequest } from "@/lib/onboarding-approvals";
export async function reviewTeacherAction(form:FormData){await reviewTeacherRequest({requestId:String(form.get("requestId")??""),status:String(form.get("status")??""),reason:form.get("reason")});revalidatePath("/school-dashboard/teacher-requests");revalidatePath("/school-dashboard/teachers");revalidatePath("/school-dashboard/teacher-assignments");revalidatePath("/school-dashboard/staff");revalidatePath("/school-dashboard");}
