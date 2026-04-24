import Link from "next/link";
import { BUSINESS_EMAIL, BUSINESS_FULL_NAME, BUSINESS_INN, BUSINESS_NAME } from "@/lib/business";
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from "@/lib/contact";

export const metadata = {
  title: "Публичная оферта | GeoRisk"
};

export default function OfferPage() {
  return (
    <main className="min-h-screen bg-mint-50 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-2xl border border-emerald-100 bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Публичная оферта</h1>
        <p className="mt-2 text-sm text-slate-600">
          Настоящий документ определяет условия оказания информационно-аналитических услуг сервиса {BUSINESS_NAME}.
        </p>

        <div className="mt-6 space-y-5 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900">1. Предмет оферты</h2>
            <p>
              Исполнитель предоставляет заказчику доступ к сервису анализа георисков земельного участка, к интерактивной карте
              с георисками и формирует PDF-отчет по выбранному тарифу.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">2. Стоимость и порядок оплаты</h2>
            <p>
              Стоимость услуг указывается на странице «Тарифы». Оплата производится онлайн банковской картой/доступным
              способом через платежный сервис Robokassa.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">3. Порядок оказания услуги</h2>
            <p>
              После подтверждения оплаты заказ получает результат в формате PDF. Отчет формируется автоматически и доступен
              для скачивания в интерфейсе сервиса.
            </p>
            <p className="mt-2">
              Стандартный срок предоставления результата: в течение 5 минут после успешной оплаты. При технических сбоях —
              не позднее 24 часов с момента оплаты.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">4. Отмена и возврат</h2>
            <p>
              Если услуга не была предоставлена в установленный срок по вине исполнителя, заказчик вправе запросить возврат
              денежных средств. Заявка на возврат принимается по контактам, указанным на странице реквизитов.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">5. Контакты и реквизиты исполнителя</h2>
            <p>ФИО: {BUSINESS_FULL_NAME}</p>
            <p>ИНН: {BUSINESS_INN}</p>
            <p>
              Телефон: <a href={`tel:${SITE_PHONE_TEL}`} className="underline-offset-2 hover:underline">{SITE_PHONE_DISPLAY}</a>
            </p>
            <p>
              Email: <a href={`mailto:${BUSINESS_EMAIL}`} className="underline-offset-2 hover:underline">{BUSINESS_EMAIL}</a>
            </p>
            <p className="pt-2 text-slate-600">
              Подробные реквизиты размещены на странице{" "}
              <Link href="/requisites" className="text-geoblue underline">
                «Реквизиты»
              </Link>.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
