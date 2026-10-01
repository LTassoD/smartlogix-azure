import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";

export const Pagination = forwardRef<HTMLElement, ComponentPropsWithoutRef<"nav">>(function Pagination({ className, ...props }, ref) {
  return (
    <nav
      ref={ref}
      role="navigation"
      aria-label="Paginacion"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
});

export const PaginationContent = forwardRef<HTMLUListElement, ComponentPropsWithoutRef<"ul">>(function PaginationContent(
  { className, ...props },
  ref
) {
  return <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />;
});

export const PaginationItem = forwardRef<HTMLLIElement, ComponentPropsWithoutRef<"li">>(function PaginationItem(
  { className, ...props },
  ref
) {
  return <li ref={ref} className={cn("", className)} {...props} />;
});

type PaginationLinkProps = ComponentPropsWithoutRef<"button"> & {
  isActive?: boolean;
  size?: "default" | "icon";
};

export const PaginationLink = forwardRef<HTMLButtonElement, PaginationLinkProps>(function PaginationLink(
  { className, isActive, size = "icon", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 disabled:pointer-events-none disabled:opacity-50",
        size === "icon" ? "h-9 w-9 px-0" : "h-9 px-3",
        isActive
          ? "border-brand-200 bg-brand-50 text-brand-700"
          : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
});

type PaginationControlProps = Omit<PaginationLinkProps, "children"> & {
  text?: string;
};

export const PaginationPrevious = forwardRef<HTMLButtonElement, PaginationControlProps>(function PaginationPrevious(
  { className, text = "Anterior", ...props },
  ref
) {
  return (
    <PaginationLink
      ref={ref}
      aria-label="Ir a la pagina anterior"
      size="default"
      className={cn("gap-1.5 pl-2.5", className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{text}</span>
    </PaginationLink>
  );
});

export const PaginationNext = forwardRef<HTMLButtonElement, PaginationControlProps>(function PaginationNext(
  { className, text = "Siguiente", ...props },
  ref
) {
  return (
    <PaginationLink
      ref={ref}
      aria-label="Ir a la pagina siguiente"
      size="default"
      className={cn("gap-1.5 pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:inline">{text}</span>
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </PaginationLink>
  );
});

export const PaginationEllipsis = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(function PaginationEllipsis(
  { className, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-slate-500", className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Mas paginas</span>
    </span>
  );
});
