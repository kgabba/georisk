import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Geo Risk Check — проверка рисков участка",
  description:
    "GeoRisk — экспертная проверка рисков земельного участка: водоохранные зоны, ЛЭП, ООПТ, уклон и подтопление. Автоматический анализ и экспертный PDF-отчёт."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const isUmamiEnabled = Boolean(umamiWebsiteId && umamiScriptUrl);

  return (
    <html lang="ru">
      <body className={`${inter.variable} antialiased`}>
        {children}
        {isUmamiEnabled ? (
          <Script
            defer
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
