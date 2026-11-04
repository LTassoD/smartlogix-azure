export type ProductStat = {
  productName: string;
  units: number;
  revenue: number;
};

/** Espejo de MetricsSnapshot de analytics-service (GET /api/analytics/metrics). */
export type MetricsSnapshot = {
  generatedAt: string;
  windowSeconds: number;
  totalEvents: number;
  totalRevenue: number;
  eventsPerSecond: number;
  ordersInWindow: number;
  revenueInWindow: number;
  averageTicket: number;
  topProducts: ProductStat[];
  eventsByPartition: Record<string, number>;
};

export type StreamStatus = "connecting" | "live" | "reconnecting";
