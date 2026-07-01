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
import { makeRequest, makeJsonRequest } from "@/test/request";
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/categories", () => {
  it("excludes soft-deleted categories by default", async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/categories"));
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false } })
    );
  });

  it("filters by divisionId when provided", async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/categories?divisionId=div_1"));
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false, divisionId: "div_1" } })
    );
  });
});

describe("POST /api/categories", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(
      makeJsonRequest("http://localhost/api/categories", "POST", { name: "Speakers", divisionId: "div_1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when name or divisionId is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/categories", "POST", { name: "Speakers" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name and division are required" });
  });

  it("creates the category", async () => {
    mockPrisma.category.create.mockResolvedValue({ id: "cat_1", name: "Speakers" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/categories", "POST", { name: "Speakers", divisionId: "div_1" })
    );
    expect(res.status).toBe(201);
  });
});
