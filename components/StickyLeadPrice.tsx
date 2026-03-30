"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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

export function StickyLeadPrice({
  initialCadastre,
  polygonCoords
}: {
  initialCadastre?: string;
  polygonCoords?: [number, number][] | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start end", "end start"]
  });

  // “Папка” при скролле: сначала чуть уменьшается и как бы уходит под предыдущий слой,
  // затем поднимается/раскрывается.
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.6, 1], [0.98, 0.985, 1.0, 1.0]);
  const translateY = useTransform(scrollYProgress, [0, 0.35, 1], [42, 14, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.7, 1], [0.2, 1, 1, 1]);

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
    <section className="bg-transparent px-4 pb-24 pt-0 sm:px-6 lg:px-8">
      <div ref={rootRef} className="mx-auto max-w-6xl">
        <motion.div
          style={{ scale, translateY, opacity }}
          className="sticky top-[92px] z-30 will-change-transform"
        >
          <div className="relative overflow-hidden rounded-3xl bg-white/85 p-4 shadow-soft ring-1 ring-emerald-50 sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.25),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(37,99,235,0.18),_transparent_55%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr,1.2fr]">
              {/* Цена */}
              <div className="rounded-2xl bg-white/80 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-emerald-50">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                  Специальная цена на запуск
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <div className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                    870 ₽
                  </div>
                  <div className="flex flex-col text-xs text-slate-500">
                    <span className="line-through opacity-70">1990 ₽</span>
                    <span>за один участок</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Сформируем экспертный PDF‑отчёт по вашим вводным и (если есть) полигону.
                </p>
              </div>

              {/* Оставьте заявку */}
              <div
                id="lead-form"
                className="rounded-2xl bg-white/80 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-emerald-50"
              >
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Оставьте заявку на экспертный отчёт
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Мы проверим участок по расширенной базе георисков и отправим вам PDF‑отчёт с рекомендациями.
                </p>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-6 space-y-4"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="cadastre"
                      className="block text-sm font-medium text-slate-800"
                    >
                      Кадастровый номер участка
                    </label>
                    <input
                      id="cadastre"
                      type="text"
                      {...register("cadastre")}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-geoblue focus:ring-2 focus:ring-geoblue/60"
                      placeholder="Например 50:21:0040211:123"
                    />
                    {errors.cadastre && (
                      <p className="text-xs text-red-500">
                        {errors.cadastre.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-slate-800"
                    >
                      Телефон для связи
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-geoblue focus:ring-2 focus:ring-geoblue/60"
                      placeholder="+7 999 123-45-67"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-md hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting
                      ? "Отправляем заявку..."
                      : "Отправить заявку"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

