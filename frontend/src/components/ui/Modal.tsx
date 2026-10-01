import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  trapFocus,
  useBodyScrollLock,
  useEscapeClose,
  useOverlayFocus,
  useOverlayLifecycle
} from "@/components/ui/overlayUtils";
import { cn } from "@/utils/cn";

type ModalSize = "sm" | "md" | "lg" | "xl";

type ModalProps = {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeDisabled?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
  contentClassName?: string;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl"
};

export function Modal({
  title,
  subtitle,
  open,
  onClose,
  children,
  footer,
  size = "lg",
  closeDisabled = false,
  closeOnOverlayClick = true,
  className,
  contentClassName
}: ModalProps) {
  const { shouldRender, visible } = useOverlayLifecycle(open);
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useBodyScrollLock(shouldRender);
  useOverlayFocus(open, shouldRender, panelRef);
  useEscapeClose(shouldRender, closeDisabled, onClose);

  if (!shouldRender) {
    return null;
  }

  const requestClose = () => {
    if (!closeDisabled) {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        className={cn(
          "absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-sm transition-opacity",
          visible ? "opacity-100 duration-[260ms] ease-out" : "opacity-0 duration-[200ms] ease-in"
        )}
        onMouseDown={closeOnOverlayClick ? requestClose : undefined}
      />

      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? subtitleId : undefined}
          tabIndex={-1}
          onKeyDown={(event) => trapFocus(event, panelRef)}
          className={cn(
            "pointer-events-auto relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 outline-none transition-all sm:max-h-[calc(100vh-3rem)]",
            sizeClasses[size],
            visible
              ? "translate-y-0 scale-100 opacity-100 duration-[270ms] ease-out"
              : "translate-y-3 scale-[0.97] opacity-0 duration-[210ms] ease-in",
            className
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h3 id={titleId} className="text-lg font-semibold tracking-tight text-slate-950">
                {title}
              </h3>
              {subtitle ? (
                <p id={subtitleId} className="mt-1 text-sm leading-6 text-slate-500">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 shrink-0 px-3"
              onClick={requestClose}
              aria-label="Cerrar"
              disabled={closeDisabled}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <div className={cn("flex-1 overflow-y-auto px-5 py-5 sm:px-6", contentClassName)}>{children}</div>

          {footer ? <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">{footer}</div> : null}
        </section>
      </div>
    </div>,
    document.body
  );
}
