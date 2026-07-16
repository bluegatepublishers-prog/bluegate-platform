import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/authz";
import { requireSchoolResourceEntitlementAccess } from "@/lib/entitlements/resource";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) { const user=await getApiUser(["SCHOOL"]);if(!user)return NextResponse.json({message:"Unauthorized"},{status:401});const {id}=await params;const access=await requireSchoolResourceEntitlementAccess(user.id!,id);if(!access)return NextResponse.json({message:"Resource not found."},{status:404});return NextResponse.json({url:access.resource.fileUrl}); }
