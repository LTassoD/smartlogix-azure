import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, QrCode, ShieldCheck, ShieldOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/toastContext";
import { authApi } from "@/features/auth/api/authApi";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";
import type { TwoFactorSetupResponse } from "@/lib/api/apiTypes";

type TwoFactorSettingsCardProps = {
  initialEnabled?: boolean;
  onStatusChange?: (enabled: boolean) => void;
};

export function TwoFactorSettingsCard({ initialEnabled, onStatusChange }: TwoFactorSettingsCardProps) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(initialEnabled ?? false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [setupCodeError, setSetupCodeError] = useState<string | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.getTwoFactorStatus();
      setEnabled(response.enabled);
      onStatusChange?.(response.enabled);
    } catch (statusError) {
      setError(getSafeErrorMessage(statusError));
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function startSetup() {
    setSaving(true);
    setError(null);

    try {
      const response = await authApi.setupTwoFactor();
      setSetup(response);
      setSetupCode("");
      setSetupCodeError(null);
    } catch (setupError) {
      setError(getSafeErrorMessage(setupError));
    } finally {
      setSaving(false);
    }
  }

  async function verifySetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(setupCode)) {
      setSetupCodeError("Ingresa un codigo de 6 digitos.");
      return;
    }

    setSaving(true);
    setSetupCodeError(null);

    try {
      const response = await authApi.verifyTwoFactorSetup({ code: setupCode });
      setEnabled(response.enabled);
      onStatusChange?.(response.enabled);
      setSetup(null);
      setSetupCode("");
      setSetupCodeError(null);
      toast.success("Autenticacion de dos factores activada correctamente.");
    } catch (verificationError) {
      setSetupCodeError(getSafeErrorMessage(verificationError));
    } finally {
      setSaving(false);
    }
  }

  async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPassword) {
      setDisableError("Ingresa tu contrasena actual.");
      return;
    }

    setSaving(true);
    setDisableError(null);

    try {
      const response = await authApi.disableTwoFactor({ currentPassword });
      setEnabled(response.enabled);
      onStatusChange?.(response.enabled);
      setDisableOpen(false);
      setCurrentPassword("");
      setDisableError(null);
      toast.success("Autenticacion de dos factores desactivada.");
    } catch (disableRequestError) {
      setDisableError(getSafeErrorMessage(disableRequestError));
    } finally {
      setSaving(false);
    }
  }

  function closeSetup() {
    if (saving) {
      return;
    }

    setSetup(null);
    setSetupCode("");
    setSetupCodeError(null);
  }

  function openDisable() {
    setCurrentPassword("");
    setDisableError(null);
    setDisableOpen(true);
  }

  function closeDisable() {
    if (saving) {
      return;
    }

    setDisableOpen(false);
    setCurrentPassword("");
    setDisableError(null);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="two-factor-settings-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-slate-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p id="two-factor-settings-title" className="text-sm font-semibold text-slate-950">
                Autenticacion de dos factores
              </p>
              {!loading ? <StatusBadge label={enabled ? "Activada" : "Desactivada"} tone={enabled ? "success" : "neutral"} /> : null}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Protege tu cuenta con codigos temporales de Google Authenticator, Microsoft Authenticator, Authy u otra aplicacion TOTP.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {loading ? (
            <Button type="button" variant="secondary" disabled>
              <Spinner size="sm" label="Consultando estado 2FA" />
              Consultando...
            </Button>
          ) : enabled ? (
            <Button type="button" variant="secondary" onClick={openDisable}>
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
              Desactivar 2FA
            </Button>
          ) : (
            <Button type="button" onClick={() => void startSetup()} disabled={saving}>
              {saving ? <Spinner size="sm" label="Preparando 2FA" className="text-current" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Preparando..." : "Activar 2FA"}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <FormMessage tone="error" className="mt-4" title="No fue posible consultar la configuracion 2FA">
          {error}
        </FormMessage>
      ) : null}

      <Modal
        open={Boolean(setup)}
        onClose={closeSetup}
        title="Configurar autenticacion de dos factores"
        subtitle="Escanea el codigo QR y confirma la configuracion con el primer codigo generado."
        size="md"
        closeDisabled={saving}
        closeOnOverlayClick={!saving}
      >
        {setup ? (
          <form className="space-y-5" onSubmit={(event) => void verifySetup(event)} noValidate>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>Abre tu aplicacion Authenticator.</li>
              <li>Escanea este codigo QR.</li>
              <li>Ingresa abajo el codigo de 6 digitos para terminar la activacion.</li>
            </ol>

            <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-5" aria-label="Codigo QR para configurar 2FA">
              <QRCodeSVG
                value={setup.otpauthUri}
                size={220}
                level="M"
                marginSize={2}
                title="Codigo QR para configurar la aplicacion Authenticator"
              />
            </div>

            <FormMessage tone="info">
              Por seguridad, este QR se muestra solo durante la configuracion y expira en aproximadamente {formatDuration(setup.expiresInSeconds)}.
            </FormMessage>

            <TextInput
              label="Codigo de autenticacion"
              name="two-factor-setup-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={setupCode}
              error={setupCodeError ?? undefined}
              leadingIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
              onChange={(event) => {
                setSetupCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setSetupCodeError(null);
              }}
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeSetup} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || setupCode.length !== 6}>
                {saving ? <Spinner size="sm" label="Confirmando 2FA" className="text-current" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Confirmando..." : "Confirmar activacion"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={disableOpen}
        onClose={closeDisable}
        title="Desactivar autenticacion de dos factores"
        subtitle="Confirma tu contrasena actual antes de retirar esta proteccion."
        size="sm"
        closeDisabled={saving}
        closeOnOverlayClick={!saving}
      >
        <form className="space-y-4" onSubmit={(event) => void disableTwoFactor(event)} noValidate>
          <FormMessage tone="info">
            Despues de desactivar 2FA, tu cuenta volvera a depender solamente de la contrasena.
          </FormMessage>
          <TextInput
            label="Contrasena actual"
            name="two-factor-disable-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={currentPassword}
            error={disableError ?? undefined}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setDisableError(null);
            }}
            required
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeDisable} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={saving || !currentPassword}>
              {saving ? <Spinner size="sm" label="Desactivando 2FA" className="text-current" /> : <ShieldOff className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Desactivando..." : "Desactivar 2FA"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}
