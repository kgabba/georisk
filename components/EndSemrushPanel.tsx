import type { ReactNode } from "react";

export function EndSemrushPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* Фоновая “папка” как у Semrush — только фон, без текста */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 mx-auto max-w-6xl rounded-3xl bg-[linear-gradient(135deg,_rgba(233,216,255,0.95)_0%,_rgba(219,234,254,0.92)_52%,_rgba(224,247,244,0.92)_100%)] ring-1 ring-white/40"
      />
      {/* легкий диагональный блик */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-0 mx-auto max-w-6xl rounded-3xl bg-[radial-gradient(circle_at_85%_20%,_rgba(167,139,250,0.35)_0%,_transparent_55%),radial-gradient(circle_at_20%_80%,_rgba(45,212,191,0.22)_0%,_transparent_55%)]"
      />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}

