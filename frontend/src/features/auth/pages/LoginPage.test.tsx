import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/features/auth/hooks/AuthContext";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import type { AuthUser } from "@/features/auth/types/authTypes";

describe("LoginPage", () => {
  it("submits trimmed credentials and navigates to dashboard", async () => {
    const user = userEvent.setup();
    const loggedUser: AuthUser = {
      id: 1,
      email: "admin@smartlogix.cl",
      fullName: "Admin SmartLogix",
      role: "ADMIN",
      twoFactorEnabled: false,
      active: true
    };
    const login = vi.fn(async () => ({
      requiresTwoFactor: false as const,
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresIn: 3600,
      user: loggedUser
    }));

    render(
      <AuthContext.Provider value={authValue(login)}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard operacional</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await user.type(screen.getByLabelText(/correo electronico/i), " admin@smartlogix.cl ");
    await user.type(screen.getByLabelText(/contrasena/i), "Admin123");
    await user.click(screen.getByRole("button", { name: /iniciar sesion/i }));

    expect(login).toHaveBeenCalledWith({ email: "admin@smartlogix.cl", password: "Admin123" });
    expect(await screen.findByText("Dashboard operacional")).toBeInTheDocument();
  });

  it("requests and verifies a six-digit second factor before navigating", async () => {
    const user = userEvent.setup();
    const loggedUser: AuthUser = {
      id: 2,
      email: "secure@smartlogix.cl",
      fullName: "Usuario Seguro",
      role: "OPERATOR",
      twoFactorEnabled: true,
      active: true
    };
    const login = vi.fn(async () => ({
      requiresTwoFactor: true as const,
      temporaryToken: "temporary-token",
      expiresIn: 300
    }));
    const verifyTwoFactor = vi.fn(async () => loggedUser);

    render(
      <AuthContext.Provider value={authValue(login, verifyTwoFactor)}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard seguro</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await user.type(screen.getByLabelText(/correo electronico/i), "secure@smartlogix.cl");
    await user.type(screen.getByLabelText(/contrasena/i), "Secure123");
    await user.click(screen.getByRole("button", { name: /iniciar sesion/i }));

    expect(await screen.findByRole("heading", { name: /codigo de autenticacion/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/contrasena/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/codigo de autenticacion/i), "12ab3456");
    expect(screen.getByLabelText(/codigo de autenticacion/i)).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: /verificar codigo/i }));

    expect(verifyTwoFactor).toHaveBeenCalledWith("temporary-token", "123456");
    expect(await screen.findByText("Dashboard seguro")).toBeInTheDocument();
  });

  it("does not submit an incomplete authentication code", async () => {
    const user = userEvent.setup();
    const login = vi.fn(async () => ({
      requiresTwoFactor: true as const,
      temporaryToken: "temporary-token",
      expiresIn: 300
    }));
    const verifyTwoFactor = vi.fn();

    render(
      <AuthContext.Provider value={authValue(login, verifyTwoFactor)}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await user.type(screen.getByLabelText(/correo electronico/i), "secure@smartlogix.cl");
    await user.type(screen.getByLabelText(/contrasena/i), "Secure123");
    await user.click(screen.getByRole("button", { name: /iniciar sesion/i }));
    await user.type(await screen.findByLabelText(/codigo de autenticacion/i), "123");
    await user.click(screen.getByRole("button", { name: /verificar codigo/i }));

    expect(screen.getByText("Ingresa un codigo de 6 digitos.")).toBeInTheDocument();
    expect(verifyTwoFactor).not.toHaveBeenCalled();
  });

  it("validates required credentials before submitting", async () => {
    const user = userEvent.setup();
    const login = vi.fn();

    render(
      <AuthContext.Provider value={authValue(login)}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await user.click(screen.getByRole("button", { name: /iniciar sesion/i }));

    expect(screen.getByText("Ingresa tu correo.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contrasena.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});

function authValue(
  login: AuthContextValue["login"],
  verifyTwoFactor: AuthContextValue["verifyTwoFactor"] = vi.fn()
): AuthContextValue {
  return {
    user: null,
    loading: false,
    checkingSession: false,
    error: null,
    status: "anonymous",
    isAuthenticated: false,
    authUnavailable: false,
    hasStoredToken: false,
    login,
    verifyTwoFactor,
    logout: vi.fn(async () => undefined),
    checkSession: vi.fn(async () => undefined),
    clearError: vi.fn()
  };
}
