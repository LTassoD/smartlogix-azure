import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type TextInputProps = {
  label: string;
  error?: string;
  helperText?: string;
  leadingIcon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ id, label, error, helperText, leadingIcon, className, required, ...props }: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name;
  const resolvedInputId = inputId ?? generatedId;
  const messageId = `${resolvedInputId}-message`;
  const hasMessage = Boolean(error || helperText);

  return (
    <div>
      <label htmlFor={resolvedInputId} className="block text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="ml-1 text-brand-600">*</span> : null}
      </label>
      <div className="relative mt-2">
        {leadingIcon ? <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leadingIcon}</div> : null}
        <input
          id={resolvedInputId}
          aria-invalid={Boolean(error)}
          aria-describedby={hasMessage ? messageId : undefined}
          required={required}
          className={cn(
            "block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            Boolean(leadingIcon) && "pl-10",
            error && "border-danger focus:border-danger focus:ring-red-600/15",
            className
          )}
          {...props}
        />
      </div>
      {hasMessage ? (
        <p id={messageId} className={cn("mt-2 text-sm leading-5 text-slate-500", error && "font-medium text-danger")}>
          {error ?? helperText}
        </p>
      ) : null}
    </div>
  );
}
