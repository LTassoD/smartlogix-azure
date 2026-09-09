export type ApiClientErrorCode = "HTTP_ERROR" | "NETWORK_ERROR" | "TIMEOUT_ERROR" | "VALIDATION_ERROR";

type ApiClientErrorOptions = {
  code: ApiClientErrorCode;
  publicMessage: string;
  technicalMessage: string;
  status?: number;
  statusText?: string;
  details?: unknown;
};

export class ApiClientError extends Error {
  readonly code: ApiClientErrorCode;
  readonly publicMessage: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly details?: unknown;

  constructor(options: ApiClientErrorOptions) {
    super(options.technicalMessage);
    this.name = "ApiClientError";
    this.code = options.code;
    this.publicMessage = options.publicMessage;
    this.status = options.status;
    this.statusText = options.statusText;
    this.details = options.details;
  }
}

type HttpErrorInput = {
  status: number;
  statusText: string;
  url: string;
  payload: unknown;
};

export function createHttpError({ status, statusText, url, payload }: HttpErrorInput): ApiClientError {
  return new ApiClientError({
    code: "HTTP_ERROR",
    status,
    statusText,
    details: payload,
    publicMessage: getPublicHttpMessage(status, payload),
    technicalMessage: `HTTP ${status} ${statusText} at ${url}`
  });
}

export function createTimeoutError(url: string): ApiClientError {
  return new ApiClientError({
    code: "TIMEOUT_ERROR",
    publicMessage: "El sistema no respondio a tiempo. Intenta nuevamente.",
    technicalMessage: `Request timed out at ${url}`
  });
}

export function createNetworkError(url: string, cause: unknown): ApiClientError {
  return new ApiClientError({
    code: "NETWORK_ERROR",
    publicMessage: "No fue posible conectar con el sistema.",
    technicalMessage: `Network request failed at ${url}`,
    details: cause
  });
}

export function createValidationError(context: string, details?: unknown): ApiClientError {
  return new ApiClientError({
    code: "VALIDATION_ERROR",
    publicMessage: "No se pudo interpretar la informacion recibida.",
    technicalMessage: `Invalid API response: ${context}`,
    details
  });
}

export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.publicMessage;
  }

  return "No se pudo completar la operacion.";
}

function getPublicHttpMessage(status: number, payload?: unknown): string {
  const responseMessage = getResponseMessage(payload);
  const responseCode = getResponseCode(payload);
  const responseContext = `${responseCode ?? ""} ${responseMessage ?? ""}`.toLocaleLowerCase("es-CL");

  if (status === 429) {
    return "Demasiados intentos. Espera un momento antes de volver a intentarlo.";
  }

  if (isTwoFactorContext(responseContext) && isExpiredContext(responseContext)) {
    return "El codigo o desafio de autenticacion expiro. Inicia sesion nuevamente.";
  }

  if ((status === 400 || status === 401 || status === 403) && isTwoFactorContext(responseContext)) {
    return "Codigo de autenticacion incorrecto.";
  }

  if (status === 410) {
    return "El desafio de autenticacion expiro. Inicia sesion nuevamente.";
  }

  if (status === 409 && responseMessage && isSkuDuplicateMessage(responseMessage)) {
    return "Ya existe un producto registrado con este SKU.";
  }

  if (status === 400) {
    return "Revisa los datos ingresados.";
  }

  if (status === 401) {
    if (isInvalidCredentialsContext(responseContext)) {
      return "Credenciales invalidas.";
    }

    return "Tu sesión expiró. Inicia sesión nuevamente.";
  }

  if (status === 403) {
    return "No tienes permisos para completar esta acción.";
  }

  if (status === 404) {
    return "No se encontro el recurso solicitado.";
  }

  if (status === 409) {
    return "Ya existe un registro con estos datos.";
  }

  if (status >= 500) {
    return "No fue posible completar la operacion. Intenta nuevamente.";
  }

  return "No se pudo completar la solicitud.";
}

function getResponseMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const message = payload.message;

  return typeof message === "string" ? message : null;
}

function getResponseCode(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const code = payload.code;
  return typeof code === "string" ? code : null;
}

function isTwoFactorContext(value: string): boolean {
  return ["2fa", "two-factor", "two_factor", "two factor", "twofactor", "totp", "otp", "authentication code", "codigo", "código", "temporary token", "challenge", "desafio", "desafío"].some(
    (term) => value.includes(term)
  );
}

function isExpiredContext(value: string): boolean {
  return ["expired", "expirado", "expirada", "vencido", "vencida"].some((term) => value.includes(term));
}

function isInvalidCredentialsContext(value: string): boolean {
  const mentionsCredentials = ["credential", "credencial", "password", "contrasena", "contraseña"].some((term) => value.includes(term));
  const indicatesFailure = ["invalid", "incorrect", "invalida", "inválida", "incorrecta"].some((term) => value.includes(term));

  return mentionsCredentials && indicatesFailure;
}

function isSkuDuplicateMessage(message: string): boolean {
  const normalizedMessage = message.toLocaleLowerCase("es-CL");

  return normalizedMessage.includes("sku") && (normalizedMessage.includes("already exists") || normalizedMessage.includes("existe"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
