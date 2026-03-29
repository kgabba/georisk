"use client";

type SolutionCard = {
  tag: string;
  title: string;
  description: string;
  loss: string;
};

const cards: SolutionCard[] = [
  {
    tag: "ВОДООХРАННАЯ ЗОНА",
    title: "Купил участок — стройку запретили",
    description:
      "Участок попал в водоохранную зону. Строительство оказалось невозможно.",
    loss: "от 2 до 4 млн ₽"
  },
  {
    tag: "ЛЭП И ОХРАННЫЕ ЗОНЫ",
    title: "ЛЭП оказалась слишком близко",
    description:
      "Банк отказал в ипотеке, нотариус завернул сделку. Продали со скидкой 25–35%.",
    loss: "от 1 до 3 млн ₽"
  },
  {
    tag: "ГЕНПЛАН И ПЗЗ",
    title: "Генплан не позволяет ИЖС",
    description:
      "Участок в сельхозземлях или зелёной зоне. Разрешение на жилой дом не получить.",
    loss: "от 1,5 до 3,5 млн ₽"
  },
  {
    tag: "ПОДТОПЛЕНИЕ И РЕЛЬЕФ",
    title: "Подтопление и опасный уклон",
    description:
      "Весной участок уходит под воду или начинается оползень. Фундамент разрушается.",
    loss: "от 1,5 до 4 млн ₽"
  }
];

export function SolutionsMistakesSection() {
  return (
    <section className="bg-transparent px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Каждый месяц люди теряют 1–5 млн ₽
              <br />
              на участках, которые казались идеальными
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Вот 4 самые частые ошибки, которые мы находим до того, как вы
              потеряете деньги
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {cards.map((card) => (
            <article
              key={card.tag}
              className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl bg-[linear-gradient(148deg,#f0f7f4_0%,#e8f5ef_42%,#e6f0fa_100%)] p-5 shadow-md ring-1 ring-emerald-100/60 transition duration-300 ease-out hover:shadow-[0_12px_36px_-8px_rgba(15,23,42,0.22)] hover:ring-slate-300/40 sm:min-h-[440px] sm:p-6"
            >
              <div className="pointer-events-none absolute right-3 top-3 sm:right-4 sm:top-4">
                <div
                  className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm ring-2 ring-white/90 sm:h-3 sm:w-3"
                  aria-hidden
                />
              </div>

              <p className="pr-7 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:pr-8">
                {card.tag}
              </p>

              <h3 className="mt-4 min-h-[3rem] text-base font-semibold leading-snug text-slate-900 sm:min-h-[3.5rem]">
                {card.title}
              </h3>
              <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-slate-600 sm:min-h-[5rem]">
                {card.description}
              </p>

              <div className="mt-auto pt-6">
                <div className="min-h-[128px] rounded-xl border border-slate-200/90 bg-white/55 p-4 shadow-inner backdrop-blur-[1px]">
                  <div className="flex h-full flex-col justify-end gap-2">
                    <div className="flex items-end gap-1">
                      <div className="h-8 w-1/5 rounded-sm bg-slate-300/70" />
                      <div className="h-12 w-1/5 rounded-sm bg-slate-300/60" />
                      <div className="h-6 w-1/5 rounded-sm bg-slate-300/50" />
                      <div className="h-14 w-1/5 rounded-sm bg-geoblue/25" />
                      <div className="h-10 w-1/5 rounded-sm bg-slate-300/55" />
                    </div>
                    <div className="h-px w-full bg-slate-200/80" />
                    <p className="text-xs text-slate-400">
                      Место для мини-графики или иконки
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium leading-tight text-slate-500 sm:text-sm whitespace-nowrap">
                  Потери: {card.loss}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
