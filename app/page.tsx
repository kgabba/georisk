"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MapSection } from "@/components/MapSection";
import { SolutionsMistakesSection } from "@/components/SolutionsMistakesSection";
import { LeadForm } from "@/components/LeadForm";
import { WhatWeCheck } from "@/components/WhatWeCheck";
import { ReportExample } from "@/components/ReportExample";
import { Pricing } from "@/components/Pricing";
import { EndSemrushPanel } from "@/components/EndSemrushPanel";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const [polygonCoords, setPolygonCoords] = useState<[number, number][] | null>(null);

  return (
    <div className="min-h-screen bg-mint-50">
      <Navbar />
      <main>
        <Hero onCadastreCaptured={() => {}} />
        <MapSection onPolygonReady={setPolygonCoords} />
        <SolutionsMistakesSection />
        <WhatWeCheck />
        <ReportExample />
        <EndSemrushPanel>
          <Pricing mode="panel" />
          <LeadForm polygonCoords={polygonCoords} mode="panel" />
        </EndSemrushPanel>
      </main>
      <Footer />
    </div>
  );
}
