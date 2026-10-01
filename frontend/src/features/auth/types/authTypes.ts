import type { AuthRole as ApiAuthRole, UserResponse } from "@/lib/api/apiTypes";
import type { Permission } from "@/features/auth/permissions/permissions";

export type AuthUser = UserResponse;
export type AuthRole = ApiAuthRole;
export type AuthStatus = "checking" | "authenticated" | "anonymous" | "unavailable";

export type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  permissions: Permission[];
  isAuthenticated: boolean;
};

export type { Permission };
