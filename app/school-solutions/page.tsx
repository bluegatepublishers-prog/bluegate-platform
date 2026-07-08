import SchoolHero from "@/components/school/SchoolHero";
import WhyBluegate from "@/components/school/WhyBluegate";
import SolutionsGrid from "@/components/school/SolutionsGrid";
import PartnershipProcess from "@/components/school/PartnershipProcess";
import TeacherTraining from "@/components/school/TeacherTraining";
import DigitalLearning from "@/components/school/DigitalLearning";
import AssessmentSupport from "@/components/school/AssessmentSupport";
import PartnerTestimonials from "@/components/school/PartnerTestimonials";
import FAQ from "@/components/school/FAQ";
import SchoolCTA from "@/components/school/SchoolCTA";

export const metadata = {
  title: "School Solutions | Bluegate Publishers",
  description:
    "Bluegate Publishers partners with schools through curriculum-aligned books, teacher support, assessments and digital learning solutions.",
};

export default function SchoolSolutionsPage() {
  return (
    <main className="min-h-screen bg-white">

      <SchoolHero />

      <WhyBluegate />

      <SolutionsGrid />

      <PartnershipProcess />

      <TeacherTraining />

      <DigitalLearning />

      <AssessmentSupport />

      <PartnerTestimonials />

      <FAQ />

      <SchoolCTA />

    </main>
  );
}