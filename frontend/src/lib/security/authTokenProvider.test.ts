import { beforeEach, describe, expect, it } from "vitest";
import { authTokenProvider } from "@/lib/security/authTokenProvider";

describe("authTokenProvider", () => {
  beforeEach(() => {
    authTokenProvider.clearToken();
    window.sessionStorage.clear();
  });

  it("removes the definitive session token on logout", () => {
    authTokenProvider.setToken("definitive-session-token");

    expect(authTokenProvider.hasToken()).toBe(true);
    expect(window.sessionStorage.getItem("smartlogix.accessToken")).toBe("definitive-session-token");

    authTokenProvider.clearToken();

    expect(authTokenProvider.hasToken()).toBe(false);
    expect(window.sessionStorage.getItem("smartlogix.accessToken")).toBeNull();
  });
});
