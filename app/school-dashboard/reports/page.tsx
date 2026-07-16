import Link from "next/link";
import { EmptyAnalytics, MetricGrid, ReportHero, displayPercent } from "@/components/analytics/AnalyticsVisuals";
import { getSchoolAnalyticsReport } from "@/lib/analytics-reports";
export const dynamic="force-dynamic"; export const revalidate=0;
export default async function SchoolReportsPage(){
  const{summary:s,gapEnabled,openGapCount}=await getSchoolAnalyticsReport();
  return <main className="space-y-7 p-4 sm:p-6 lg:p-8"><ReportHero eyebrow={s?.academicYear.name??"Current academic year"} title="School learning analytics" description="School-scoped participation, completion, performance, and learning-assistant usage from stored aggregates."/>{gapEnabled?<Link href="/school-dashboard/gaps" className="inline-flex rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white">{openGapCount} open learning gaps · View patterns</Link>:null}{s?<MetricGrid metrics={[{label:"Students",value:s.totalStudents},{label:"Active students",value:s.activeStudents},{label:"Participating",value:s.participatingStudents},{label:"Teachers",value:s.totalTeachers},{label:"Reading average",value:displayPercent(s.averageReading)},{label:"Revision average",value:displayPercent(s.averageRevision)},{label:"Practice average",value:displayPercent(s.averagePractice)},{label:"Assessment average",value:displayPercent(s.averageAssessment)},{label:"AI sessions",value:s.aiSessions},{label:"AI requests",value:s.aiRequests}]}/>:<EmptyAnalytics/>}</main>;
}
