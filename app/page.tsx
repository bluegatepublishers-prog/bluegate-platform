import HeroSlider from "@/components/home/HeroSlider";
import Stats from "@/components/home/Stats";
import BrowseByClass from "@/components/home/BrowseByClass";
import FeaturedBooks from "@/components/home/FeaturedBooks";
import BrowseBySubject from "@/components/home/BrowseBySubject";
import WhyBluegate from "@/components/home/WhyBluegate";
import AboutBluegate from "@/components/home/AboutBluegate";
import EducationalSolutions from "@/components/home/EducationalSolutions";
import TrustedSection from "@/components/home/TrustedSection";

export default function Home() {
  return (
    <>
      <HeroSlider />
      <Stats />
      <BrowseByClass />
      <TrustedSection />
      <FeaturedBooks />
      <BrowseBySubject />
      <WhyBluegate />
      <EducationalSolutions />
      <AboutBluegate />

    </>
  );
}