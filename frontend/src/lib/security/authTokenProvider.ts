const STORAGE_KEY = "smartlogix.accessToken";

let accessToken: string | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readStoredToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    accessToken = token;
  }
}

function removeStoredToken(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    accessToken = null;
  }
}

// Temporary sessionStorage persistence because the backend currently returns JWT in the login body.
// Replace this with cookie-only session checks when HttpOnly cookies are available.
export const authTokenProvider = {
  getToken(): string | null {
    if (!accessToken) {
      accessToken = readStoredToken();
    }

    return accessToken;
  },

  setToken(token: string): void {
    accessToken = token;
    writeStoredToken(token);
  },

  clearToken(): void {
    accessToken = null;
    removeStoredToken();
  },

  hasToken(): boolean {
    return Boolean(this.getToken());
  }
};
