import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type InfoCardProps = {
  title: string;
  value: ReactNode;
  supportingText?: string;
  icon?: ReactNode;
  className?: string;
};

export function InfoCard({ title, value, supportingText, icon, className }: InfoCardProps) {
  return (
    <section
      className={cn(
        "animate-fade-up group rounded-xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        {icon ? <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition group-hover:bg-slate-200">{icon}</div> : null}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {supportingText ? <p className="mt-2 text-sm text-slate-600">{supportingText}</p> : null}
    </section>
  );
}
