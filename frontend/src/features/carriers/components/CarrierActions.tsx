import { CircleOff, Eye, RadioTower, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Carrier } from "@/features/carriers/types/carrierTypes";
import { cn } from "@/utils/cn";

type CarrierActionsProps = {
  carrier: Carrier;
  permissions: {
    canViewDetail: boolean;
    canUpdateAvailability: boolean;
  };
  layout?: "icon" | "full";
  onViewDetail: (carrier: Carrier) => void;
  onToggleAvailability: (carrier: Carrier) => void;
};

export function CarrierActions({ carrier, layout = "icon", onToggleAvailability, onViewDetail, permissions }: CarrierActionsProps) {
  const availabilityLabel = carrier.simulatedAvailable ? "Marcar no disponible" : "Marcar disponible";

  return (
    <div className={cn(layout === "icon" ? "inline-flex min-w-[92px] justify-end gap-1.5" : "grid grid-cols-2 gap-2")}>
      {permissions.canViewDetail ? <ActionIconButton icon={Eye} label="Ver detalle" layout={layout} onClick={() => onViewDetail(carrier)} /> : null}
      {permissions.canUpdateAvailability ? (
        <ActionIconButton
          icon={carrier.simulatedAvailable ? CircleOff : RadioTower}
          label={availabilityLabel}
          layout={layout}
          tone={carrier.simulatedAvailable ? "warning" : "success"}
          onClick={() => onToggleAvailability(carrier)}
        />
      ) : null}
    </div>
  );
}

function ActionIconButton({
  icon: Icon,
  label,
  layout,
  onClick,
  tone = "neutral"
}: {
  icon: LucideIcon;
  label: string;
  layout: "icon" | "full";
  onClick: () => void;
  tone?: "neutral" | "success" | "warning";
}) {
  const button = (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        "rounded-xl border-slate-300 text-slate-700 !shadow-none hover:-translate-y-0 hover:border-slate-400 hover:bg-slate-50 hover:!shadow-none focus-visible:ring-4",
        layout === "icon" ? "h-10 min-h-10 w-10 p-0" : "min-h-11 justify-start px-3 py-2 text-left text-xs leading-tight",
        tone === "success" && "border-green-200 text-green-700 hover:border-green-300 hover:bg-green-50 hover:text-green-800 focus-visible:ring-green-600/15",
        tone === "warning" && "border-yellow-200 text-yellow-700 hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-800 focus-visible:ring-yellow-600/15"
      )}
      onClick={onClick}
      aria-label={label}
    >
      <Icon aria-hidden="true" absoluteStrokeWidth className="h-5 w-5 shrink-0" strokeWidth={2.5} />
      {layout === "full" ? <span className="min-w-0 whitespace-normal break-words">{label}</span> : null}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
