import Hero from "@/components/teacher/Hero";
import WhyTeacherHub from "@/components/teacher/WhyTeacherHub";
import ResourceCategories from "@/components/teacher/ResourceCategories";
import FeaturedResources from "@/components/teacher/FeaturedResources";
import HowItWorks from "@/components/teacher/HowItWorks";
import TeacherStats from "@/components/teacher/TeacherStats";
import Testimonials from "@/components/teacher/Testimonials";
import FAQ from "@/components/teacher/FAQ";
import CTA from "@/components/teacher/CTA";

export const metadata = {
  title: "Teacher Hub | Bluegate Publishers",
  description:
    "Discover lesson plans, worksheets, presentations, videos, teacher manuals and classroom resources designed for modern educators.",
};

export default function TeacherHubPage() {
  return (
    <main className="bg-white">

      <Hero />

      <WhyTeacherHub />

      <ResourceCategories />

      <FeaturedResources />

      <HowItWorks />

      <TeacherStats />

      <Testimonials />

      <FAQ />

      <CTA />

    </main>
  );
}