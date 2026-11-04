import { Activity, Clock3, PackageCheck, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMetricsStream } from "@/features/streaming/hooks/useMetricsStream";
import type { MetricsSnapshot, StreamStatus } from "@/features/streaming/types";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

const STATUS_LABEL: Record<StreamStatus, string> = {
  connecting: "Conectando",
  live: "En vivo",
  reconnecting: "Reconectando"
};

const STATUS_CLASS: Record<StreamStatus, string> = {
  connecting: "bg-slate-100 text-slate-600",
  live: "bg-emerald-100 text-emerald-700",
  reconnecting: "bg-amber-100 text-amber-700"
};

export function StreamingPage() {
  const { snapshot, status } = useMetricsStream();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analítica en tiempo real</h1>
          <p className="text-sm text-slate-500">
            Pedidos confirmados que llegan por Kafka, agregados en una ventana de{" "}
            {snapshot?.windowSeconds ?? 60} segundos.
          </p>
        </div>
        <span
          role="status"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASS[status]}`}
        >
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </header>

      {snapshot === null ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Esperando métricas del servicio de analítica…
        </p>
      ) : (
        <Content snapshot={snapshot} />
      )}
    </div>
  );
}

function Content({ snapshot }: { snapshot: MetricsSnapshot }) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<PackageCheck className="h-5 w-5" />} label="Pedidos en ventana" value={snapshot.ordersInWindow.toString()} />
        <MetricCard icon={<Wallet className="h-5 w-5" />} label="Ingreso en ventana" value={clp.format(snapshot.revenueInWindow)} />
        <MetricCard icon={<Clock3 className="h-5 w-5" />} label="Ticket promedio" value={clp.format(snapshot.averageTicket)} />
        <MetricCard icon={<Activity className="h-5 w-5" />} label="Velocidad" value={`${snapshot.eventsPerSecond.toFixed(1).replace(".", ",")} /s`} />
      </section>

      <p className="text-sm text-slate-500">
        Desde que arrancó el servicio: {snapshot.totalEvents} pedidos por {clp.format(snapshot.totalRevenue)}.
      </p>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Top 5 productos (unidades)</h2>
          {snapshot.topProducts.length === 0 ? (
            <p className="text-sm text-slate-500">Sin ventas en la ventana actual.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.topProducts} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="productName" width={160} />
                  <Tooltip formatter={(value) => [`${value} u`, "Unidades"]} />
                  <Bar dataKey="units" fill="#0f766e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Eventos por partición</h2>
          <PartitionBars counts={snapshot.eventsByPartition} />
        </div>
      </section>
    </>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PartitionBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort(([a], [b]) => Number(a) - Number(b));
  const max = Math.max(1, ...entries.map(([, count]) => count));

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">Aún no llegan eventos.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map(([partition, count]) => (
        <li key={partition}>
          <div className="mb-1 flex justify-between text-sm text-slate-600">
            <span>Partición {partition}</span>
            <span>{count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-teal-700" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
