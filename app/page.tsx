"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
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
import type {
  CadastreByPolygonSuccessBody,
  CadastreLookupResponse,
  CadastreMapCandidate,
  CadastrePolygonCandidate
} from "@/lib/cadastre";

/** После поиска по номеру: к карте, но чуть ниже — чтобы «Данные участка» заходили в кадр. */
function scrollToCadastreMapBlock() {
  if (typeof window === "undefined") return;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const sel = isMobile ? "#mobile-map-section" : "#desktop-map-section";
  const run = () => {
    const el = document.querySelector(sel);
    if (!el || !(el instanceof HTMLElement)) return;
    const pad =
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 88;
    const extraDown = isMobile ? 160 : 220;
    const top = el.getBoundingClientRect().top + window.scrollY - pad + extraDown;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(run);
  });
}

function HomePageContent() {
  const [polygonCoords, setPolygonCoords] = useState<[number, number][] | null>(null);
  const [cadastreData, setCadastreData] = useState<CadastreLookupResponse | null>(null);
  const [cadastreCandidates, setCadastreCandidates] = useState<CadastrePolygonCandidate[] | null>(null);
  const [polygonPickHint, setPolygonPickHint] = useState<string | null>(null);
  const [polygonSearchLoading, setPolygonSearchLoading] = useState(false);
  const [polygonSearchError, setPolygonSearchError] = useState<string | null>(null);

  const mapCandidates: CadastreMapCandidate[] | null = useMemo(
    () => cadastreCandidates?.map((c) => ({ code: c.code, feature: c.feature })) ?? null,
    [cadastreCandidates]
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
    const { hash } = window.location;
    if (!hash || hash === "#top") {
      window.scrollTo(0, 0);
    }
  }, []);

  async function handleCadastreCaptured(cadastre: string) {
    setCadastreCandidates(null);
    setPolygonPickHint(null);
    setPolygonSearchError(null);
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
    scrollToCadastreMapBlock();
  }

  const verifyDrawnPolygon = useCallback(
    async (ring: [number, number][]) => {
      setPolygonCoords(ring);
      setPolygonSearchError(null);
      setPolygonPickHint(null);
      setCadastreCandidates(null);
      setPolygonSearchLoading(true);
      try {
        const res = await fetch("/api/cadastre/by-polygon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ring })
        });
        const data = (await res.json()) as CadastreByPolygonSuccessBody & {
          message?: string;
          code?: string;
        };
        if (res.status === 429) {
          setPolygonSearchError(data?.message ?? "Слишком много запросов. Подождите минуту.");
          return;
        }
        if (!res.ok) {
          setPolygonSearchError(
            typeof data?.message === "string" && data.message.length > 0
              ? data.message
              : "Не удалось выполнить поиск по контуру."
          );
          return;
        }

        const candidates = data.candidates ?? [];
        if (candidates.length === 1) {
          const only = candidates[0];
          setCadastreData(only);
          setCadastreCandidates(null);
          setPolygonPickHint(null);
          return;
        }
        setCadastreData(null);
        setCadastreCandidates(candidates);
        setPolygonPickHint(
          "Несколько земельных участков пересекаются с выделением. Нажмите на нужный участок на карте (подсветка жёлто-оранжевая)."
        );
      } catch {
        setPolygonSearchError("Сетевая ошибка. Попробуйте ещё раз.");
      } finally {
        setPolygonSearchLoading(false);
      }
    },
    []
  );

  const handleCadastreCandidateSelect = useCallback(
    (code: string) => {
      const picked = cadastreCandidates?.find((c) => c.code === code);
      if (!picked) return;
      setCadastreData(picked);
      setCadastreCandidates(null);
      setPolygonPickHint(null);
    },
    [cadastreCandidates]
  );

  return (
    <div className="min-h-screen bg-mint-50">
      <Navbar />
      <main className="flex flex-col">
        <Hero onCadastreCaptured={handleCadastreCaptured} />
        <MapSection
          onPolygonReady={setPolygonCoords}
          onVerifyDrawnPolygon={verifyDrawnPolygon}
          cadastreCandidates={mapCandidates}
          onCadastreCandidateSelect={handleCadastreCandidateSelect}
          polygonSearchLoading={polygonSearchLoading}
          polygonSearchError={polygonSearchError}
          polygonPickHint={polygonPickHint}
          selectedGeoFeature={cadastreData?.feature ?? null}
          cadastreSummary={cadastreData?.summary ?? null}
          cadastreRawProperties={cadastreData?.rawProperties ?? null}
          cadastreFeature={cadastreData?.feature ?? null}
        />
        <SolutionsMistakesSection />
        <MobileMapSection
          onPolygonReady={setPolygonCoords}
          onVerifyDrawnPolygon={verifyDrawnPolygon}
          cadastreCandidates={mapCandidates}
          onCadastreCandidateSelect={handleCadastreCandidateSelect}
          polygonSearchLoading={polygonSearchLoading}
          polygonSearchError={polygonSearchError}
          polygonPickHint={polygonPickHint}
          selectedGeoFeature={cadastreData?.feature ?? null}
          cadastreSummary={cadastreData?.summary ?? null}
          cadastreRawProperties={cadastreData?.rawProperties ?? null}
          cadastreFeature={cadastreData?.feature ?? null}
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
  );
}

export default function HomePage() {
  return (
    <ContactAdminModalProvider>
      <HomePageContent />
    </ContactAdminModalProvider>
  );
}
