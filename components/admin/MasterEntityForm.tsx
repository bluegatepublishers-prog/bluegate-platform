"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

type Mode="create"|"edit";
type Entity={id:string;name:string;code:string;sortOrder:number;active:boolean;description?:string|null};

export default function MasterEntityForm({apiBase,title,mode,id,includeDescription=false}:{apiBase:string;title:string;mode:Mode;id?:string;includeDescription?:boolean}) {
  const router=useRouter();
  const [loading,setLoading]=useState(false);
  const [loadingRecord,setLoadingRecord]=useState(mode==="edit");
  const [error,setError]=useState("");
  const [form,setForm]=useState({name:"",code:"",sortOrder:0,active:true,description:""});
  const backHref=apiBase.replace("/api/admin","/admin");

  useEffect(()=>{if(mode!=="edit"||!id){setLoadingRecord(false);return;}let ignore=false;(async()=>{setLoadingRecord(true);try{const response=await fetch(`${apiBase}/${id}`);if(!response.ok)throw new Error("Unable to load record.");const data:Entity=await response.json();if(ignore)return;setForm({name:data.name??"",code:data.code??"",sortOrder:data.sortOrder??0,active:data.active??true,description:data.description??""});}catch(err){if(!ignore)setError(err instanceof Error?err.message:"Unable to load record.");}finally{if(!ignore)setLoadingRecord(false);}})();return()=>{ignore=true};},[apiBase,id,mode]);

  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);setError("");try{const response=await fetch(mode==="create"?apiBase:`${apiBase}/${id}`,{method:mode==="create"?"POST":"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||"Unable to save record.");router.push(backHref);router.refresh();}catch(err){setError(err instanceof Error?err.message:"Unable to save record.");}finally{setLoading(false)}}

  return <main className="mx-auto w-full max-w-4xl space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><button type="button" onClick={()=>router.push(backHref)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700"><ArrowLeft className="h-3.5 w-3.5"/>Back</button><h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950">{mode==="create"?"Add":"Edit"} {title}</h1><p className="mt-0.5 text-xs text-slate-500">Configure this master-data record.</p></div>
      <button type="submit" form="master-entity-form" disabled={loading||loadingRecord} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5"/>{loading?"Saving...":"Save"}</button>
    </header>
    {error?<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">{error}</div>:null}
    <form id="master-entity-form" onSubmit={submit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <section className="border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-bold text-slate-900">Information</h2><p className="mt-0.5 text-[10px] text-slate-500">Name, code, order and status.</p></section>
      <section className="grid gap-3 p-4 md:grid-cols-2">
        <Field label="Name"><input required disabled={loadingRecord} value={form.name} onChange={e=>setForm(c=>({...c,name:e.target.value}))} className={inputClass}/></Field>
        <Field label="Code"><input required disabled={loadingRecord} value={form.code} onChange={e=>setForm(c=>({...c,code:e.target.value.toUpperCase()}))} className={inputClass}/></Field>
        <Field label="Sort Order"><input type="number" disabled={loadingRecord} value={form.sortOrder} onChange={e=>setForm(c=>({...c,sortOrder:Number(e.target.value)}))} className={inputClass}/></Field>
        <label className="block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Status</span><button type="button" disabled={loadingRecord} onClick={()=>setForm(c=>({...c,active:!c.active}))} className="flex h-8 w-full items-center justify-between rounded-lg border border-slate-200 px-3"><span className="text-[11px] font-semibold text-slate-700">{form.active?"Active":"Inactive"}</span><span className={`relative inline-flex h-5 w-9 items-center rounded-full ${form.active?"bg-blue-600":"bg-slate-300"}`}><span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${form.active?"translate-x-4":"translate-x-0.5"}`}/></span></button></label>
        {includeDescription?<div className="md:col-span-2"><Field label="Description"><textarea rows={4} disabled={loadingRecord} value={form.description} onChange={e=>setForm(c=>({...c,description:e.target.value}))} className={`${inputClass} min-h-24 resize-y py-2`}/></Field></div>:null}
      </section>
      <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"><button type="button" onClick={()=>router.push(backHref)} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600">Cancel</button><button type="submit" disabled={loading||loadingRecord} className="h-8 rounded-lg bg-blue-600 px-4 text-[10px] font-bold text-white disabled:opacity-50">{loading?"Saving...":`${mode==="create"?"Create":"Update"} ${title}`}</button></footer>
    </form>
  </main>;
}
const inputClass="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-800 outline-none focus:border-blue-400 disabled:bg-slate-50";
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>{children}</label>}
