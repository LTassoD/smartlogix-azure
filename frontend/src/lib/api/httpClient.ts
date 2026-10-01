import { env } from "@/config/env";
import {
  ApiClientError,
  createHttpError,
  createNetworkError,
  createTimeoutError,
  createValidationError
} from "@/lib/api/apiErrors";
import { authTokenProvider } from "@/lib/security/authTokenProvider";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions<TResponse> = {
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  logoutOnUnauthorized?: boolean;
  timeoutMs?: number;
  parse?: (value: unknown) => TResponse;
};

const DEFAULT_TIMEOUT_MS = 10000;
const unauthorizedEventName = "smartlogix:unauthorized";

declare global {
  interface WindowEventMap {
    [unauthorizedEventName]: CustomEvent<void>;
  }
}

async function request<TResponse>(
  method: HttpMethod,
  path: string,
  options: RequestOptions<TResponse> = {}
): Promise<TResponse> {
  const url = buildUrl(path);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(options.headers, options.body, options.auth),
      body: buildBody(options.body),
      credentials: env.apiCredentialsMode,
      signal: controller.signal
    });

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      if (response.status === 401 && options.auth !== false && options.logoutOnUnauthorized !== false) {
        window.dispatchEvent(new CustomEvent(unauthorizedEventName));
      }

      throw createHttpError({
        status: response.status,
        statusText: response.statusText,
        url,
        payload
      });
    }

    if (!options.parse) {
      return payload as TResponse;
    }

    return options.parse(payload);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw createTimeoutError(url);
    }

    throw createNetworkError(url, error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${env.apiBaseUrl}${normalizedPath}`;
}

function buildHeaders(headers: HeadersInit | undefined, body: unknown, auth = true): Headers {
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  requestHeaders.set("Accept", "application/json");

  const token = auth ? authTokenProvider.getToken() : null;
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  return requestHeaders;
}

function buildBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body === "string" || body instanceof FormData || body instanceof Blob) {
    return body;
  }

  return JSON.stringify(body);
}

async function readResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    throw createValidationError("response body is not valid JSON", error);
  }
}

export const httpClient = {
  get: <TResponse>(path: string, options?: RequestOptions<TResponse>) => request<TResponse>("GET", path, options),
  post: <TResponse>(path: string, options?: RequestOptions<TResponse>) => request<TResponse>("POST", path, options),
  put: <TResponse>(path: string, options?: RequestOptions<TResponse>) => request<TResponse>("PUT", path, options),
  patch: <TResponse>(path: string, options?: RequestOptions<TResponse>) => request<TResponse>("PATCH", path, options),
  delete: <TResponse>(path: string, options?: RequestOptions<TResponse>) => request<TResponse>("DELETE", path, options)
};

export const httpClientEvents = {
  unauthorized: unauthorizedEventName
};
