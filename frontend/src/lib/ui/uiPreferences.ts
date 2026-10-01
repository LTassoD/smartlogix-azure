export type TableDensityPreference = "comfortable" | "compact";

export type UiPreferences = {
  tableDensity: TableDensityPreference;
  defaultPageSize: number;
};

const STORAGE_KEY = "smartlogix.uiPreferences";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const defaultUiPreferences: UiPreferences = {
  tableDensity: "comfortable",
  defaultPageSize: 10
};

export function getUiPreferences(): UiPreferences {
  if (!canUseStorage()) {
    return defaultUiPreferences;
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultUiPreferences;
    }

    return parseUiPreferences(JSON.parse(stored));
  } catch {
    return defaultUiPreferences;
  }
}

export function saveUiPreferences(preferences: UiPreferences): UiPreferences {
  const nextPreferences = parseUiPreferences(preferences);

  if (canUseStorage()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    } catch {
      // Preference persistence is best-effort and never blocks the interface.
    }
  }

  applyUiPreferences(nextPreferences);
  return nextPreferences;
}

export function applyUiPreferences(preferences: UiPreferences = getUiPreferences()): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.tableDensity = preferences.tableDensity;
}

function parseUiPreferences(value: unknown): UiPreferences {
  if (!isRecord(value)) {
    return defaultUiPreferences;
  }

  return {
    tableDensity: value.tableDensity === "compact" ? "compact" : "comfortable",
    defaultPageSize: isPageSize(value.defaultPageSize) ? value.defaultPageSize : defaultUiPreferences.defaultPageSize
  };
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPageSize(value: unknown): value is UiPreferences["defaultPageSize"] {
  return typeof value === "number" && PAGE_SIZE_OPTIONS.some((option) => option === value);
}
