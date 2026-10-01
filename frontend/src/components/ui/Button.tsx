import { createElement, forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactElement, type ReactNode, type Ref } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps<T extends ElementType = "button"> = {
  as?: T;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm shadow-blue-600/20 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md hover:shadow-blue-600/25 active:translate-y-0 active:scale-[0.99] focus-visible:ring-brand-600/25",
  secondary:
    "border border-slate-300 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:ring-brand-600/20",
  danger:
    "bg-danger text-white shadow-sm shadow-red-600/20 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md hover:shadow-red-600/25 active:translate-y-0 active:scale-[0.99] focus-visible:ring-red-600/25",
  ghost:
    "text-slate-700 hover:bg-slate-100 active:scale-[0.99] focus-visible:ring-brand-600/20"
};

type ButtonComponent = <T extends ElementType = "button">(
  props: ButtonProps<T> & { ref?: Ref<HTMLElement> }
) => ReactElement | null;

const ButtonRoot = forwardRef<HTMLElement, ButtonProps<ElementType>>(function ButtonRoot({
  as,
  children,
  className,
  variant = "primary",
  ...props
}, ref) {
  const Component = as ?? "button";
  const selectedVariant = (variant ?? "primary") as ButtonVariant;

  return createElement(
    Component,
    {
      className: cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm disabled:active:scale-100",
        variantClasses[selectedVariant],
        className
      ),
      ref,
      ...props
    },
    children
  );
});

export const Button = ButtonRoot as ButtonComponent;
