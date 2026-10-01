import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type FormMessageTone = "error" | "success" | "info";

type FormMessageProps = {
  tone?: FormMessageTone;
  title?: string;
  children: ReactNode;
  className?: string;
};

const toneClasses: Record<FormMessageTone, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-green-200 bg-green-50 text-green-800",
  info: "border-blue-200 bg-blue-50 text-blue-800"
};

const iconClasses: Record<FormMessageTone, string> = {
  error: "text-red-600",
  success: "text-green-600",
  info: "text-blue-600"
};

const icons: Record<FormMessageTone, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info
};

export function FormMessage({ tone = "info", title, children, className }: FormMessageProps) {
  const Icon = icons[tone];

  return (
    <div className={cn("flex w-full gap-3 rounded-xl border p-3 text-left text-sm !items-start !justify-start", toneClasses[tone], className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClasses[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-left">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn("leading-6", title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}
