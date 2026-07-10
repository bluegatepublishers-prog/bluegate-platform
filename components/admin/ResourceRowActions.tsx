"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export default function ResourceRowActions({id}:{id:string}) { const router=useRouter(); const [pending,startTransition]=useTransition(); function remove(){if(!confirm("Delete this resource and its managed files?"))return; startTransition(async()=>{const response=await fetch(`/api/admin/resources/${id}`,{method:"DELETE"}); if(response.ok)router.refresh();});} return <div className="flex gap-3"><Link href={`/admin/resources/${id}/edit`} className="font-semibold text-blue-700">Edit</Link><button disabled={pending} onClick={remove} className="font-semibold text-red-600">{pending?"Deleting...":"Delete"}</button></div>; }
