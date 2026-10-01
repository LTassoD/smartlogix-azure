import { describe, expect, it } from "vitest";
import { createHttpError, getSafeErrorMessage } from "@/lib/api/apiErrors";

describe("apiErrors", () => {
  it("maps Spanish invalid-credential responses without calling them an expired session", () => {
    const error = createHttpError({
      status: 401,
      statusText: "Unauthorized",
      url: "/api/auth/login",
      payload: { message: "Credenciales incorrectas" }
    });

    expect(getSafeErrorMessage(error)).toBe("Credenciales invalidas.");
  });

  it("maps an invalid setup code to a specific safe 2FA message", () => {
    const error = createHttpError({
      status: 400,
      statusText: "Bad Request",
      url: "/api/auth/2fa/verify-setup",
      payload: { code: "INVALID_TWO_FACTOR_CODE", message: "Invalid authentication code" }
    });

    expect(getSafeErrorMessage(error)).toBe("Codigo de autenticacion incorrecto.");
  });

  it("maps rate limiting without exposing implementation details", () => {
    const error = createHttpError({
      status: 429,
      statusText: "Too Many Requests",
      url: "/api/auth/2fa",
      payload: { message: "Rate limit exceeded" }
    });

    expect(getSafeErrorMessage(error)).toMatch(/Demasiados intentos/);
  });
});
