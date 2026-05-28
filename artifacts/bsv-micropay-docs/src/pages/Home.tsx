import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { FlowDiagram } from "@/components/FlowDiagram";
import { WhoIsThisFor } from "@/components/WhoIsThisFor";
import { InteractiveDemo } from "@/components/InteractiveDemo";
import { DocsSection } from "@/components/DocsSection";
import { SpecSection } from "@/components/SpecSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <FlowDiagram />
        <WhoIsThisFor />
        <InteractiveDemo />
        <DocsSection />
        <SpecSection />
      </main>
      <Footer />
    </div>
  );
}
