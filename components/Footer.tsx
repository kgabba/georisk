"use client";

export function Footer() {
  return (
    <footer className="border-t border-emerald-100 bg-mint-50/90 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} GeoRisk. Все права защищены.</p>
        <a
          href="https://t.me/pulya102"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          Связаться в Telegram
        </a>
      </div>
    </footer>
  );
}
