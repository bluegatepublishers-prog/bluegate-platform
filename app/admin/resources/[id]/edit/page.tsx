import { notFound } from "next/navigation";
import ResourceForm from "@/components/admin/ResourceForm";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function EditResourcePage({params}:{params:Promise<{id:string}>}) { await requireUser(["ADMIN"]); const {id}=await params; const resource=await prisma.resource.findUnique({where:{id}}); if(!resource)notFound(); return <div className="mx-auto max-w-4xl space-y-7"><div><h1 className="text-3xl font-bold">Edit Resource</h1><p className="mt-2 text-slate-600">Replace files or update publishing metadata.</p></div><ResourceForm resource={resource}/></div>; }
