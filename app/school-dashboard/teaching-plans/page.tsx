import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SchoolTeachingPlansPage() {
  redirect("/school-dashboard/planner");
}