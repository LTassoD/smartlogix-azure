import { createContext } from "react";
import type { LoginRequest, LoginResponse } from "@/lib/api/apiTypes";
import type { AuthStatus, AuthUser } from "@/features/auth/types/authTypes";

export type AuthSessionStatus = AuthStatus;

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  checkingSession: boolean;
  error: string | null;
  status: AuthSessionStatus;
  isAuthenticated: boolean;
  authUnavailable: boolean;
  hasStoredToken: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  verifyTwoFactor: (temporaryToken: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
