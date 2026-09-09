import {
  parseCurrentUserApiResponse,
  parseLoginApiResponse,
  parseTwoFactorSetupApiResponse,
  parseTwoFactorStatusApiResponse
} from "@/lib/api/apiSchemas";
import type {
  ApiResponse,
  AuthenticatedLoginResponse,
  LoginRequest,
  LoginResponse,
  TwoFactorDisableRequest,
  TwoFactorSetupResponse,
  TwoFactorSetupVerificationRequest,
  TwoFactorStatusResponse,
  TwoFactorVerificationRequest,
  UserResponse
} from "@/lib/api/apiTypes";
import { createValidationError } from "@/lib/api/apiErrors";
import { httpClient } from "@/lib/api/httpClient";
import { authTokenProvider } from "@/lib/security/authTokenProvider";

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<ApiResponse<LoginResponse>>("/api/auth/login", {
      body: credentials,
      auth: false,
      parse: parseLoginApiResponse
    });

    return response.data;
  },

  async getCurrentUser(): Promise<UserResponse> {
    const response = await httpClient.get<ApiResponse<UserResponse>>("/api/auth/me", {
      parse: parseCurrentUserApiResponse
    });

    return response.data;
  },

  async verifyTwoFactor(input: TwoFactorVerificationRequest): Promise<AuthenticatedLoginResponse> {
    const response = await httpClient.post<ApiResponse<LoginResponse>>("/api/auth/2fa", {
      body: input,
      auth: false,
      parse: parseLoginApiResponse
    });

    if (response.data.requiresTwoFactor) {
      throw createValidationError("two-factor verification must complete authentication", response.data);
    }

    return response.data;
  },

  async getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
    const response = await httpClient.get<ApiResponse<TwoFactorStatusResponse>>("/api/auth/2fa/status", {
      parse: parseTwoFactorStatusApiResponse
    });

    return response.data;
  },

  async setupTwoFactor(): Promise<TwoFactorSetupResponse> {
    const response = await httpClient.post<ApiResponse<TwoFactorSetupResponse>>("/api/auth/2fa/setup", {
      parse: parseTwoFactorSetupApiResponse
    });

    return response.data;
  },

  async verifyTwoFactorSetup(input: TwoFactorSetupVerificationRequest): Promise<TwoFactorStatusResponse> {
    const response = await httpClient.post<ApiResponse<TwoFactorStatusResponse>>("/api/auth/2fa/verify-setup", {
      body: input,
      logoutOnUnauthorized: false,
      parse: parseTwoFactorStatusApiResponse
    });

    return response.data;
  },

  async disableTwoFactor(input: TwoFactorDisableRequest): Promise<TwoFactorStatusResponse> {
    const response = await httpClient.post<ApiResponse<TwoFactorStatusResponse>>("/api/auth/2fa/disable", {
      body: input,
      logoutOnUnauthorized: false,
      parse: parseTwoFactorStatusApiResponse
    });

    return response.data;
  },

  async logout(): Promise<void> {
    authTokenProvider.clearToken();
  }
};
