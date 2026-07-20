import HeroSlider from "@/components/home/HeroSlider";
import WhyBluegate from "@/components/home/WhyBluegate";
import WhySchoolsChooseBluegate from "@/components/home/WhySchoolsChooseBluegate";
import EducationEcosystem from "@/components/home/EducationEcosystem";
import FeaturedBooks from "@/components/home/FeaturedBooks";
import ContactCTA from "@/components/home/ContactCTA";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="overflow-hidden">
      {/* Hero Banner */}
      <HeroSlider />

      {/* Why Bluegate */}
      <WhyBluegate />

      {/* Why Leading Schools Choose Bluegate */}
      <WhySchoolsChooseBluegate />

      {/* Complete Education Ecosystem */}
      <EducationEcosystem />

      {/* Featured Books */}
      <FeaturedBooks />

      {/* Contact CTA */}
      <ContactCTA />
    </main>
  );
}
