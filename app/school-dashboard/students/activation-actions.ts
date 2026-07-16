"use server";
import { issueStudentActivationCode } from "@/lib/onboarding-approvals";
export type ActivationState={ok:boolean;message:string;code?:string;expiresAt?:string};
export async function issueActivationCodeAction(_:ActivationState,form:FormData):Promise<ActivationState>{try{const result=await issueStudentActivationCode(String(form.get("studentId")??""));return{ok:true,message:"A new single-use code was created. Copy it now; only its secure hash is stored.",code:result.code,expiresAt:result.expiresAt.toISOString()}}catch{return{ok:false,message:"An activation code could not be created for this student."}}}
