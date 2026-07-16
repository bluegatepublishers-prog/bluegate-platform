"use server";
import { revalidatePath } from "next/cache";
import { issueParentInvitation, reviewParentRelationship, setPrimaryParentRelationship } from "@/lib/parent-onboarding";
export type GuardianActionState={ok:boolean;message:string;code?:string};
export async function inviteGuardianAction(studentId:string,_:GuardianActionState,form:FormData):Promise<GuardianActionState>{try{const result=await issueParentInvitation({...Object.fromEntries(form.entries()),studentId});revalidatePath(`/school-dashboard/students/${studentId}/guardians`);return{ok:true,message:`Invitation created. It expires ${result.expiresAt.toLocaleDateString()}. Share this code securely; it is shown only now.`,code:result.code}}catch(error){return{ok:false,message:error instanceof Error?error.message:"Invitation could not be created."}}}
export async function relationshipAction(studentId:string,relationshipId:string,decision:"APPROVE"|"REJECT"|"REVOKE",form:FormData){await reviewParentRelationship({relationshipId,decision,reason:String(form.get("reason")??"")});revalidatePath(`/school-dashboard/students/${studentId}/guardians`)}
export async function primaryRelationshipAction(studentId:string,relationshipId:string){await setPrimaryParentRelationship(relationshipId);revalidatePath(`/school-dashboard/students/${studentId}/guardians`)}
