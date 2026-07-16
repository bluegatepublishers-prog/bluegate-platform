import { GapBars, GapCounts, GapHero } from "@/components/gaps/GapVisuals";
import { getSchoolGapReport } from "@/lib/gaps/school";
export const dynamic = "force-dynamic"; export const revalidate = 0;
export default async function SchoolGapsPage() {
  const report = await getSchoolGapReport();
  const group = (values: string[]) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>())].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count);
  const active = report.gaps.filter(gap=>gap.status === "OPEN" || gap.status === "ACKNOWLEDGED");
  return <main className="space-y-7 p-4 sm:p-6 lg:p-8"><GapHero eyebrow="Current academic year" title="School learning gap patterns" description="School-scoped, evidence-based patterns for planning support. This view is read-only and does not assign interventions."/><GapCounts rows={[{label:"Stored signals",value:report.gaps.length},{label:"Students needing support",value:report.studentsNeedingSupport ?? 0},{label:"Open or acknowledged",value:active.length},{label:"Distinct patterns",value:report.patterns.length}]}/><div className="grid gap-5 xl:grid-cols-2"><GapBars title="Severity" rows={report.severity}/><GapBars title="Status" rows={report.status}/><GapBars title="Subject patterns" rows={report.subjects}/><GapBars title="Class and section patterns" rows={group(active.map(gap=>`${gap.student.enrollments[0]?.section.schoolClass.name ?? "Current class"} · ${gap.student.enrollments[0]?.section.name ?? "Unassigned"}`))}/><GapBars title="Common difficult chapters" rows={report.chapters}/><GapBars title="Common learning outcomes" rows={report.outcomes}/><GapBars title="Common competencies" rows={report.competencies}/></div></main>;
}
