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
import { makeRequest, makeJsonRequest, makeParams } from "@/test/request";
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/items/[id]/stock", () => {
  it("returns up to the 50 most recent transactions", async () => {
    mockPrisma.stockTransaction.findMany.mockResolvedValue([{ id: "t1" }]);
    const res = await GET(makeRequest("http://localhost/api/items/i1/stock"), makeParams({ id: "i1" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.stockTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: "i1" }, take: 50 })
    );
  });
});

describe("POST /api/items/[id]/stock", () => {
  const validBody = { type: "PURCHASE_IN", quantity: 5 };

  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(
      makeJsonRequest("http://localhost/api/items/i1/stock", "POST", validBody),
      makeParams({ id: "i1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when type or quantity is missing/invalid", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/items/i1/stock", "POST", { type: "PURCHASE_IN", quantity: -1 }),
      makeParams({ id: "i1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Type and a valid positive quantity are required" });
  });

  it("rejects SALE_OUT as a manual adjustment type", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/items/i1/stock", "POST", { type: "SALE_OUT", quantity: 5 }),
      makeParams({ id: "i1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid transaction type for manual adjustment" });
  });

  it("returns 404 when the item does not exist", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);
    const res = await POST(
      makeJsonRequest("http://localhost/api/items/missing/stock", "POST", validBody),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("increases stock for a PURCHASE_IN transaction", async () => {
    mockPrisma.item.findUnique.mockResolvedValue({ id: "i1", stock: 10 });
    mockPrisma.stockTransaction.create.mockResolvedValue({ id: "t1" });
    mockPrisma.item.update.mockResolvedValue({ id: "i1", stock: 15 });

    const res = await POST(
      makeJsonRequest("http://localhost/api/items/i1/stock", "POST", { type: "PURCHASE_IN", quantity: 5 }),
      makeParams({ id: "i1" })
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.item.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { stock: 15 } });
  });

  it("decreases stock for a RETURN transaction but never below zero", async () => {
    mockPrisma.item.findUnique.mockResolvedValue({ id: "i1", stock: 2 });
    mockPrisma.stockTransaction.create.mockResolvedValue({ id: "t1" });
    mockPrisma.item.update.mockResolvedValue({ id: "i1", stock: 0 });

    await POST(
      makeJsonRequest("http://localhost/api/items/i1/stock", "POST", { type: "RETURN", quantity: 10 }),
      makeParams({ id: "i1" })
    );

    expect(mockPrisma.item.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { stock: 0 } });
  });

  it("treats ADJUSTMENT as stock-in", async () => {
    mockPrisma.item.findUnique.mockResolvedValue({ id: "i1", stock: 0 });
    mockPrisma.stockTransaction.create.mockResolvedValue({ id: "t1" });
    mockPrisma.item.update.mockResolvedValue({ id: "i1", stock: 20 });

    await POST(
      makeJsonRequest("http://localhost/api/items/i1/stock", "POST", { type: "ADJUSTMENT", quantity: 20 }),
      makeParams({ id: "i1" })
    );

    expect(mockPrisma.item.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { stock: 20 } });
  });
});
