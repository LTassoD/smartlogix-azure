import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ACCESS_RESTRICTED_MESSAGE } from "@/features/auth/permissions/permissions";

export function AccessRestrictedPage() {
  return (
    <section className="flex min-h-[420px] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-panel">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">Acceso restringido</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{ACCESS_RESTRICTED_MESSAGE}</p>
        <Button as={Link} to="/dashboard" className="mt-6">
          Volver al dashboard
        </Button>
      </div>
    </section>
  );
}
