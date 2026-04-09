"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MapSection } from "@/components/MapSection";
import { MobileMapSection } from "@/components/MobileMapSection";
import { SolutionsMistakesSection } from "@/components/SolutionsMistakesSection";
import { LeadForm } from "@/components/LeadForm";
import { WhatWeCheck } from "@/components/WhatWeCheck";
import { ReportExample } from "@/components/ReportExample";
import { Pricing } from "@/components/Pricing";
import { EndSemrushPanel } from "@/components/EndSemrushPanel";
import { Footer } from "@/components/Footer";
import { ContactAdminModalProvider } from "@/components/ContactAdminModal";
import type { CadastreLookupResponse } from "@/lib/cadastre";

export default function HomePage() {
  const [polygonCoords, setPolygonCoords] = useState<[number, number][] | null>(null);
  const [cadastreData, setCadastreData] = useState<CadastreLookupResponse | null>(null);

  async function handleCadastreCaptured(cadastre: string) {
    const response = await fetch(`/api/cadastre/${encodeURIComponent(cadastre)}`);
    const data = (await response.json()) as CadastreLookupResponse & { message?: string };
    if (!response.ok) {
      const msg =
        typeof data?.message === "string" && data.message.length > 0
          ? data.message
          : "Не удалось получить данные по кадастру.";
      throw new Error(msg);
    }
    setCadastreData(data);
  }

  return (
    <ContactAdminModalProvider>
      <div className="min-h-screen bg-mint-50">
        <Navbar />
        <main className="flex flex-col">
          <Hero onCadastreCaptured={handleCadastreCaptured} />
          <MapSection
            onPolygonReady={setPolygonCoords}
            selectedGeoFeature={cadastreData?.feature ?? null}
            cadastreSummary={cadastreData?.summary ?? null}
            cadastreRawProperties={cadastreData?.rawProperties ?? null}
          />
          <SolutionsMistakesSection />
          <MobileMapSection
            onPolygonReady={setPolygonCoords}
            selectedGeoFeature={cadastreData?.feature ?? null}
            cadastreSummary={cadastreData?.summary ?? null}
            cadastreRawProperties={cadastreData?.rawProperties ?? null}
          />
          <WhatWeCheck />
          <ReportExample />
          <EndSemrushPanel>
            <LeadForm
              polygonCoords={polygonCoords}
              cadastreNumber={cadastreData?.summary?.cadNum ?? null}
              cadastreFeature={cadastreData?.feature ?? null}
              mode="panel"
            />
            <Pricing mode="panel" />
          </EndSemrushPanel>
        </main>
        <Footer />
      </div>
    </ContactAdminModalProvider>
  );
}
