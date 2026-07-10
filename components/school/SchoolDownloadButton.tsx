"use client";
import { useTransition } from "react";
import { Download } from "lucide-react";
export default function SchoolDownloadButton({resourceId}:{resourceId:string}) { const [pending,startTransition]=useTransition(); return <button disabled={pending} onClick={()=>startTransition(async()=>{const response=await fetch(`/api/school/resources/${resourceId}/download`,{method:"POST"});if(!response.ok)return;const data=await response.json() as {url:string};window.open(data.url,"_blank","noopener,noreferrer");})} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"><Download className="mr-2 h-4 w-4"/>{pending?"Opening...":"Download"}</button>; }
