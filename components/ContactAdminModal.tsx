"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { Phone, X } from "lucide-react";
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL, SITE_TELEGRAM_URL } from "@/lib/contact";

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

type ContactModalContextValue = {
  openContactModal: () => void;
};

const ContactModalContext = createContext<ContactModalContextValue | null>(null);

export function useContactAdminModal(): ContactModalContextValue {
  const ctx = useContext(ContactModalContext);
  if (!ctx) {
    throw new Error("useContactAdminModal must be used within ContactAdminModalProvider");
  }
  return ctx;
}

export function ContactAdminModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openContactModal = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openContactModal }), [openContactModal]);

  return (
    <ContactModalContext.Provider value={value}>
      {children}
      <ContactAdminModal open={open} onClose={close} />
    </ContactModalContext.Provider>
  );
}

type ContactAdminModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ContactAdminModal({ open, onClose }: ContactAdminModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/80 sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 id={titleId} className="pr-10 text-lg font-semibold text-slate-900 sm:text-xl">
          Бесплатная пробная проверка
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Напишите администратору в Telegram или позвоните — ответим за пару минут и подключим одну пробную
          проверку без оплаты.
        </p>

        <a
          href={`tel:${SITE_PHONE_TEL}`}
          className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 transition hover:border-geoblue hover:bg-white hover:ring-2 hover:ring-geoblue/30"
        >
          <Phone className="h-5 w-5 shrink-0 text-geoblue" aria-hidden />
          {SITE_PHONE_DISPLAY}
        </a>

        <a
          href={SITE_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-md transition hover:bg-slate-800"
        >
          <TelegramGlyph className="h-5 w-5 shrink-0 text-sky-300" />
          Написать в Telegram
        </a>
      </div>
    </div>
  );
}
