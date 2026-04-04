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
import { ContactAdminModalProvider } from "@/components/ContactAdminModal";

export default function HomePage() {
  const [polygonCoords, setPolygonCoords] = useState<[number, number][] | null>(null);

  return (
    <ContactAdminModalProvider>
      <div className="min-h-screen bg-mint-50">
        <Navbar />
        <main>
          <Hero onCadastreCaptured={() => {}} />
          <MapSection onPolygonReady={setPolygonCoords} />
          <SolutionsMistakesSection />
          <WhatWeCheck />
          <ReportExample />
          <EndSemrushPanel>
            <LeadForm polygonCoords={polygonCoords} mode="panel" />
            <Pricing mode="panel" />
          </EndSemrushPanel>
        </main>
        <Footer />
      </div>
    </ContactAdminModalProvider>
  );
}
