import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/page-loader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import { AccessRestrictedPage } from "@/features/auth/pages/AccessRestrictedPage";
import type { Permission } from "@/features/auth/permissions/permissions";

type ProtectedRouteProps = PropsWithChildren<{
  permission?: Permission | readonly Permission[];
  match?: "all" | "any";
}>;

export function ProtectedRoute({ children, match = "all", permission }: ProtectedRouteProps) {
  const location = useLocation();
  const { authUnavailable, checkSession, checkingSession, error, hasStoredToken, isAuthenticated } = useAuth();
  const { can, canAll, canAny } = usePermissions();

  if (checkingSession) {
    return <PageLoader label="Verificando sesion..." description="Confirmando tu acceso al panel." />;
  }

  if (authUnavailable && hasStoredToken) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase text-yellow-800">Sesion pendiente de validar</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">No fue posible contactar el sistema</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-700">
          {error ?? "La sesion no pudo validarse. Reintenta cuando el sistema este disponible."}
        </p>
        <div className="mt-5">
          <Button type="button" variant="secondary" onClick={() => void checkSession()}>
            Reintentar validacion
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    const allowed = permissions.length === 1 ? can(permissions[0]) : match === "any" ? canAny(permissions) : canAll(permissions);

    if (!allowed) {
      return <AccessRestrictedPage />;
    }
  }

  return <>{children}</>;
}
