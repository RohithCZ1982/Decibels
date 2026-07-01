import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionUser } from "./auth";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getSession: vi.fn() };
});

import { getSession } from "@/lib/auth";
import {
  jsonResponse,
  errorResponse,
  withAuth,
  clampLimit,
  isValidNumber,
  isValidPositiveNumber,
  isValidDate,
  isValidEmail,
  isValidMobile,
  isValidGSTNumber,
  validateEnum,
  formatCurrency,
} from "./api-helpers";

const mockGetSession = vi.mocked(getSession);

const adminSession: SessionUser = {
  id: "user_1",
  name: "Admin User",
  email: "admin@decibels.audio",
  role: "ADMIN",
};

const staffSession: SessionUser = {
  id: "user_2",
  name: "Staff User",
  email: "staff@decibels.audio",
  role: "STAFF",
};

describe("jsonResponse", () => {
  it("defaults to a 200 status", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("accepts a custom status code", async () => {
    const res = jsonResponse({ id: "abc" }, 201);
    expect(res.status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("defaults to a 400 status with the message wrapped in an error field", async () => {
    const res = errorResponse("Something is wrong");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Something is wrong" });
  });

  it("accepts a custom status code", async () => {
    const res = errorResponse("Not found", 404);
    expect(res.status).toBe(404);
  });
});

describe("withAuth", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const handler = vi.fn();
    const res = await withAuth(handler);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("invokes the handler with the session when authenticated and no role is required", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const handler = vi.fn().mockResolvedValue(jsonResponse({ done: true }));
    const res = await withAuth(handler);
    expect(handler).toHaveBeenCalledWith(staffSession);
    expect(res.status).toBe(200);
  });

  it("invokes the handler when the session role matches the required role", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const handler = vi.fn().mockResolvedValue(jsonResponse({ done: true }));
    const res = await withAuth(handler, "ADMIN");
    expect(handler).toHaveBeenCalledWith(adminSession);
    expect(res.status).toBe(200);
  });

  it("returns 403 when the session role does not match the required role", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const handler = vi.fn();
    const res = await withAuth(handler, "ADMIN");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 500 and swallows the error when the handler throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetSession.mockResolvedValue(adminSession);
    const handler = vi.fn().mockRejectedValue(new Error("db exploded"));
    const res = await withAuth(handler);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("clampLimit", () => {
  it("returns the value unchanged when within bounds", () => {
    expect(clampLimit(50)).toBe(50);
  });

  it("clamps to the max when the value exceeds it", () => {
    expect(clampLimit(500)).toBe(100);
  });

  it("clamps to 1 when the value is zero or negative", () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-10)).toBe(1);
  });

  it("respects a custom max", () => {
    expect(clampLimit(30, 20)).toBe(20);
  });

  it("propagates NaN through Math.min/Math.max instead of clamping it (documents existing behavior)", () => {
    // clampLimit does not guard against NaN before calling Math.max/Math.min,
    // so a NaN input falls through as NaN rather than being clamped to 1.
    expect(clampLimit(NaN)).toBeNaN();
  });
});

describe("isValidNumber", () => {
  it.each([
    [0, true],
    [42, true],
    [-3.5, true],
    ["42", true],
    ["", false],
    [null, false],
    [undefined, false],
    ["abc", false],
    [Infinity, false],
    [NaN, false],
  ])("isValidNumber(%p) -> %p", (value, expected) => {
    expect(isValidNumber(value)).toBe(expected);
  });
});

describe("isValidPositiveNumber", () => {
  it.each([
    [1, true],
    [0.01, true],
    [0, false],
    [-5, false],
    ["10", true],
    ["-1", false],
    ["", false],
  ])("isValidPositiveNumber(%p) -> %p", (value, expected) => {
    expect(isValidPositiveNumber(value)).toBe(expected);
  });
});

describe("isValidDate", () => {
  it("accepts a valid ISO date string", () => {
    expect(isValidDate("2026-01-01")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidDate("")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });

  it("rejects an unparseable date string", () => {
    expect(isValidDate("not-a-date")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it.each([
    ["user@example.com", true],
    ["user.name+tag@example.co.in", true],
    ["not-an-email", false],
    ["missing@domain", false],
    ["@nodomain.com", false],
    ["", false],
  ])("isValidEmail(%p) -> %p", (value, expected) => {
    expect(isValidEmail(value)).toBe(expected);
  });

  it("rejects non-string values", () => {
    expect(isValidEmail(12345)).toBe(false);
  });
});

describe("isValidMobile", () => {
  it("accepts a plain 10-digit Indian mobile number starting with 6-9", () => {
    expect(isValidMobile("9876543210")).toBe(true);
  });

  it("accepts a number with a +91 country code prefix", () => {
    expect(isValidMobile("+919876543210")).toBe(true);
  });

  it("accepts a number with a 91 prefix and no plus sign", () => {
    expect(isValidMobile("919876543210")).toBe(true);
  });

  it("rejects a number starting with 0-5", () => {
    expect(isValidMobile("5876543210")).toBe(false);
  });

  it("rejects a number that is too short", () => {
    expect(isValidMobile("98765")).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(isValidMobile("abcdefghij")).toBe(false);
  });

  it("rejects empty/non-string values", () => {
    expect(isValidMobile("")).toBe(false);
    expect(isValidMobile(9876543210)).toBe(false);
  });
});

describe("isValidGSTNumber", () => {
  it("accepts a well-formed 15-character GSTIN", () => {
    expect(isValidGSTNumber("29ABCDE1234F1Z5")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidGSTNumber("29abcde1234f1z5")).toBe(true);
  });

  it("rejects a GSTIN with the wrong length", () => {
    expect(isValidGSTNumber("29ABCDE1234F1Z")).toBe(false);
  });

  it("rejects a GSTIN with an invalid structure", () => {
    expect(isValidGSTNumber("ZZABCDE1234F1Z5")).toBe(false);
  });

  it("rejects non-string/empty values", () => {
    expect(isValidGSTNumber("")).toBe(false);
    expect(isValidGSTNumber(12345)).toBe(false);
  });
});

describe("validateEnum", () => {
  const ROLES = ["ADMIN", "STAFF"] as const;

  it("returns true for a value in the enum", () => {
    expect(validateEnum("ADMIN", ROLES)).toBe(true);
  });

  it("returns false for a value not in the enum", () => {
    expect(validateEnum("SUPERADMIN", ROLES)).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(validateEnum(123, ROLES)).toBe(false);
    expect(validateEnum(null, ROLES)).toBe(false);
  });
});

describe("formatCurrency", () => {
  it("formats a whole number as INR with no decimal places", () => {
    expect(formatCurrency(1000)).toBe("₹1,000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });

  it("rounds fractional amounts to the nearest rupee", () => {
    expect(formatCurrency(999.6)).toBe("₹1,000");
  });
});
