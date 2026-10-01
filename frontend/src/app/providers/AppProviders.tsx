import type { PropsWithChildren } from "react";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ToastProvider>
      <TooltipProvider delayDuration={180} skipDelayDuration={100}>
        <AuthProvider>{children}</AuthProvider>
      </TooltipProvider>
    </ToastProvider>
  );
}
