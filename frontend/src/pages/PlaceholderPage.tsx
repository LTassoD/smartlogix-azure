import type { ReactNode } from "react";
import { Circle } from "lucide-react";

type PlaceholderCard = {
  title: string;
  description: string;
  icon?: ReactNode;
};

type PlaceholderPageProps = {
  title: string;
  description: string;
  cards?: PlaceholderCard[];
};

export function PlaceholderPage({ title, description, cards = [] }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Gestion</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </section>

      {cards.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-blue-50 p-2 text-brand-700">{card.icon ?? <Circle className="h-5 w-5" aria-hidden="true" />}</div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Sin registros</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-950">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
