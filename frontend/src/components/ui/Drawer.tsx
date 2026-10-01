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

type DrawerProps = {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeDisabled?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
  contentClassName?: string;
};

export function Drawer({
  title,
  subtitle,
  open,
  onClose,
  children,
  footer,
  closeDisabled = false,
  closeOnOverlayClick = true,
  className,
  contentClassName
}: DrawerProps) {
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
          visible ? "opacity-100 duration-[270ms] ease-out" : "opacity-0 duration-[220ms] ease-in"
        )}
        onMouseDown={closeOnOverlayClick ? requestClose : undefined}
      />

      <div className="pointer-events-none fixed inset-0 flex justify-end overflow-hidden">
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? subtitleId : undefined}
          tabIndex={-1}
          onKeyDown={(event) => trapFocus(event, panelRef)}
          className={cn(
            "pointer-events-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-white/70 bg-white shadow-2xl shadow-slate-950/25 outline-none transition-all sm:m-4 sm:h-[calc(100vh-2rem)] sm:rounded-2xl sm:border",
            visible ? "translate-x-0 opacity-100 duration-[300ms] ease-out" : "translate-x-8 opacity-0 duration-[240ms] ease-in",
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
