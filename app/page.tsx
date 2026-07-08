import HeroSlider from "@/components/home/HeroSlider";
import WhyBluegate from "@/components/home/WhyBluegate";
import TrustedSection from "@/components/home/TrustedSection";
import EducationalSolutions from "@/components/home/EducationalSolutions";
import BrowseByClass from "@/components/home/BrowseByClass";
import BrowseBySubject from "@/components/home/BrowseBySubject";
import FeaturedBooks from "@/components/home/FeaturedBooks";

export default function Home() {
  return (
    <>
      <HeroSlider />

      <WhyBluegate />

      <TrustedSection />

      <EducationalSolutions />

      <BrowseByClass />

      <BrowseBySubject />

      <FeaturedBooks />
    </>
  );
}