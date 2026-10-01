import { afterEach, describe, expect, it } from "vitest";
import { applyUiPreferences, defaultUiPreferences, getUiPreferences, saveUiPreferences } from "@/lib/ui/uiPreferences";

describe("uiPreferences", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    delete document.documentElement.dataset.tableDensity;
  });

  it("applies compact table density immediately", () => {
    applyUiPreferences({ ...defaultUiPreferences, tableDensity: "compact" });

    expect(document.documentElement.dataset.tableDensity).toBe("compact");
  });

  it("persists non-sensitive table preferences in session storage", () => {
    saveUiPreferences({ tableDensity: "compact", defaultPageSize: 20 });

    expect(getUiPreferences()).toEqual({ tableDensity: "compact", defaultPageSize: 20 });
  });

  it("falls back to defaults for invalid stored preferences", () => {
    window.sessionStorage.setItem("smartlogix.uiPreferences", JSON.stringify({ tableDensity: "tiny", defaultPageSize: 500 }));

    expect(getUiPreferences()).toEqual(defaultUiPreferences);
  });
});

