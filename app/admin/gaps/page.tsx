import { GapBars, GapCounts, GapHero } from "@/components/gaps/GapVisuals";
import { getPublisherGapReport } from "@/lib/gaps/publisher";
export const dynamic = "force-dynamic"; export const revalidate = 0;
export default async function PublisherGapsPage() {
  const report = await getPublisherGapReport();
  return <div className="space-y-7"><GapHero eyebrow={report.publisher.name} title="Learning gap analysis" description="Tenant-wide aggregate patterns from current-year stored analytics. Student identities and raw learning responses are excluded."/><GapCounts rows={[{label:"Stored signals",value:report.total},{label:"Participating schools",value:report.participatingSchools},{label:"Book patterns",value:report.books.length},{label:"Skill patterns",value:report.outcomes.length+report.competencies.length}]}/><div className="grid gap-5 xl:grid-cols-2"><GapBars title="Severity" rows={report.severity}/><GapBars title="Status" rows={report.status}/><GapBars title="Books" rows={report.books}/><GapBars title="Chapters" rows={report.chapters}/><GapBars title="Learning outcomes" rows={report.outcomes}/><GapBars title="Competencies" rows={report.competencies}/><GapBars title="First detected by month" rows={report.trend}/></div></div>;
}
