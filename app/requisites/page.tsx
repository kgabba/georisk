import Link from "next/link";
import {
  BUSINESS_EMAIL,
  BUSINESS_FULL_NAME,
  BUSINESS_INN,
  BUSINESS_NAME,
  BUSINESS_POSTAL_ADDRESS,
  BUSINESS_STATUS
} from "@/lib/business";
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from "@/lib/contact";

export const metadata = {
  title: "Реквизиты | GeoRisk"
};

export default function RequisitesPage() {
  return (
    <main className="min-h-screen bg-mint-50 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-emerald-100 bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Реквизиты</h1>

        <dl className="mt-4 space-y-3 text-sm sm:text-base">
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="min-w-40 text-slate-500">Проект</dt>
            <dd className="font-medium text-slate-900">{BUSINESS_NAME}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="min-w-40 text-slate-500">Статус</dt>
            <dd className="font-medium text-slate-900">{BUSINESS_STATUS}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="min-w-40 text-slate-500">ФИО</dt>
            <dd className="font-medium text-slate-900">{BUSINESS_FULL_NAME}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="min-w-40 text-slate-500">ИНН</dt>
            <dd className="font-medium text-slate-900">{BUSINESS_INN}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="min-w-40 text-slate-500">Телефон</dt>
            <dd className="font-medium text-slate-900">
              <a href={`tel:${SITE_PHONE_TEL}`} className="underline-offset-2 hover:underline">
                {SITE_PHONE_DISPLAY}
              </a>
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="min-w-40 text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">
              <a href={`mailto:${BUSINESS_EMAIL}`} className="underline-offset-2 hover:underline">
                {BUSINESS_EMAIL}
              </a>
            </dd>
          </div>
          {BUSINESS_POSTAL_ADDRESS ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="min-w-40 text-slate-500">Почтовый адрес</dt>
              <dd className="font-medium text-slate-900">{BUSINESS_POSTAL_ADDRESS}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-8 text-sm text-slate-600">
          Условия оказания услуг: <Link href="/offer" className="text-geoblue underline">публичная оферта</Link>.
        </p>
      </section>
    </main>
  );
}
