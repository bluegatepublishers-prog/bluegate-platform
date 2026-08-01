import Link from "next/link";
import { ArrowRight, BookOpen, Boxes, GraduationCap, Landmark, LibraryBig, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const metadata = { title: "Master Data | Bluegate Admin" };

export default async function MasterDataPage() {
  const actor = await requireLivePublisherAdmin();
  const [classes, subjects, series, boards, definitions] = await Promise.all([
    prisma.class.count({ where: { active: true } }), prisma.subject.count({ where: { active: true } }),
    prisma.bookSeries.count({ where: { active: true, publisherId: actor.publisherId } }),
    prisma.board.count({ where: { active: true, publisherId: actor.publisherId } }),
    prisma.masterDataDefinition.findMany({ where: { publisherId: actor.publisherId }, include: { _count: { select: { values: { where: { active: true } } } } }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
  ]);
  const core = [
    { title:"Boards", description:"Publisher boards and curricula.", href:"/admin/master/boards", icon:Landmark, count:boards },
    { title:"Classes", description:"Classes used throughout the platform.", href:"/admin/master/classes", icon:GraduationCap, count:classes },
    { title:"Subjects", description:"Subjects used across the platform.", href:"/admin/master/subjects", icon:BookOpen, count:subjects },
    { title:"Book Series", description:"Publisher publication series.", href:"/admin/master/series", icon:LibraryBig, count:series },
  ];
  return <div className="space-y-10"><div><h1 className="text-3xl font-bold text-slate-900">Master Data</h1><p className="mt-2 text-slate-600">Configure stable core entities and publisher-defined lists.</p></div>
    <Section title="Core Master Data" description="Platform entities with dedicated relationships and behavior."><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{core.map((item)=><Card key={item.href} {...item}/>)}</div></Section>
    <Section title="Custom Master Data" description="Simple publisher-scoped lists. These do not alter the database schema or replace core entities."><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{definitions.map((item)=><Card key={item.id} title={item.name} description={item.description || item.code} href={`/admin/master/custom/${item.id}`} icon={Boxes} count={item._count.values} inactive={!item.active}/>)}<Link href="/admin/master/custom" className="flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-blue-700 hover:border-blue-400"><Plus className="h-8 w-8"/><span className="mt-3 font-bold">Manage custom types</span></Link></div></Section>
  </div>;
}

function Section({title,description,children}:{title:string;description:string;children:React.ReactNode}) { return <section><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mb-5 mt-1 text-sm text-slate-600">{description}</p>{children}</section>; }
function Card({title,description,href,icon:Icon,count,inactive=false}:{title:string;description:string;href:string;icon:typeof Boxes;count:number;inactive?:boolean}) { return <Link href={href} className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="rounded-xl bg-blue-100 p-3 text-blue-700"><Icon className="h-6 w-6"/></span><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{count} active</span></div><h3 className="mt-5 text-xl font-bold">{title}{inactive ? <span className="ml-2 text-xs font-normal text-slate-500">Inactive type</span> : null}</h3><p className="mt-2 min-h-10 text-sm text-slate-600">{description}</p><span className="mt-5 inline-flex items-center font-semibold text-blue-700">Open<ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1"/></span></Link>; }
