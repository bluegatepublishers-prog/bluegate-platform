import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) { if(!(await getApiUser(["SCHOOL"])))return NextResponse.json({message:"Unauthorized"},{status:401});const {id}=await params;const resource=await prisma.resource.findFirst({where:{id,published:true},select:{fileUrl:true}});if(!resource)return NextResponse.json({message:"Resource not found."},{status:404});return NextResponse.json({url:resource.fileUrl}); }
