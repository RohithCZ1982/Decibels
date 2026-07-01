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

describe("GET /api/items", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/items"));
    expect(res.status).toBe(401);
  });

  it("returns paginated active items scoped to non-deleted categories by default", async () => {
    mockPrisma.item.findMany.mockResolvedValue([{ id: "i1" }]);
    mockPrisma.item.count.mockResolvedValue(1);
    const res = await GET(makeRequest("http://localhost/api/items"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: "i1" }], total: 1, page: 1, totalPages: 1 });
    expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true, category: { deleted: false } } })
    );
  });

  it("scopes to a specific category without the deleted-category filter", async () => {
    mockPrisma.item.findMany.mockResolvedValue([]);
    mockPrisma.item.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/items?categoryId=cat_1"));
    expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true, categoryId: "cat_1" } })
    );
  });

  it("returns the full unpaginated list when all=true", async () => {
    mockPrisma.item.findMany.mockResolvedValue([{ id: "i1" }, { id: "i2" }]);
    const res = await GET(makeRequest("http://localhost/api/items?all=true"));
    const body = await res.json();
    expect(body).toEqual([{ id: "i1" }, { id: "i2" }]);
    expect(mockPrisma.item.count).not.toHaveBeenCalled();
  });

  it("builds a multi-field search filter", async () => {
    mockPrisma.item.findMany.mockResolvedValue([]);
    mockPrisma.item.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/items?search=Sony"));
    expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "Sony", mode: "insensitive" } },
            { code: { contains: "Sony", mode: "insensitive" } },
            { description: { contains: "Sony", mode: "insensitive" } },
            { brand: { contains: "Sony", mode: "insensitive" } },
          ],
        }),
      })
    );
  });
});

describe("POST /api/items", () => {
  const validBody = {
    code: "0001",
    name: "Speaker",
    categoryId: "cat_1",
    unitPrice: 5000,
    divisionId: "div_1",
  };

  it("is admin-only: staff sessions get 403", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/items", "POST", validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when a required field is missing", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/items", "POST", { name: "Speaker" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Code, name, category, division, and unit price are required",
    });
  });

  it("returns 400 for a non-numeric unitPrice", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/items", "POST", { ...validBody, unitPrice: "abc" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unit price must be a valid number" });
  });

  it("returns 400 for a non-numeric purchasePrice", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/items", "POST", { ...validBody, purchasePrice: "abc" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Purchase price must be a valid number" });
  });

  it("returns 400 for a non-numeric gstRate", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/items", "POST", { ...validBody, gstRate: "abc" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "GST rate must be a valid number" });
  });

  it("returns 400 when the item code already exists", async () => {
    mockPrisma.item.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(makeJsonRequest("http://localhost/api/items", "POST", validBody));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Item code already exists" });
  });

  it("creates the item with sensible defaults for optional fields", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);
    mockPrisma.item.create.mockResolvedValue({ id: "item_new", ...validBody });

    const res = await POST(makeJsonRequest("http://localhost/api/items", "POST", validBody));

    expect(res.status).toBe(201);
    expect(mockPrisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "0001",
          name: "Speaker",
          unitPrice: 5000,
          unit: "Pc(s)",
          taxType: "exclusive",
          gstRate: 18,
          manageStock: false,
          alertQuantity: 0,
        }),
      })
    );
  });
});
