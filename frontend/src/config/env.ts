type CredentialsModeConfig = "include" | "same-origin" | "omit";

const DEFAULT_DEV_API_BASE_URL = "http://localhost:8080";
const DEV_PROXY_PREFIX = "/__smartlogix_api";
const configWarnings: string[] = [];

function readOptionalEnv(name: keyof ImportMetaEnv): string | null {
  const value = import.meta.env[name];
  return value?.trim() || null;
}

function readApiBaseUrl(): string {
  const configuredValue = readOptionalEnv("VITE_API_BASE_URL");

  if (!configuredValue) {
    configWarnings.push(
      `Missing VITE_API_BASE_URL. Using development fallback ${DEFAULT_DEV_API_BASE_URL}.`
    );
    return DEFAULT_DEV_API_BASE_URL;
  }

  return configuredValue;
}

function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch {
    configWarnings.push(
      `Invalid VITE_API_BASE_URL "${value}". Using development fallback ${DEFAULT_DEV_API_BASE_URL}.`
    );
    return DEFAULT_DEV_API_BASE_URL;
  }
}

function shouldUseDevProxy(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_API_USE_DEV_PROXY !== "false";
}

function readCredentialsMode(): CredentialsModeConfig {
  const value = import.meta.env.VITE_API_CREDENTIALS_MODE ?? "same-origin";

  if (value === "include" || value === "same-origin" || value === "omit") {
    return value;
  }

  configWarnings.push("Invalid VITE_API_CREDENTIALS_MODE. Using same-origin.");
  return "same-origin";
}

const apiBaseUrl = normalizeBaseUrl(readApiBaseUrl());
const apiCredentialsMode = readCredentialsMode();
const apiClientBaseUrl = shouldUseDevProxy() ? DEV_PROXY_PREFIX : apiBaseUrl;

if (configWarnings.length > 0) {
  console.warn("SmartLogix frontend configuration warning:", configWarnings.join(" "));
}

export const env = {
  apiBaseUrl: apiClientBaseUrl,
  gatewayBaseUrl: apiBaseUrl,
  appName: import.meta.env.VITE_APP_NAME?.trim() || "SmartLogix",
  apiCredentialsMode,
  configWarnings
} as const;
