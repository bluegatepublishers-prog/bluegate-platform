import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { getApiUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isUploadScope, isValidUploadPath, publisherUploadPath, schoolLogoUploadPath, uploadRules } from "@/lib/storage/upload-policy";
import{resolvePublisherForUser}from"@/lib/publisher-context";

type UploadPolicyErrorCode="UNAUTHORIZED"|"INVALID_PAYLOAD"|"INVALID_SCOPE"|"INVALID_PATHNAME"|"TOKEN_GENERATION_FAILED";
class UploadPolicyError extends Error{constructor(readonly code:UploadPolicyErrorCode){super(code);this.name="UploadPolicyError"}}

export async function POST(request:Request){
  try{
    const body=await request.json() as HandleUploadPresignedBody;
    const result=await handleUploadPresigned({request,body,getSignedToken:async(pathname,clientPayload)=>{
      const payload=parsePayload(clientPayload);if(!payload)throw new UploadPolicyError("INVALID_PAYLOAD");
      if(!isUploadScope(payload.scope))throw new UploadPolicyError("INVALID_SCOPE");
      const user=await getApiUser(payload.scope==="school-logo"?["SCHOOL"]:["ADMIN"]);if(!user)throw new UploadPolicyError("UNAUTHORIZED");
      if(payload.scope==="school-logo"){
        const school=await prisma.school.findUnique({where:{userId:user.id},select:{id:true}});
        if(!school||pathname!==schoolLogoUploadPath(school.id,payload.originalName))throw new UploadPolicyError("INVALID_PATHNAME");
      }else if(payload.scope==="publisher-logo"||payload.scope==="publisher-favicon"){const publisher=await resolvePublisherForUser(user.id!);if(!publisher||pathname!==publisherUploadPath(publisher.id,payload.scope,payload.originalName))throw new UploadPolicyError("INVALID_PATHNAME");}else if(!isValidUploadPath(payload.scope,payload.originalName,pathname))throw new UploadPolicyError("INVALID_PATHNAME");
      const rule=uploadRules[payload.scope],validUntil=Date.now()+5*60*1000;
      const token=await issueSignedToken({pathname,operations:["put"],allowedContentTypes:rule.contentTypes,maximumSizeInBytes:rule.maxSize,validUntil});
      return{token,urlOptions:{allowedContentTypes:rule.contentTypes,maximumSizeInBytes:rule.maxSize,addRandomSuffix:true,allowOverwrite:false,validUntil}};
    }});
    return NextResponse.json(result);
  }catch(error){const code=error instanceof UploadPolicyError?error.code:error instanceof Error?error.name:"TOKEN_GENERATION_FAILED";console.warn("Blob upload token exchange failed",{code});return NextResponse.json({ok:false,code:"UPLOAD_FAILED",message:"The file could not be uploaded. Please try again."},{status:400})}
}
function parsePayload(value:string|null):{scope:unknown;originalName:string}|null{if(!value)return null;try{const parsed:unknown=JSON.parse(value);if(typeof parsed!=="object"||parsed===null)return null;const record=parsed as Record<string,unknown>;return typeof record.originalName==="string"&&record.originalName.length<=255?{scope:record.scope,originalName:record.originalName}:null}catch{return null}}
