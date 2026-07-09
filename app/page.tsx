import HeroSlider from "@/components/home/HeroSlider";
import WhyBluegate from "@/components/home/WhyBluegate";
import WhySchoolsChooseBluegate from "@/components/home/WhySchoolsChooseBluegate";
import EducationEcosystem from "@/components/home/EducationEcosystem";
import FeaturedBooks from "@/components/home/FeaturedBooks";
import BrowseByClass from "@/components/home/BrowseByClass";
import BrowseBySubject from "@/components/home/BrowseBySubject";
import TeacherHub from "@/components/home/TeacherHub";
import ContactCTA from "@/components/home/ContactCTA";

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

      {/* Browse by Class */}
      <BrowseByClass />

      {/* Browse by Subject */}
      <BrowseBySubject />

      {/* Teacher Hub */}
      <TeacherHub />

      {/* Contact CTA */}
      <ContactCTA />
    </main>
  );
}