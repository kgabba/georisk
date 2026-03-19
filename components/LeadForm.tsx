"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trackEvent } from "@/lib/track";

const leadSchema = z.object({
  cadastre: z.string().min(5, "Введите кадастровый номер"),
  phone: z.string().min(10, "Введите телефон для связи")
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
  initialCadastre?: string;
  polygonCoords?: [number, number][] | null;
}

export function LeadForm({ initialCadastre, polygonCoords }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      cadastre: initialCadastre ?? ""
    }
  });

  useEffect(() => {
    if (initialCadastre) setValue("cadastre", initialCadastre);
  }, [initialCadastre, setValue]);

  async function onSubmit(values: LeadFormValues) {
    await trackEvent({
      timestamp: new Date().toISOString(),
      cadastre: values.cadastre,
      phone: values.phone,
      polygon_coords: polygonCoords ?? null,
      source: "form"
    });

    alert("Заявка отправлена. Мы свяжемся с вами для экспертного отчёта.");
  }

  return (
    <section id="lead-form" className="bg-transparent px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-3xl bg-white/90 p-5 shadow-soft ring-1 ring-emerald-50 sm:p-7 lg:p-8">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Оставьте заявку на экспертный отчёт</h2>
        <p className="mt-1 text-sm text-slate-600">
          Мы проверим участок по расширенной базе георисков и отправим вам PDF-отчёт с рекомендациями.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="cadastre" className="block text-sm font-medium text-slate-800">
              Кадастровый номер участка
            </label>
            <input
              id="cadastre"
              type="text"
              {...register("cadastre")}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-geoblue focus:ring-2 focus:ring-geoblue/60"
              placeholder="Например 50:21:0040211:123"
            />
            {errors.cadastre && <p className="text-xs text-red-500">{errors.cadastre.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="block text-sm font-medium text-slate-800">
              Телефон для связи
            </label>
            <input
              id="phone"
              type="tel"
              {...register("phone")}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-geoblue focus:ring-2 focus:ring-geoblue/60"
              placeholder="+7 999 123-45-67"
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-md hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Отправляем заявку..." : "Отправить заявку"}
          </button>
        </form>
      </div>
    </section>
  );
}
