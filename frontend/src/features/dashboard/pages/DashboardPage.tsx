import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  RadioTower,
  RefreshCw,
  Settings,
  Truck,
  Warehouse
} from "lucide-react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { FormMessage } from "@/components/ui/FormMessage";
import { InfoCard } from "@/components/ui/InfoCard";
import { ServiceStatusBanner } from "@/components/ui/ServiceStatusBanner";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { PageKey } from "@/features/auth/permissions/permissions";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import { getCarrierStatus } from "@/features/carriers/types/carrierTypes";
import type { Shipment } from "@/features/carriers/types/carrierTypes";
import type { InventoryItem } from "@/features/inventory/types/inventoryTypes";
import type { Order } from "@/features/orders/types/orderTypes";
import { getOrderStatusLabel } from "@/features/orders/types/orderTypes";
import { getShipmentStatusLabel } from "@/features/shipments/types/shipmentTypes";
import { getShipmentCustomerDisplayName } from "@/features/shipments/utils/shipmentCustomer";
import { reportChartEmptyMessage, reportChartToneColors } from "@/features/reports/components/reportChartUtils";
import { useReports } from "@/features/reports/hooks/useReports";
import type { ReportChartDatum, ReportsData } from "@/features/reports/types/reportTypes";
import type { WarehouseMovement } from "@/features/warehouses/types/warehouseTypes";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import type { HealthCheckResponse } from "@/lib/api/apiTypes";
import { getServiceMessage, getServiceStatusLabel, getStatusTone, getSystemStatusLabel } from "@/lib/system/systemHealth";

type ChartDatum = {
  label: string;
  value: number;
  fill?: string;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  date: string | null;
  tone: "blue" | "cyan" | "green" | "yellow" | "red" | "slate";
};

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "danger" | "info";
};

const chartConfig = {
  value: {
    label: "Registros",
    color: "#2563eb"
  }
} satisfies ChartConfig;

const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit"
});

export function DashboardPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const reports = useReports();
  const { health, loading: statusLoading, refresh: refreshStatus } = useBackendStatus();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshing = reports.refreshing || statusLoading;
  const initialLoading = reports.initialLoading;

  useEffect(() => {
    if (!reports.initialLoading && !reports.refreshing && !reports.error) {
      setLastUpdated(new Date());
    }
  }, [reports.error, reports.initialLoading, reports.refreshing]);

  const metricCards = useMemo(() => buildMetrics(reports.data, reports.filteredSource.orders, permissions.canViewPage), [
    permissions.canViewPage,
    reports.data,
    reports.filteredSource.orders
  ]);
  const ordersStatusData = useMemo(() => toChartData(reports.data.orders.ordersByStatus), [reports.data.orders.ordersByStatus]);
  const shipmentsStatusData = useMemo(() => toChartData(reports.data.shipments.shipmentsByStatus), [reports.data.shipments.shipmentsByStatus]);
  const ordersTrendData = useMemo(() => buildOrdersTrend(reports.filteredSource.orders), [reports.filteredSource.orders]);
  const shipmentsByCarrierData = useMemo(() => toChartData(reports.data.carriers.shipmentsByCarrier), [reports.data.carriers.shipmentsByCarrier]);
  const stockByWarehouseData = useMemo(() => toChartData(reports.data.warehouses.stockByWarehouse), [reports.data.warehouses.stockByWarehouse]);
  const activityItems = useMemo(() => buildActivityItems(reports.data, permissions.canViewPage), [permissions.canViewPage, reports.data]);
  const alertItems = useMemo(() => buildAlertItems(reports.filteredSource, reports.data, permissions.canViewPage), [
    permissions.canViewPage,
    reports.data,
    reports.filteredSource
  ]);

  async function handleRefresh() {
    await Promise.all([reports.refresh(), refreshStatus()]);
  }

  return (
    <div className="space-y-6">
      <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Panel operacional</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Dashboard operacional</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Vista ejecutiva de inventario, pedidos, envíos, transportistas y alertas relevantes.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Última actualización: <span className="font-semibold text-slate-700">{formatLastUpdated(lastUpdated)}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <RadioTower className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <StatusBadge
                  label={statusLoading ? "Verificando" : getSystemStatusLabel(health?.status)}
                  tone={statusLoading ? "neutral" : getStatusTone(health?.status)}
                />
              </div>
            </div>

            <Button type="button" variant="secondary" onClick={() => void handleRefresh()} disabled={refreshing}>
              {refreshing ? <Spinner size="sm" label="Actualizando dashboard" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              {refreshing ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </div>
      </section>

      {reports.referenceError && !reports.error ? (
        <FormMessage tone="info">Parte de la informacion de apoyo no esta disponible. Reintenta la actualizacion cuando los servicios vuelvan a operar.</FormMessage>
      ) : null}

      <ServiceStatusBanner
        health={health}
        serviceKeys={["identity", "inventory", "orders", "shipping"]}
        loading={refreshing}
        onRetry={() => void handleRefresh()}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {initialLoading ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <CardSkeleton count={Math.max(metricCards.length, 4)} columns={4} />
          </div>
        ) : metricCards.length > 0 ? (
          metricCards.map((card) => (
            <InfoCard
              key={card.title}
              title={card.title}
              value={formatMetric(card.value)}
              supportingText={card.supportingText}
              icon={<card.icon className="h-5 w-5" aria-hidden="true" />}
            />
          ))
        ) : (
          <EmptyPanel className="sm:col-span-2 xl:col-span-4">No hay módulos disponibles para tu perfil.</EmptyPanel>
        )}
      </section>

      {initialLoading ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </section>
      ) : reports.error ? (
        <FormMessage tone="error" title="No fue posible cargar el dashboard">
          Reintenta la actualización para consultar los indicadores.
        </FormMessage>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {permissions.canViewPage("orders") ? (
            <DashboardChartCard title="Pedidos por estado" description="Distribucion actual del flujo de pedidos." empty={ordersStatusData.length === 0}>
              <DonutChart data={ordersStatusData} />
            </DashboardChartCard>
          ) : null}

          {permissions.canViewPage("shipments") ? (
            <DashboardChartCard title="Envíos por estado" description="Seguimiento de despachos según estado." empty={shipmentsStatusData.length === 0}>
              <VerticalBarChart data={shipmentsStatusData} />
            </DashboardChartCard>
          ) : null}

          {permissions.canViewPage("orders") ? (
            <DashboardChartCard title="Evolución de pedidos" description="Pedidos creados por fecha." empty={ordersTrendData.length === 0}>
              <OrdersTrendChart data={ordersTrendData} />
            </DashboardChartCard>
          ) : null}

          {permissions.canViewPage("carriers") && permissions.canViewPage("shipments") ? (
            <DashboardChartCard
              title="Envíos por transportista"
              description="Despachos asignados por proveedor."
              empty={shipmentsByCarrierData.length === 0}
            >
              <VerticalBarChart data={shipmentsByCarrierData} />
            </DashboardChartCard>
          ) : null}

          {permissions.canViewPage("warehouses") && permissions.canViewPage("inventory") ? (
            <DashboardChartCard title="Stock por bodega" description="Unidades disponibles por ubicación." empty={stockByWarehouseData.length === 0}>
              <VerticalBarChart data={stockByWarehouseData} />
            </DashboardChartCard>
          ) : null}

          {permissions.canViewPage("inventory") ? <CriticalProductsCard products={reports.data.inventory.criticalProducts} /> : null}
        </section>
      )}

      {!initialLoading && !reports.error ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <ActivityCard items={activityItems} />
          <div className="space-y-5">
            <SystemStatusCard health={health} loading={statusLoading} />
            <AlertsCard items={alertItems} />
            <QuickAccessCard canViewPage={permissions.canViewPage} role={user?.role ?? null} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DonutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
      <ChartContainer config={chartConfig} className="h-72 min-h-[18rem]">
        <RechartsPieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent config={chartConfig} hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={66} outerRadius={98} paddingAngle={2} strokeWidth={3}>
            {data.map((item) => (
              <Cell key={item.label} fill={item.fill ?? chartConfig.value.color} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ChartContainer>
      <div className="space-y-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{total.toLocaleString("es-CL")}</p>
        </div>
        {data.slice(0, 5).map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill ?? chartConfig.value.color }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-semibold text-slate-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardChartCard({ children, description, empty, title }: { children: ReactNode; description: string; empty: boolean; title: string }) {
  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="mt-5 min-w-0">{empty ? <EmptyPanel>{reportChartEmptyMessage}</EmptyPanel> : children}</div>
    </section>
  );
}

function VerticalBarChart({ data }: { data: ChartDatum[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-72 min-h-[18rem]">
      <RechartsBarChart accessibilityLayer data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 12 }} tickFormatter={truncateLabel} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={34} />
        <ChartTooltip content={<ChartTooltipContent config={chartConfig} />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={32}>
          {data.map((item) => (
            <Cell key={item.label} fill={item.fill ?? chartConfig.value.color} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ChartContainer>
  );
}

function OrdersTrendChart({ data }: { data: ChartDatum[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-72 min-h-[18rem]">
      <RechartsAreaChart accessibilityLayer data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="ordersTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={34} />
        <ChartTooltip content={<ChartTooltipContent config={chartConfig} />} cursor={{ stroke: "#cbd5e1" }} />
        <Area dataKey="value" type="monotone" stroke="#2563eb" strokeWidth={2} fill="url(#ordersTrendFill)" />
      </RechartsAreaChart>
    </ChartContainer>
  );
}

function CriticalProductsCard({ products }: { products: InventoryItem[] }) {
  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Productos críticos</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Productos con stock bajo o sin stock.</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
      </div>

      {products.length === 0 ? (
        <div className="mt-5">
          <EmptyPanel>Sin información disponible</EmptyPanel>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {products.slice(0, 6).map((product) => (
                <tr key={product.productId} className="transition-colors duration-150 hover:bg-slate-50/90">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{product.totalQuantity.toLocaleString("es-CL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Actividad reciente</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Últimos movimientos operacionales disponibles.</p>
        </div>
        <Activity className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>

      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyPanel>Sin información disponible</EmptyPanel>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: reportChartToneColors[item.tone] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 truncate text-sm text-slate-500">{item.detail}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-400">{formatDateTime(item.date)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AlertsCard({ items }: { items: AlertItem[] }) {
  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Alertas operacionales</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Puntos que requieren seguimiento.</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
      </div>

      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyPanel>Sin alertas activas.</EmptyPanel>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <StatusBadge label={getAlertLabel(item.tone)} tone={item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : "neutral"} />
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SystemStatusCard({ health, loading }: { health: HealthCheckResponse | null; loading: boolean }) {
  const services = health?.services ?? [];

  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Estado de servicios</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Disponibilidad actual de SmartLogix.</p>
        </div>
        {loading ? <Spinner size="sm" label="Verificando servicios" /> : <RadioTower className="h-5 w-5 text-slate-400" aria-hidden="true" />}
      </div>

      {services.length === 0 ? (
        <div className="mt-5">
          <EmptyPanel>Sin informacion disponible</EmptyPanel>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {services.map((service) => (
            <div key={service.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">{service.name}</p>
                <StatusBadge label={getServiceStatusLabel(service.status)} tone={getStatusTone(service.status)} />
              </div>
              <p className="mt-1 break-words text-sm leading-6 text-slate-600">{getServiceMessage(service)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickAccessCard({ canViewPage, role }: { canViewPage: (page: PageKey) => boolean; role: string | null }) {
  const links = [
    { label: "Ver inventario", href: "/inventario", page: "inventory", icon: Boxes },
    { label: "Ver pedidos", href: "/pedidos", page: "orders", icon: ClipboardList },
    { label: "Ver envíos", href: "/envios", page: "shipments", icon: Truck },
    { label: "Ver reportes", href: "/reportes", page: "reports", icon: BarChart3 },
    { label: "Configuración", href: "/configuracion", page: "settings", icon: Settings }
  ] satisfies Array<{ label: string; href: string; page: PageKey; icon: typeof Boxes }>;
  const visibleLinks = links.filter((item) => canViewPage(item.page));

  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div>
        <h3 className="text-base font-semibold text-slate-950">Accesos rápidos</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{role ? `Opciones disponibles para ${getRoleLabel(role)}.` : "Opciones disponibles."}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {visibleLinks.map((item) => (
          <Button key={item.href} as={Link} to={item.href} variant="secondary" className="justify-start">
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

function EmptyPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 ${className ?? ""}`}>{children}</div>;
}

function buildMetrics(data: ReportsData, orders: Order[], canViewPage: (page: PageKey) => boolean) {
  return [
    {
      title: "Productos registrados",
      value: data.summary.productsRegistered,
      supportingText: "Catálogo disponible.",
      icon: Boxes,
      visible: canViewPage("inventory")
    },
    {
      title: "Stock disponible",
      value: data.inventory.totalStock,
      supportingText: "Unidades registradas.",
      icon: PackageCheck,
      visible: canViewPage("inventory")
    },
    {
      title: "Stock bajo",
      value: data.inventory.lowStockProducts.length,
      supportingText: "Productos bajo mínimo.",
      icon: AlertTriangle,
      visible: canViewPage("inventory")
    },
    {
      title: "Pedidos pendientes",
      value: data.orders.pendingOrders,
      supportingText: "Requieren gestión.",
      icon: Clock3,
      visible: canViewPage("orders")
    },
    {
      title: "Pedidos en preparación",
      value: orders.filter((order) => order.status === "PREPARING").length,
      supportingText: "Preparación en curso.",
      icon: ClipboardList,
      visible: canViewPage("orders")
    },
    {
      title: "Envíos en tránsito",
      value: data.shipments.inTransitShipments,
      supportingText: "Despachos en ruta.",
      icon: RadioTower,
      visible: canViewPage("shipments")
    },
    {
      title: "Envíos entregados",
      value: data.shipments.deliveredShipments,
      supportingText: "Entregas completadas.",
      icon: CheckCircle2,
      visible: canViewPage("shipments")
    },
    {
      title: "Transportistas activos",
      value: data.carriers.activeCarriers,
      supportingText: "Proveedores habilitados.",
      icon: Truck,
      visible: canViewPage("carriers")
    },
    {
      title: "Bodegas activas",
      value: data.warehouses.activeWarehouses,
      supportingText: "Ubicaciones operativas.",
      icon: Warehouse,
      visible: canViewPage("warehouses")
    },
    {
      title: "Incidencias",
      value: data.summary.incidents,
      supportingText: "Envíos cancelados o fallidos.",
      icon: AlertTriangle,
      visible: canViewPage("shipments")
    }
  ].filter((item) => item.visible);
}

function toChartData(data: ReportChartDatum[]): ChartDatum[] {
  return data
    .filter((item) => item.value > 0)
    .slice(0, 8)
    .map((item) => ({
      label: item.label,
      value: item.value,
      fill: reportChartToneColors[item.tone ?? "blue"]
    }));
}

function buildOrdersTrend(orders: Order[]): ChartDatum[] {
  const counts = new Map<string, number>();
  orders.forEach((order) => {
    const dateKey = getDateKey(order.createdAt);
    if (dateKey) {
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-7)
    .map(([date, value]) => ({
      label: formatDateLabel(date),
      value,
      fill: "#2563eb"
    }));
}

function buildActivityItems(data: ReportsData, canViewPage: (page: PageKey) => boolean): ActivityItem[] {
  const items: ActivityItem[] = [];

  if (canViewPage("orders")) {
    data.orders.latestOrders.forEach((order) => {
      items.push({
        id: `order-${order.id}`,
        title: order.orderNumber,
        detail: `${order.customer.fullName} · ${getOrderStatusLabel(order.status)}`,
        date: order.createdAt,
        tone: "blue"
      });
    });
  }

  if (canViewPage("shipments")) {
    data.shipments.latestShipments.forEach((shipment: Shipment) => {
      items.push({
        id: `shipment-${shipment.id}`,
        title: shipment.shipmentNumber,
        detail: `${getShipmentCustomerDisplayName(shipment)} · ${getShipmentStatusLabel(shipment.status)}`,
        date: shipment.createdAt,
        tone: "cyan"
      });
    });
  }

  if (canViewPage("warehouses")) {
    data.warehouses.movements.forEach((movement: WarehouseMovement) => {
      items.push({
        id: `movement-${movement.id}`,
        title: movement.productName,
        detail: `${movement.warehouseName} · ${getMovementLabel(movement.type)}`,
        date: movement.createdAt,
        tone: "green"
      });
    });
  }

  return items.sort((first, second) => Date.parse(second.date ?? "") - Date.parse(first.date ?? "")).slice(0, 8);
}

function buildAlertItems(
  source: ReturnType<typeof useReports>["filteredSource"],
  data: ReportsData,
  canViewPage: (page: PageKey) => boolean
): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (canViewPage("inventory")) {
    data.inventory.outOfStockProducts.slice(0, 3).forEach((product) => {
      alerts.push({
        id: `out-${product.productId}`,
        title: product.name,
        detail: "Producto sin stock disponible.",
        tone: "danger"
      });
    });

    data.inventory.lowStockProducts.slice(0, 3).forEach((product) => {
      alerts.push({
        id: `low-${product.productId}`,
        title: product.name,
        detail: "Producto bajo el mínimo definido.",
        tone: "warning"
      });
    });
  }

  if (canViewPage("shipments")) {
    source.shipments
      .filter((shipment) => shipment.status === "FAILED" || shipment.status === "CANCELLED")
      .slice(0, 3)
      .forEach((shipment) => {
        alerts.push({
          id: `shipment-alert-${shipment.id}`,
          title: shipment.shipmentNumber,
          detail: `${getShipmentCustomerDisplayName(shipment)} · ${getShipmentStatusLabel(shipment.status)}`,
          tone: "danger"
        });
      });
  }

  if (canViewPage("orders")) {
    source.orders
      .filter((order) => order.status === "CREATED")
      .slice(0, 3)
      .forEach((order) => {
        alerts.push({
          id: `pending-order-${order.id}`,
          title: order.orderNumber,
          detail: "Pedido pendiente de gestión.",
          tone: "info"
        });
      });
  }

  if (canViewPage("carriers")) {
    source.carriers
      .filter((carrier) => getCarrierStatus(carrier) === "UNAVAILABLE")
      .slice(0, 3)
      .forEach((carrier) => {
        alerts.push({
          id: `carrier-${carrier.id}`,
          title: carrier.name,
          detail: "Transportista no disponible.",
          tone: "warning"
        });
      });
  }

  return alerts.slice(0, 8);
}

function getDateKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function formatDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : dateTimeFormatter.format(date);
}

function formatLastUpdated(value: Date | null): string {
  return value ? dateTimeFormatter.format(value) : "Pendiente";
}

function formatMetric(value: number): string {
  return value === 0 ? "Sin registros" : value.toLocaleString("es-CL");
}

function truncateLabel(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 11)}...`;
}

function getMovementLabel(type: WarehouseMovement["type"]): string {
  if (type === "IN") {
    return "Ingreso";
  }

  if (type === "OUT" || type === "ORDER_OUT") {
    return "Salida";
  }

  return "Ajuste";
}

function getAlertLabel(tone: AlertItem["tone"]): string {
  if (tone === "danger") {
    return "Prioridad";
  }

  if (tone === "warning") {
    return "Atención";
  }

  return "Seguimiento";
}

function getRoleLabel(role: string): string {
  if (role === "ADMIN") {
    return "Administrador";
  }

  if (role === "OPERATOR") {
    return "Operador";
  }

  return "Visualizador";
}
