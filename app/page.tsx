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
import { WhyGeoRiskInstead } from "@/components/WhyGeoRiskInstead";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const [cadastre, setCadastre] = useState<string | undefined>();
  const [polygonCoords, setPolygonCoords] = useState<[number, number][] | null>(null);

  return (
    <div className="min-h-screen bg-mint-50">
      <Navbar />
      <main>
        <Hero onCadastreCaptured={setCadastre} />
        <MapSection onPolygonReady={setPolygonCoords} />
        <SolutionsMistakesSection />
        <WhatWeCheck />
        <ReportExample />
        <WhyGeoRiskInstead />
        <EndSemrushPanel>
          <LeadForm
            initialCadastre={cadastre}
            polygonCoords={polygonCoords}
            mode="panel"
          />
          <Pricing mode="panel" />
        </EndSemrushPanel>
      </main>
      <Footer />
    </div>
  );
}
