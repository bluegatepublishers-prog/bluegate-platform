import Link from "next/link";
import { EmptyAnalytics, MetricGrid, ReportHero, displayPercent } from "@/components/analytics/AnalyticsVisuals";
import { getPublisherAnalyticsReport } from "@/lib/analytics-reports";
export const dynamic="force-dynamic"; export const revalidate=0;
export default async function PublisherReportsPage(){
  const{publisher,summary:s,gapEnabled,openGapCount}=await getPublisherAnalyticsReport();
  return <div className="space-y-7"><ReportHero eyebrow={publisher.name} title="Publisher learning analytics" description="Tenant-wide current-year adoption, participation, performance, and AI usage. Historical aggregates remain stored by academic year."/>{gapEnabled?<Link href="/admin/gaps" className="inline-flex rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white">{openGapCount} open gaps · View aggregate patterns</Link>:null}{s?<MetricGrid metrics={[{label:"Schools",value:s.totalSchools},{label:"Active schools",value:s.activeSchools},{label:"Students",value:s.totalStudents},{label:"Participating",value:s.participatingStudents},{label:"Teachers",value:s.totalTeachers},{label:"Reading average",value:displayPercent(s.averageReading)},{label:"Revision average",value:displayPercent(s.averageRevision)},{label:"Practice average",value:displayPercent(s.averagePractice)},{label:"Assessment average",value:displayPercent(s.averageAssessment)},{label:"AI sessions",value:s.aiSessions},{label:"AI requests",value:s.aiRequests}]}/>:<EmptyAnalytics/>}</div>;
}
