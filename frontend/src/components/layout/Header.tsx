import { LogOut, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { getStatusTone, getSystemStatusLabel } from "@/lib/system/systemHealth";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard operacional",
    subtitle: "Vista ejecutiva de inventario, pedidos y envios."
  },
  "/inventario": {
    title: "Inventario",
    subtitle: "Productos, stock y movimientos entre bodegas."
  },
  "/pedidos": {
    title: "Pedidos",
    subtitle: "Validacion, estados y trazabilidad comercial."
  },
  "/envios": {
    title: "Envios",
    subtitle: "Despachos, rutas y coordinacion logistica."
  },
  "/transportistas": {
    title: "Transportistas",
    subtitle: "Proveedores, cobertura y disponibilidad."
  },
  "/bodegas": {
    title: "Bodegas",
    subtitle: "Stock distribuido y sincronizacion operacional."
  },
  "/reportes": {
    title: "Reportes",
    subtitle: "Indicadores, seguimiento y alertas."
  },
  "/configuracion": {
    title: "Configuracion",
    subtitle: "Usuarios, roles y preferencias."
  }
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { health, loading } = useBackendStatus();
  const meta = pageMeta[location.pathname] ?? pageMeta["/dashboard"];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">{meta.title}</h1>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">{meta.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge
            label={loading ? "Verificando" : getSystemStatusLabel(health?.status)}
            tone={loading ? "neutral" : getStatusTone(health?.status)}
          />
          {user ? (
            <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-2 pr-4 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-xs font-medium uppercase text-slate-500">{user.role}</p>
              </div>
            </div>
          ) : null}
          {isAuthenticated ? (
            <Button type="button" variant="secondary" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Cerrar sesion
            </Button>
          ) : (
            <Button as={Link} to="/login" variant="primary">
              Iniciar sesion
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
