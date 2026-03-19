import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

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
  return (
    <html lang="ru">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
