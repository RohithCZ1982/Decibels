import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/prisma", async () => {
  const { createMockPrisma } = await import("@/test/prisma-mock");
  return { prisma: createMockPrisma() };
});

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { MockPrisma } from "@/test/prisma-mock";
import { GET, POST } from "./route";
import { makeJsonRequest } from "@/test/request";
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/users", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("lists users without exposing password hashes", async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", name: "Admin", email: "a@b.com", role: "ADMIN", active: true }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } })
    );
  });
});

describe("POST /api/users", () => {
  const validBody = { name: "New User", email: "new@decibels.audio", password: "password123" };

  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/users", "POST", validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when name, email, or password is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/users", "POST", { name: "New User" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid role", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/users", "POST", { ...validBody, role: "SUPERADMIN" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid role. Must be ADMIN or STAFF" });
  });

  it("returns 400 when the email is already registered", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(makeJsonRequest("http://localhost/api/users", "POST", validBody));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Email already exists" });
  });

  it("hashes the password and defaults role to STAFF", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: "u2", name: "New User", email: validBody.email, role: "STAFF" });

    const res = await POST(makeJsonRequest("http://localhost/api/users", "POST", validBody));

    expect(res.status).toBe(201);
    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.role).toBe("STAFF");
    expect(createCall.data.password).not.toBe("password123");
    expect(createCall.select).not.toHaveProperty("password");
  });
});
