export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
};

export type HealthCheckResponse = {
  status: "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN" | string;
  checkedAt?: string;
  services?: SystemServiceHealth[];
  components?: Record<string, unknown>;
  groups?: string[];
};

export type SystemServiceKey = "gateway" | "identity" | "inventory" | "orders" | "shipping" | "frontend" | string;

export type SystemServiceHealth = {
  key: SystemServiceKey;
  name: string;
  status: "UP" | "DOWN" | "DEGRADED" | "OUT_OF_SERVICE" | "UNKNOWN" | string;
  message?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TwoFactorVerificationRequest = {
  temporaryToken: string;
  code: string;
};

export const AUTH_ROLES = ["ADMIN", "OPERATOR", "VIEWER"] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export type AuthenticatedLoginResponse = {
  requiresTwoFactor: false;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
};

export type TwoFactorChallengeResponse = {
  requiresTwoFactor: true;
  temporaryToken: string;
  expiresIn: number;
};

export type LoginResponse = AuthenticatedLoginResponse | TwoFactorChallengeResponse;

export type TwoFactorStatusResponse = {
  enabled: boolean;
};

export type TwoFactorSetupResponse = {
  otpauthUri: string;
  expiresInSeconds: number;
};

export type TwoFactorSetupVerificationRequest = {
  code: string;
};

export type TwoFactorDisableRequest = {
  currentPassword: string;
};

export type UserResponse = {
  id: number;
  email: string;
  fullName: string;
  role: AuthRole;
  twoFactorEnabled: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
