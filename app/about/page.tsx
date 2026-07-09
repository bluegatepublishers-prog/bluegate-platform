import AboutHero from "@/components/about/AboutHero";
import OurStory from "@/components/about/OurStory";
import Leadership from "@/components/about/Leadership";
import VisionMission from "@/components/about/VisionMission";

import AboutCTA from "@/components/about/AboutCTA";

import Partners from "@/components/about/Partners";
import Awards from "@/components/about/Awards";

export default function AboutPage() {
  return (
    <main className="bg-[#F8FBFF] min-h-screen">
      <AboutHero />
      <OurStory />
              <Leadership />

      <VisionMission />
        
        <Partners />
        <AboutCTA />
                <Awards />

    </main>
  );
}