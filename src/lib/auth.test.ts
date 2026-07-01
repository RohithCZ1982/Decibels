import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import type { MockPrisma } from "@/test/prisma-mock";

vi.mock("@/lib/prisma", async () => {
  const { createMockPrisma } = await import("@/test/prisma-mock");
  return { prisma: createMockPrisma() };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  getSession,
  requireAuth,
  requireAdmin,
  authenticateUser,
  type SessionUser,
} from "./auth";

const mockPrisma = prisma as unknown as MockPrisma;
const mockCookies = vi.mocked(cookies);

function setCookieToken(token: string | undefined) {
  mockCookies.mockResolvedValue({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (_name: string) => (token ? { name: "auth-token", value: token } : undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const adminUser: SessionUser = {
  id: "user_1",
  name: "Admin User",
  email: "admin@decibels.audio",
  role: "ADMIN",
};

const staffUser: SessionUser = {
  id: "user_2",
  name: "Staff User",
  email: "staff@decibels.audio",
  role: "STAFF",
};

describe("hashPassword / verifyPassword", () => {
  it("hashes a password to a value different from the original", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("hunter2");
    await expect(verifyPassword("hunter2", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("hunter2");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("createToken / verifyToken", () => {
  it("round-trips a session user through sign and verify", () => {
    const token = createToken(adminUser);
    const decoded = verifyToken(token);
    expect(decoded).toMatchObject({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
    });
  });

  it("returns null for a malformed token", () => {
    expect(verifyToken("not-a-valid-jwt")).toBeNull();
  });

  it("returns null for a token signed with a different secret", () => {
    const bogusToken = jwt.sign({ id: "x", name: "x", email: "x", role: "ADMIN" }, "wrong-secret");
    expect(verifyToken(bogusToken)).toBeNull();
  });

  it("returns null for an expired token", () => {
    const expiredToken = jwt.sign(
      { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
      process.env.NEXTAUTH_SECRET as string,
      { expiresIn: -10 }
    );
    expect(verifyToken(expiredToken)).toBeNull();
  });
});

describe("getSession", () => {
  beforeEach(() => {
    mockCookies.mockReset();
  });

  it("returns null when there is no auth-token cookie", async () => {
    setCookieToken(undefined);
    await expect(getSession()).resolves.toBeNull();
  });

  it("returns null when the cookie holds an invalid token", async () => {
    setCookieToken("garbage");
    await expect(getSession()).resolves.toBeNull();
  });

  it("returns the decoded session when the cookie holds a valid token", async () => {
    setCookieToken(createToken(staffUser));
    const session = await getSession();
    expect(session).toMatchObject({
      id: staffUser.id,
      name: staffUser.name,
      email: staffUser.email,
      role: staffUser.role,
    });
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    mockCookies.mockReset();
  });

  it("throws Unauthorized when there is no session", async () => {
    setCookieToken(undefined);
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("returns the session when authenticated", async () => {
    setCookieToken(createToken(adminUser));
    await expect(requireAuth()).resolves.toMatchObject({ id: adminUser.id });
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    mockCookies.mockReset();
  });

  it("throws Unauthorized when there is no session", async () => {
    setCookieToken(undefined);
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden when the session role is not ADMIN", async () => {
    setCookieToken(createToken(staffUser));
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });

  it("returns the session when the role is ADMIN", async () => {
    setCookieToken(createToken(adminUser));
    await expect(requireAdmin()).resolves.toMatchObject({ id: adminUser.id });
  });
});

describe("authenticateUser", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
  });

  it("returns null when no user exists with the given email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authenticateUser("nobody@decibels.audio", "whatever")).resolves.toBeNull();
  });

  it("returns null when the user account is inactive", async () => {
    const hash = await hashPassword("password123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_3",
      name: "Disabled User",
      email: "disabled@decibels.audio",
      password: hash,
      role: "STAFF",
      active: false,
    });
    await expect(authenticateUser("disabled@decibels.audio", "password123")).resolves.toBeNull();
  });

  it("returns null when the password does not match", async () => {
    const hash = await hashPassword("password123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_4",
      name: "Real User",
      email: "user@decibels.audio",
      password: hash,
      role: "STAFF",
      active: true,
    });
    await expect(authenticateUser("user@decibels.audio", "wrong-password")).resolves.toBeNull();
  });

  it("returns the session-shaped user (without the password hash) on success", async () => {
    const hash = await hashPassword("password123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_5",
      name: "Real User",
      email: "user@decibels.audio",
      password: hash,
      role: "ADMIN",
      active: true,
    });
    const result = await authenticateUser("user@decibels.audio", "password123");
    expect(result).toEqual({
      id: "user_5",
      name: "Real User",
      email: "user@decibels.audio",
      role: "ADMIN",
    });
    expect(result).not.toHaveProperty("password");
  });
});
