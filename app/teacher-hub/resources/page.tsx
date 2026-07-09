import ResourceHero from "@/components/teacher-resources/ResourceHero";
import ResourceList from "@/components/teacher-resources/ResourceFilters";

export const metadata = {
  title: "Teacher Resources | Bluegate Publishers",
  description: "Browse teacher resources: lesson plans, worksheets, presentations and more.",
};

export default function ResourcesPage() {
  return (
    <main className="bg-white">
      <ResourceHero />
      <ResourceList />
    </main>
  );
}
