import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { AuthContext, type AuthSessionStatus } from "@/features/auth/hooks/AuthContext";
import type { LoginRequest } from "@/lib/api/apiTypes";
import type { AuthUser } from "@/features/auth/types/authTypes";
import { ApiClientError, getSafeErrorMessage } from "@/lib/api/apiErrors";
import { httpClientEvents } from "@/lib/api/httpClient";
import { authTokenProvider } from "@/lib/security/authTokenProvider";
import { useToast } from "@/components/ui/toastContext";

export function AuthProvider({ children }: PropsWithChildren) {
  const toast = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthSessionStatus>("checking");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    setStatus("checking");
    setError(null);

    if (!authTokenProvider.hasToken()) {
      setUser(null);
      setStatus("anonymous");
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setStatus("authenticated");
    } catch (sessionError) {
      setUser(null);
      setError(getSafeErrorMessage(sessionError));

      if (sessionError instanceof ApiClientError && sessionError.status === 401) {
        authTokenProvider.clearToken();
        setStatus("anonymous");
        return;
      }

      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    function handleUnauthorized() {
      authTokenProvider.clearToken();
      setUser(null);
      setError("Tu sesión expiró. Inicia sesión nuevamente.");
      setStatus("anonymous");
      toast.error("Tu sesión expiró. Inicia sesión nuevamente.");
    }

    window.addEventListener(httpClientEvents.unauthorized, handleUnauthorized);

    return () => window.removeEventListener(httpClientEvents.unauthorized, handleUnauthorized);
  }, [toast]);

  const login = useCallback(async (credentials: LoginRequest) => {
    setActionLoading(true);
    setError(null);

    try {
      const loginResponse = await authApi.login(credentials);

      if (loginResponse.requiresTwoFactor) {
        setUser(null);
        setStatus("anonymous");
        return loginResponse;
      }

      authTokenProvider.setToken(loginResponse.accessToken);
      setUser(loginResponse.user);
      setStatus("authenticated");
      return loginResponse;
    } catch (loginError) {
      const safeMessage = getSafeErrorMessage(loginError);
      setError(safeMessage);
      setStatus("anonymous");
      throw loginError;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const verifyTwoFactor = useCallback(async (temporaryToken: string, code: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const loginResponse = await authApi.verifyTwoFactor({ temporaryToken, code });
      authTokenProvider.setToken(loginResponse.accessToken);
      setUser(loginResponse.user);
      setStatus("authenticated");
      return loginResponse.user;
    } catch (verificationError) {
      setError(getSafeErrorMessage(verificationError));
      setStatus("anonymous");
      throw verificationError;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setError(null);
    setStatus("anonymous");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading: actionLoading || status === "checking",
      checkingSession: status === "checking",
      error,
      status,
      isAuthenticated: Boolean(user),
      authUnavailable: status === "unavailable",
      hasStoredToken: authTokenProvider.hasToken(),
      login,
      verifyTwoFactor,
      logout,
      checkSession,
      clearError
    }),
    [actionLoading, checkSession, clearError, error, login, logout, status, user, verifyTwoFactor]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
