import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/authz";
import { StorageValidationError, uploadFile, validateUpload, type UploadScope } from "@/lib/storage";

export const runtime="nodejs";
export async function POST(request:NextRequest){const user=await getApiUser(["ADMIN"]);if(!user)return failure("FORBIDDEN","You are not allowed to upload files.",403);try{const formData=await request.formData(),value=formData.get("file"),scope=formData.get("scope");if(!(value instanceof File))return failure("FILE_REQUIRED","Choose a file to upload.",400);const validation=validateUpload(value,scope);if(!validation.ok)return failure(validation.code,validation.message,400);const stored=await uploadFile(value,scope as UploadScope);return NextResponse.json({ok:true,url:stored.url,pathname:stored.pathname,message:"Upload complete."})}catch(error){if(error instanceof StorageValidationError)return failure(error.code,error.message,400);console.error("Upload failed",{stage:"storage",userId:user.id,code:"UPLOAD_FAILED"});return failure("UPLOAD_FAILED","The file could not be uploaded. Please try again.",500)}}
function failure(code:string,message:string,status:number){return NextResponse.json({ok:false,code,message},{status})}
