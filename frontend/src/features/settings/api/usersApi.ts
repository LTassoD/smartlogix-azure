import { parseApiResponse } from "@/lib/api/apiSchemas";
import type { ApiResponse, AuthRole, UserResponse } from "@/lib/api/apiTypes";
import { AUTH_ROLES } from "@/lib/api/apiTypes";
import { httpClient } from "@/lib/api/httpClient";

export type CreateUserInput = {
  fullName: string;
  email: string;
  role: AuthRole;
  password: string;
};

export type UpdateUserInput = {
  fullName?: string;
  active?: boolean;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export const usersApi = {
  async listUsers(): Promise<UserResponse[]> {
    const response = await httpClient.get<ApiResponse<UserResponse[]>>("/api/users", {
      parse: parseUsersResponse
    });
    return response.data;
  },

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    const response = await httpClient.post<ApiResponse<UserResponse>>("/api/users", {
      body: input,
      parse: parseUserResponse
    });
    return response.data;
  },

  async getUser(id: number): Promise<UserResponse> {
    const response = await httpClient.get<ApiResponse<UserResponse>>(`/api/users/${id}`, {
      parse: parseUserResponse
    });
    return response.data;
  },

  async updateUser(id: number, input: UpdateUserInput): Promise<UserResponse> {
    const response = await httpClient.patch<ApiResponse<UserResponse>>(`/api/users/${id}`, {
      body: input,
      parse: parseUserResponse
    });
    return response.data;
  },

  async updateRole(id: number, role: AuthRole): Promise<UserResponse> {
    const response = await httpClient.patch<ApiResponse<UserResponse>>(`/api/users/${id}/role`, {
      body: { role },
      parse: parseUserResponse
    });
    return response.data;
  },

  async resetPassword(id: number, newPassword: string): Promise<UserResponse> {
    const response = await httpClient.patch<ApiResponse<UserResponse>>(`/api/users/${id}/password`, {
      body: { newPassword },
      parse: parseUserResponse
    });
    return response.data;
  },

  async changeOwnPassword(input: ChangePasswordInput): Promise<void> {
    await httpClient.patch<ApiResponse<null>>("/api/users/me/password", {
      body: input
    });
  },

  async deactivateUser(id: number): Promise<UserResponse> {
    const response = await httpClient.delete<ApiResponse<UserResponse>>(`/api/users/${id}`, {
      parse: parseUserResponse
    });
    return response.data;
  }
};

function parseUsersResponse(value: unknown): ApiResponse<UserResponse[]> {
  return parseApiResponse(value, isUserArray, "users response");
}

function parseUserResponse(value: unknown): ApiResponse<UserResponse> {
  return parseApiResponse(value, isUserResponse, "user response");
}

function isUserArray(value: unknown): value is UserResponse[] {
  return Array.isArray(value) && value.every(isUserResponse);
}

function isUserResponse(value: unknown): value is UserResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.email === "string" &&
    typeof value.fullName === "string" &&
    typeof value.role === "string" &&
    AUTH_ROLES.some((role) => role === value.role) &&
    typeof value.twoFactorEnabled === "boolean" &&
    (value.active === undefined || typeof value.active === "boolean") &&
    (value.createdAt === undefined || typeof value.createdAt === "string") &&
    (value.updatedAt === undefined || typeof value.updatedAt === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
