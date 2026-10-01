import { CheckCircle2, Circle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getOrderStatusLabel,
  type Order,
  type OrderStatus,
  type OrderTimelineEvent
} from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrderTimelineProps = {
  order: Order | null;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function OrderTimeline({ order }: OrderTimelineProps) {
  if (!order) {
    return null;
  }

  const events = order.history.length > 0 ? order.history : buildBasicTimeline(order);

  if (events.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">Sin movimientos registrados.</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <TimelineItem key={`${event.id}-${event.newStatus}-${event.createdAt}`} event={event} isLast={index === events.length - 1} />
      ))}
    </div>
  );
}

function TimelineItem({ event, isLast }: { event: OrderTimelineEvent; isLast: boolean }) {
  return (
    <div className="relative flex gap-3">
      {!isLast ? <div className="absolute left-[18px] top-9 h-[calc(100%-1rem)] w-px bg-slate-200" /> : null}
      <div
        className={cn(
          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
          isLast ? "bg-blue-50 text-blue-700 ring-blue-600/20" : "bg-white text-slate-400 ring-slate-200"
        )}
      >
        {isLast ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-3 w-3 fill-current" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="truncate text-sm font-semibold text-slate-950">{event.title}</p>
              </TooltipTrigger>
              <TooltipContent>{event.title}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{event.description}</p>
              </TooltipTrigger>
              <TooltipContent>{event.description}</TooltipContent>
            </Tooltip>
          </div>
          <p className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-500">{formatDate(event.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

function buildBasicTimeline(order: Order): OrderTimelineEvent[] {
  const createdEvent: OrderTimelineEvent = {
    id: -1,
    previousStatus: null,
    newStatus: "CREATED",
    title: "Pedido creado",
    description: "Pedido registrado.",
    comment: "Pedido registrado.",
    createdAt: order.createdAt
  };

  if (order.status === "CREATED") {
    return [createdEvent];
  }

  return [
    createdEvent,
    {
      id: -2,
      previousStatus: "CREATED",
      newStatus: order.status,
      title: getOrderStatusLabel(order.status),
      description: getBasicDescription(order.status),
      comment: getBasicDescription(order.status),
      createdAt: order.updatedAt
    }
  ];
}

function getBasicDescription(status: OrderStatus): string {
  if (status === "CANCELLED") {
    return "Pedido cancelado.";
  }

  if (status === "DELIVERED") {
    return "Pedido entregado.";
  }

  return "Pedido actualizado.";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No informado";
  }

  return dateFormatter.format(date);
}
