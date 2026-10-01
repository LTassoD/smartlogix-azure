import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject
} from "react";

const overlayAnimationMs = 320;

let scrollLockCount = 0;
let previousBodyOverflow = "";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function useOverlayLifecycle(open: boolean) {
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));

      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), overlayAnimationMs);

    return () => window.clearTimeout(timeout);
  }, [open]);

  return { shouldRender, visible };
}

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    if (scrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    scrollLockCount += 1;

    return () => {
      scrollLockCount = Math.max(scrollLockCount - 1, 0);

      if (scrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [enabled]);
}

export function useOverlayFocus(open: boolean, shouldRender: boolean, panelRef: RefObject<HTMLElement>) {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const frame = window.requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));

      return () => window.cancelAnimationFrame(frame);
    }

    return undefined;
  }, [open, panelRef]);

  useEffect(() => {
    if (!shouldRender && previouslyFocusedElement.current?.isConnected) {
      previouslyFocusedElement.current.focus({ preventScroll: true });
      previouslyFocusedElement.current = null;
    }
  }, [shouldRender]);
}

export function useEscapeClose(enabled: boolean, closeDisabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDisabled, enabled, onClose]);
}

export function trapFocus(event: ReactKeyboardEvent<HTMLElement>, panelRef: RefObject<HTMLElement>) {
  if (event.key !== "Tab" || !panelRef.current) {
    return;
  }

  const focusableElements = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden")
  );

  if (focusableElements.length === 0) {
    event.preventDefault();
    panelRef.current.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}
