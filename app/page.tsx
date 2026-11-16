import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Header from "@/components/Header";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";
import HeroExperience from "@/components/HeroExperience";
import FlavorSection from "@/components/FlavorSection";
import BrandStory from "@/components/BrandStory";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <SmoothScrollProvider>
      <Header />
      <ScrollProgressIndicator />
      <main>
        <HeroExperience />
        <FlavorSection />
        <BrandStory />
        <FinalCta />
      </main>
      <Footer />
    </SmoothScrollProvider>
  );
}
