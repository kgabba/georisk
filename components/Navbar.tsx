"use client";

import Link from "next/link";
import { MapPinned } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-emerald-100/70 bg-mint-50/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-18 sm:px-6 lg:px-8">
        <Link href="#top" className="flex items-center gap-2 text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
            <MapPinned className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">GeoRisk</span>
        </Link>

        {/* ЗДЕСЬ МЕНЯТЬ @НИК TELEGRAM */}
        <a
          href="https://t.me/pulya102"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-slate-800 transition"
        >
          <span>Написать в Telegram</span>
        </a>
      </div>
    </header>
  );
}
