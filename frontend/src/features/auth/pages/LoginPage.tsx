import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Boxes, ClipboardList, KeyRound, LockKeyhole, Mail, ShieldCheck, Truck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/page-loader";
import { Spinner } from "@/components/ui/spinner";
import { TextInput } from "@/components/ui/TextInput";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormState, string>>;

type TwoFactorChallenge = {
  temporaryToken: string;
  expiresIn: number;
};

const safeReturnPaths = new Set([
  "/dashboard",
  "/inventario",
  "/pedidos",
  "/envios",
  "/transportistas",
  "/bodegas",
  "/reportes",
  "/configuracion"
]);

const accessItems = [
  { label: "Inventario", icon: Boxes },
  { label: "Pedidos", icon: ClipboardList },
  { label: "Despachos", icon: Truck },
  { label: "Reportes", icon: BarChart3 }
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkingSession, login, verifyTwoFactor, isAuthenticated, loading, error, clearError } = useAuth();
  const [form, setForm] = useState<LoginFormState>({ email: "", password: "" });
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const from = requestedPath && safeReturnPaths.has(requestedPath) ? requestedPath : "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  if (checkingSession) {
    return <PageLoader label="Verificando sesion..." description="Preparando el acceso al panel." />;
  }

  function validateForm(): LoginFormErrors {
    const errors: LoginFormErrors = {};

    if (!form.email.trim()) {
      errors.email = "Ingresa tu correo.";
    }

    if (!form.password) {
      errors.password = "Ingresa tu contrasena.";
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setSubmitError(null);

    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const outcome = await login({ email: form.email.trim(), password: form.password });

      if (outcome.requiresTwoFactor) {
        setChallenge({ temporaryToken: outcome.temporaryToken, expiresIn: outcome.expiresIn });
        setForm((current) => ({ ...current, password: "" }));
        setCode("");
        setCodeError(null);
        return;
      }

      navigate(from, { replace: true });
    } catch (loginError) {
      setSubmitError(getSafeErrorMessage(loginError));
    }
  }

  async function handleTwoFactorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setSubmitError(null);

    if (!challenge) {
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setCodeError("Ingresa un codigo de 6 digitos.");
      return;
    }

    setCodeError(null);

    try {
      await verifyTwoFactor(challenge.temporaryToken, code);
      setChallenge(null);
      setCode("");
      navigate(from, { replace: true });
    } catch (verificationError) {
      setSubmitError(getSafeErrorMessage(verificationError));
    }
  }

  function cancelTwoFactor() {
    clearError();
    setSubmitError(null);
    setCodeError(null);
    setCode("");
    setChallenge(null);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(135deg,_#0F172A_0%,_#1E293B_52%,_#0B1120_100%)]" />
      <div className="relative grid min-h-screen items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:px-10 xl:px-16">
        <section className="hidden max-w-xl lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/25">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">SmartLogix</p>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">Operaciones</p>
            </div>
          </div>

          <div className="mt-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Gestion operacional</p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold tracking-tight text-white xl:text-5xl">
              Control central para la operacion logistica.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
              Acceso seguro al panel de inventario, pedidos, despachos y reportes.
            </p>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {accessItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur">
                <item.icon className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-100">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[430px] items-center justify-center">
          <div className="w-full">
            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold">SmartLogix</p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white p-6 text-slate-950 shadow-2xl shadow-black/25 sm:p-8">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-brand-700">
                  {challenge ? <KeyRound className="h-5 w-5" aria-hidden="true" /> : <LockKeyhole className="h-5 w-5" aria-hidden="true" />}
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  {challenge ? "Codigo de autenticacion" : "Panel de acceso"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {challenge
                    ? "Ingresa el codigo de 6 digitos generado por tu aplicacion Authenticator."
                    : "Ingresa tus credenciales para continuar."}
                </p>
              </div>

              {challenge ? (
                <form className="mt-6 space-y-4" onSubmit={handleTwoFactorSubmit} noValidate>
                  <TextInput
                    label="Codigo de autenticacion"
                    name="two-factor-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    value={code}
                    error={codeError ?? undefined}
                    helperText={`El desafio expira en aproximadamente ${formatChallengeDuration(challenge.expiresIn)}.`}
                    leadingIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                    onChange={(event) => {
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                      setCodeError(null);
                      setSubmitError(null);
                    }}
                  />

                  {submitError || error ? (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {submitError ?? error}
                    </div>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Spinner size="sm" label="Verificando codigo" className="text-current" /> : null}
                    {loading ? "Verificando..." : "Verificar codigo"}
                    {!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={cancelTwoFactor} disabled={loading}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al inicio de sesion
                  </Button>
                </form>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                  <TextInput
                    label="Correo electronico"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="correo@smartlogix.cl"
                    value={form.email}
                    error={formErrors.email}
                    leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, email: event.target.value }));
                      setFormErrors((current) => ({ ...current, email: undefined }));
                    }}
                  />
                  <TextInput
                    label="Contrasena"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Ingresa tu contrasena"
                    value={form.password}
                    error={formErrors.password}
                    leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, password: event.target.value }));
                      setFormErrors((current) => ({ ...current, password: undefined }));
                    }}
                  />

                  {submitError || error ? (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {submitError ?? error}
                    </div>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Spinner size="sm" label="Validando credenciales" className="text-current" /> : null}
                    {loading ? "Validando..." : "Iniciar sesion"}
                    {!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatChallengeDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}
