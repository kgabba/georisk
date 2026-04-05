"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const leadSchema = z.object({
  name: z.string().min(2, "Укажите, как к вам обращаться"),
  phone: z.string().min(10, "Введите телефон для связи")
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
  polygonCoords?: [number, number][] | null;
  mode?: "default" | "panel";
}

export function LeadForm({ polygonCoords, mode = "default" }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: ""
    }
  });

  function onSubmit(_values: LeadFormValues) {
    alert("Заявка отправлена. Мы свяжемся с вами для экспертного отчёта.");
  }

  return (
    <section
      id="lead-form"
      className={[
        "bg-transparent max-md:scroll-mt-24 md:scroll-mt-0",
        mode === "panel"
          ? "px-0 pb-0 pt-0"
          : "px-4 pb-20 pt-4 sm:px-6 lg:px-8"
      ].join(" ")}
    >
      <div className="mx-auto max-w-xl rounded-3xl bg-white/90 p-5 shadow-soft ring-1 ring-emerald-50 sm:p-7 lg:p-8">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Оставьте заявку на экспертный отчёт</h2>
        <p className="mt-1 text-sm text-slate-600">
          Мы проверим участок по расширенной базе георисков и отправим вам PDF-отчёт с рекомендациями.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="lead-name" className="block text-sm font-medium text-slate-800">
              Как к Вам обращаться?
            </label>
            <input
              id="lead-name"
              type="text"
              autoComplete="name"
              {...register("name")}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-geoblue focus:ring-2 focus:ring-geoblue/60"
              placeholder="например, Александр"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="block text-sm font-medium text-slate-800">
              Телефон для связи
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
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
