import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/publisher-context";
import { togglePublisherFeature, updatePublisher } from "../actions";
const input="mt-1 w-full rounded-xl border px-3 py-2";
export default async function Page({params}:{params:Promise<{id:string}>}){
 await requireSuperAdmin();
 const{id}=await params;
 const[x,catalog]=await Promise.all([prisma.publisher.findUnique({where:{id},include:{features:true}}),prisma.featureDefinition.findMany({where:{active:true},orderBy:[{category:"asc"},{name:"asc"}]})]);
 if(!x)notFound();
 const states=new Map(x.features.map(f=>[f.featureId,f.enabled]));
 const fields:[string,string,string|null][]=[["shortName","Short name",x.shortName],["portalTitle","Portal title",x.portalTitle],["logoUrl","Logo URL",x.logoUrl],["aiName","AI name",x.aiName],["primaryColor","Primary colour",x.primaryColor],["secondaryColor","Secondary colour",x.secondaryColor],["accentColor","Accent colour",x.accentColor],["supportEmail","Support email",x.supportEmail],["supportPhone","Support phone",x.supportPhone]];
 return <div><h1 className="text-3xl font-bold">{x.name}</h1><p className="mt-2 text-slate-500">{x.slug}</p><form action={updatePublisher.bind(null,id)} className="mt-8 grid max-w-3xl gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-2"><h2 className="sm:col-span-2 text-xl font-bold">Identity and portal theme</h2>{fields.map(([name,label,value])=><label key={name}>{label}<input name={name} defaultValue={value??""} className={input}/></label>)}<label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={x.active}/> Active</label><button className="rounded-xl bg-slate-950 px-5 py-3 text-white">Save publisher</button></form><section className="mt-8 max-w-3xl rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Features</h2><p className="mt-2 text-sm text-slate-500">Only implemented modules produce navigation or routes.</p><div className="mt-5 divide-y">{catalog.map(feature=>{const enabled=states.get(feature.id)??false;return <form key={feature.id} action={togglePublisherFeature.bind(null,id,feature.key)} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">{feature.name}</p><p className="text-sm text-slate-500">{feature.description} · {feature.implemented?"Implemented":"Planned"}</p></div><input type="hidden" name="enabled" value={enabled?"false":"true"}/><button className={`rounded-xl px-4 py-2 text-sm font-semibold ${enabled?"bg-green-100 text-green-700":"bg-slate-100 text-slate-600"}`}>{enabled?"Enabled":"Disabled"}</button></form>})}</div></section></div>
}
