import { describe, expect, it } from "vitest";
import { hasPermission, getPermissionsForRole } from "@/features/auth/permissions/roleAccess";

describe("roleAccess", () => {
  it("allows ADMIN to export reports and open settings", () => {
    expect(hasPermission("ADMIN", "reports:export")).toBe(true);
    expect(hasPermission("ADMIN", "settings:view")).toBe(true);
  });

  it("allows OPERATOR to manage its account but not export reports", () => {
    expect(hasPermission("OPERATOR", "settings:view")).toBe(true);
    expect(hasPermission("OPERATOR", "reports:export")).toBe(false);
    expect(hasPermission("OPERATOR", "orders:update-status")).toBe(true);
  });

  it("keeps VIEWER in read-only permissions", () => {
    expect(hasPermission("VIEWER", "inventory:view")).toBe(true);
    expect(hasPermission("VIEWER", "inventory:create")).toBe(false);
    expect(hasPermission("VIEWER", "shipments:update-status")).toBe(false);
    expect(hasPermission("VIEWER", "settings:view")).toBe(true);
  });

  it("returns no permissions for anonymous sessions", () => {
    expect(getPermissionsForRole(null)).toEqual([]);
  });
});
