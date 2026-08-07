"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";

type Row = { id:string; name:string; code:string; sortOrder:number; active:boolean; description?:string|null; dependencyCount?:number };
const PAGE_SIZE = 5;

export default function MasterEntityList({title,apiBase,createHref,rows,includeDescription=false}:{title:string;apiBase:string;createHref:string;rows:Row[];includeDescription?:boolean}) {
  const router=useRouter();
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("all");
  const [page,setPage]=useState(1);
  const filtered=useMemo(()=>rows.filter(row=>{
    const term=query.trim().toLowerCase();
    const q=!term||`${row.name} ${row.code} ${row.description??""}`.toLowerCase().includes(term);
    const s=status==="all"||(status==="active")===row.active;
    return q&&s;
  }),[query,rows,status]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const safePage=Math.min(page,totalPages);
  const visible=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
  const start=filtered.length===0?0:(safePage-1)*PAGE_SIZE+1;
  const end=Math.min(safePage*PAGE_SIZE,filtered.length);

  async function remove(row:Row){
    if(!window.confirm(`Delete ${row.name}?`)) return;
    const response=await fetch(`${apiBase}/${row.id}`,{method:"DELETE"});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){window.alert(body.message||`Unable to delete ${title.toLowerCase()}.`);return;}
    router.refresh();
  }

  const singular=title==="Classes"?"Class":title.endsWith("ies")?`${title.slice(0,-3)}y`:title.endsWith("s")?title.slice(0,-1):title;

  return <main className="min-w-0 space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Master Data</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-0.5 text-xs text-slate-500">Manage {title.toLowerCase()} used across the platform.</p>
      </div>
      <Link href={createHref} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white hover:bg-blue-700"><Plus className="h-3.5 w-3.5"/>Add {singular}</Link>
    </header>

    <section className="rounded-2xl border border-slate-200 bg-white p-2.5">
      <div className="grid gap-2 md:grid-cols-[1fr_180px]">
        <label className="relative"><span className="sr-only">Search</span><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder={`Search ${title.toLowerCase()}`} className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] outline-none focus:border-blue-400"/></label>
        <select aria-label="Status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>
    </section>

    <div className="flex items-center justify-between px-1 text-[10px] text-slate-500"><span>Showing {start}–{end} of {filtered.length}</span><span>{rows.length} total</span></div>

    {!visible.length ? <section className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-xs font-semibold text-slate-700">No {title.toLowerCase()} match these filters.</section> :
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className={`hidden items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.11em] text-slate-500 md:grid ${includeDescription?"grid-cols-[1.3fr_0.85fr_1.6fr_0.5fr_0.7fr_5.5rem]":"grid-cols-[1.5fr_1fr_0.6fr_0.8fr_5.5rem]"}`}>
        <span>Name</span><span>Code</span>{includeDescription?<span>Description</span>:null}<span>Order</span><span>Status</span><span className="text-right">Actions</span>
      </div>
      <div className="divide-y divide-slate-100">
        {visible.map(row=><div key={row.id} className={`grid min-h-[54px] items-center gap-3 px-3 py-2 transition hover:bg-blue-50/30 ${includeDescription?"md:grid-cols-[1.3fr_0.85fr_1.6fr_0.5fr_0.7fr_5.5rem]":"md:grid-cols-[1.5fr_1fr_0.6fr_0.8fr_5.5rem]"}`}>
          <div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-900">{row.name}</p><p className="mt-0.5 font-mono text-[9px] text-slate-400 md:hidden">{row.code}</p></div>
          <p className="hidden truncate font-mono text-[10px] text-slate-500 md:block">{row.code}</p>
          {includeDescription?<p className="hidden truncate text-[10px] text-slate-500 md:block" title={row.description??""}>{row.description||"—"}</p>:null}
          <p className="hidden text-[10px] text-slate-500 md:block">{row.sortOrder}</p>
          <Status active={row.active}/>
          <div className="flex justify-end gap-1"><Link aria-label={`Edit ${row.name}`} href={createHref.replace("/new",`/${row.id}/edit`)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5"/></Link><button aria-label={`Delete ${row.name}`} type="button" onClick={()=>remove(row)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5"/></button></div>
        </div>)}
      </div>
    </section>}

    {totalPages>1?<nav className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"><span className="text-[10px] text-slate-500">Page <strong>{safePage}</strong> of <strong>{totalPages}</strong></span><div className="flex gap-1"><button type="button" disabled={safePage<=1} onClick={()=>setPage(safePage-1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 disabled:text-slate-300"><ChevronLeft className="h-3.5 w-3.5"/></button>{Array.from({length:totalPages},(_,i)=>i+1).slice(Math.max(0,safePage-3),Math.max(0,safePage-3)+5).map(n=><button key={n} type="button" onClick={()=>setPage(n)} className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-[10px] font-bold ${n===safePage?"bg-blue-600 text-white":"border border-slate-200 bg-white text-slate-600"}`}>{n}</button>)}<button type="button" disabled={safePage>=totalPages} onClick={()=>setPage(safePage+1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 disabled:text-slate-300"><ChevronRight className="h-3.5 w-3.5"/></button></div></nav>:null}
  </main>;
}
function Status({active}:{active:boolean}){return <span className={`inline-flex w-fit rounded-full px-2 py-1 text-[9px] font-bold ${active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{active?"Active":"Inactive"}</span>}
