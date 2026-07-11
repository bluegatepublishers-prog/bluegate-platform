import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getApiUser } from "@/lib/authz";
import { isUploadScope, isValidUploadPath, uploadRules } from "@/lib/storage/upload-policy";

type UploadPolicyErrorCode="UNAUTHORIZED"|"INVALID_PAYLOAD"|"INVALID_SCOPE"|"INVALID_PATHNAME"|"TOKEN_GENERATION_FAILED";
class UploadPolicyError extends Error{constructor(readonly code:UploadPolicyErrorCode){super(code);this.name="UploadPolicyError"}}

export async function POST(request:Request){
  try{
    const body=await request.json() as HandleUploadBody;
    const result=await handleUpload({request,body,onBeforeGenerateToken:async(pathname,clientPayload)=>{
      if(!(await getApiUser(["ADMIN"])))throw new UploadPolicyError("UNAUTHORIZED");
      const payload=parsePayload(clientPayload);if(!payload)throw new UploadPolicyError("INVALID_PAYLOAD");
      if(!isUploadScope(payload.scope))throw new UploadPolicyError("INVALID_SCOPE");
      if(!isValidUploadPath(payload.scope,payload.originalName,pathname))throw new UploadPolicyError("INVALID_PATHNAME");
      const rule=uploadRules[payload.scope];return{allowedContentTypes:rule.contentTypes,maximumSizeInBytes:rule.maxSize,addRandomSuffix:true,allowOverwrite:false,validUntil:Date.now()+5*60*1000,tokenPayload:JSON.stringify({scope:payload.scope})};
    },onUploadCompleted:async()=>{/* The existing create/update routes persist the returned permanent URL. */}});
    return NextResponse.json(result);
  }catch(error){const code=error instanceof UploadPolicyError?error.code:error instanceof Error?error.name:"TOKEN_GENERATION_FAILED";console.warn("Blob upload token exchange failed",{code});return NextResponse.json({ok:false,code:"UPLOAD_FAILED",message:"The file could not be uploaded. Please try again."},{status:400})}
}
function parsePayload(value:string|null):{scope:unknown;originalName:string}|null{if(!value)return null;try{const parsed:unknown=JSON.parse(value);if(typeof parsed!=="object"||parsed===null)return null;const record=parsed as Record<string,unknown>;return typeof record.originalName==="string"&&record.originalName.length<=255?{scope:record.scope,originalName:record.originalName}:null}catch{return null}}
