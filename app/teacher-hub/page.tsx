import {
  Hero,
  LoginCTA,
  ResourceCategories,
  FeaturedResources,
  TeacherStats,
  FAQ,
  CTA,
} from "@/components/teacher";

export const metadata = {
  title: "Teacher Hub | Bluegate Publishers",
  description:
    "Access premium teaching resources including lesson plans, worksheets, presentations, teacher manuals, question banks, answer keys and classroom support from Bluegate Publishers.",
};

export default function TeacherHubPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <Hero />

      {/* Login CTA */}
      <LoginCTA />

      {/* Resource Categories */}
      <ResourceCategories />

      {/* Featured Resources */}
      <FeaturedResources />

      {/* Teacher Statistics */}
      <TeacherStats />

      {/* Frequently Asked Questions */}
      <FAQ />

      {/* Final Call To Action */}
      <CTA />

    </main>
  );
}