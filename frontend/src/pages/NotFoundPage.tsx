import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-panel">
        <p className="text-sm font-semibold uppercase text-brand-700">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">Pagina no encontrada</h1>
        <p className="mt-3 text-sm text-slate-600">La ruta solicitada no existe en SmartLogix.</p>
        <Button as={Link} to="/dashboard" className="mt-6">
          Volver al dashboard
        </Button>
      </section>
    </main>
  );
}
