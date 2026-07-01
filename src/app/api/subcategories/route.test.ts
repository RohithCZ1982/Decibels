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

describe("GET /api/subcategories", () => {
  it("excludes soft-deleted subcategories and can filter by categoryId", async () => {
    mockPrisma.subCategory.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/subcategories?categoryId=cat_1"));
    expect(mockPrisma.subCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false, categoryId: "cat_1" } })
    );
  });
});

describe("POST /api/subcategories", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(
      makeJsonRequest("http://localhost/api/subcategories", "POST", { name: "Bookshelf", categoryId: "cat_1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when name or categoryId is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/subcategories", "POST", { name: "Bookshelf" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name and category are required" });
  });

  it("creates the subcategory", async () => {
    mockPrisma.subCategory.create.mockResolvedValue({ id: "sub_1", name: "Bookshelf" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/subcategories", "POST", { name: "Bookshelf", categoryId: "cat_1" })
    );
    expect(res.status).toBe(201);
  });
});
