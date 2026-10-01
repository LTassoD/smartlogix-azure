import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ORDER_STATUS_DESCRIPTIONS,
  getOrderStatusLabel,
  orderStatusToBadgeVariant,
  type OrderStatus
} from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrderStatusBadgeProps = {
  status: OrderStatus;
};

const variantClasses = {
  warning: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  success: "bg-green-50 text-green-700 ring-green-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/20"
} as const;

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const label = getOrderStatusLabel(status);
  const variant = orderStatusToBadgeVariant(status);
  const description = ORDER_STATUS_DESCRIPTIONS[status];

  const badge = (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors duration-200", variantClasses[variant])}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}
