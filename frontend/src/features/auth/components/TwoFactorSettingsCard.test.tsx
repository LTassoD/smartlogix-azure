import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { authApi } from "@/features/auth/api/authApi";
import { TwoFactorSettingsCard } from "@/features/auth/components/TwoFactorSettingsCard";

vi.mock("@/features/auth/api/authApi", () => ({
  authApi: {
    getTwoFactorStatus: vi.fn(),
    setupTwoFactor: vi.fn(),
    verifyTwoFactorSetup: vi.fn(),
    disableTwoFactor: vi.fn()
  }
}));

describe("TwoFactorSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a setup QR and enables 2FA only after verifying six digits", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.getTwoFactorStatus).mockResolvedValue({ enabled: false });
    vi.mocked(authApi.setupTwoFactor).mockResolvedValue({
      otpauthUri: "otpauth://totp/SmartLogix:user%40smartlogix.cl?secret=TESTSECRET&issuer=SmartLogix",
      expiresInSeconds: 600
    });
    vi.mocked(authApi.verifyTwoFactorSetup).mockResolvedValue({ enabled: true });

    renderCard();

    await user.click(await screen.findByRole("button", { name: /activar 2fa/i }));

    expect(await screen.findByTitle(/codigo qr para configurar/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/codigo de autenticacion/i), "12ab3456");
    expect(screen.getByLabelText(/codigo de autenticacion/i)).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: /confirmar activacion/i }));

    expect(authApi.verifyTwoFactorSetup).toHaveBeenCalledWith({ code: "123456" });
    expect(await screen.findByText("Activada")).toBeInTheDocument();
  });

  it("requires the current password to disable 2FA", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.getTwoFactorStatus).mockResolvedValue({ enabled: true });
    vi.mocked(authApi.disableTwoFactor).mockResolvedValue({ enabled: false });

    renderCard();

    await user.click(await screen.findByRole("button", { name: /desactivar 2fa/i }));
    const dialog = await screen.findByRole("dialog", { name: /desactivar autenticacion/i });
    await user.type(within(dialog).getByLabelText(/contrasena actual/i), "Secure123");
    await user.click(within(dialog).getByRole("button", { name: /^desactivar 2fa$/i }));

    expect(authApi.disableTwoFactor).toHaveBeenCalledWith({ currentPassword: "Secure123" });
    expect(await screen.findByText("Desactivada")).toBeInTheDocument();
  });
});

function renderCard() {
  return render(
    <ToastProvider>
      <TwoFactorSettingsCard />
    </ToastProvider>
  );
}
