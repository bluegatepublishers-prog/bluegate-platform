import AboutHero from "@/components/about/AboutHero";
import OurStory from "@/components/about/OurStory";
import VisionMission from "@/components/about/VisionMission";
import CoreValues from "@/components/about/CoreValues";
import Awards from "@/components/about/Awards";
import WhyChoose from "@/components/about/WhyChoose";
import AboutCTA from "@/components/about/AboutCTA";
import Leadership from "@/components/about/Leadership";
import Partners from "@/components/about/Partners";

export default function AboutPage() {
  return (
    <main className="bg-[#F8FBFF] min-h-screen">
      <AboutHero />
      <OurStory />
      <VisionMission />
      <CoreValues />
        <Awards />
        <WhyChoose />
        <Leadership />
        <Partners />
        <AboutCTA />
    </main>
  );
}