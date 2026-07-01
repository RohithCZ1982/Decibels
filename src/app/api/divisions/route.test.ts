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

describe("GET /api/divisions", () => {
  it("lists all divisions ordered by name", async () => {
    mockPrisma.division.findMany.mockResolvedValue([{ id: "div_1", name: "Home Theater" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockPrisma.division.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
  });
});

describe("POST /api/divisions", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(
      makeJsonRequest("http://localhost/api/divisions", "POST", { name: "Home Theater", slug: "ht" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when name or slug is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/divisions", "POST", { name: "Home Theater" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name and slug are required" });
  });

  it("returns 400 when the name or slug is already in use", async () => {
    mockPrisma.division.findFirst.mockResolvedValue({ id: "existing" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/divisions", "POST", { name: "Home Theater", slug: "ht" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Division name or slug already exists" });
  });

  it("normalizes the slug to uppercase with underscores", async () => {
    mockPrisma.division.findFirst.mockResolvedValue(null);
    mockPrisma.division.create.mockResolvedValue({ id: "div_1", slug: "HOME_THEATER" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/divisions", "POST", { name: "Home Theater", slug: "home theater" })
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.division.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "HOME_THEATER" }) })
    );
  });
});
