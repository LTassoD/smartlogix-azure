import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AuthContext, type AuthContextValue } from "@/features/auth/hooks/AuthContext";
import type { AuthRole, AuthUser } from "@/features/auth/types/authTypes";

describe("ProtectedRoute", () => {
  it("redirects anonymous users to login", () => {
    render(
      <AuthProvider role={null}>
        <MemoryRouter initialEntries={["/private"]}>
          <Routes>
            <Route
              path="/private"
              element={
                <ProtectedRoute>
                  <div>Privado</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("allows VIEWER to open account settings", () => {
    render(
      <AuthProvider role="VIEWER">
        <MemoryRouter initialEntries={["/configuracion"]}>
          <ProtectedRoute permission="settings:view">
            <div>Configuracion privada</div>
          </ProtectedRoute>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Configuracion privada")).toBeInTheDocument();
  });

  it("renders protected content when role has permission", () => {
    render(
      <AuthProvider role="ADMIN">
        <MemoryRouter>
          <ProtectedRoute permission="settings:view">
            <div>Configuracion privada</div>
          </ProtectedRoute>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Configuracion privada")).toBeInTheDocument();
  });
});

function AuthProvider({ children, role }: PropsWithChildren<{ role: AuthRole | null }>) {
  const user: AuthUser | null = role
    ? {
        id: 1,
        email: "user@smartlogix.cl",
        fullName: "Usuario SmartLogix",
        role,
        twoFactorEnabled: false,
        active: true
      }
    : null;
  const value: AuthContextValue = {
    user,
    loading: false,
    checkingSession: false,
    error: null,
    status: user ? "authenticated" : "anonymous",
    isAuthenticated: Boolean(user),
    authUnavailable: false,
    hasStoredToken: Boolean(user),
    login: vi.fn(async () => {
      if (!user) {
        throw new Error("Missing user");
      }

      return {
        requiresTwoFactor: false as const,
        accessToken: "test-token",
        tokenType: "Bearer",
        expiresIn: 3600,
        user
      };
    }),
    verifyTwoFactor: vi.fn(async () => {
      if (!user) {
        throw new Error("Missing user");
      }

      return user;
    }),
    logout: vi.fn(async () => undefined),
    checkSession: vi.fn(async () => undefined),
    clearError: vi.fn()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
