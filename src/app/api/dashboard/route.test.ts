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
import { GET } from "./route";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);

  mockPrisma.quotation.count.mockResolvedValue(0);
  mockPrisma.customer.count.mockResolvedValue(0);
  mockPrisma.quotation.findMany.mockResolvedValue([]);
  mockPrisma.quotation.groupBy.mockResolvedValue([]);
  mockPrisma.quotation.aggregate.mockResolvedValue({ _sum: { grandTotal: null } });
  mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
  mockPrisma.item.findMany.mockResolvedValue([]);
});

describe("GET /api/dashboard", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("defaults revenue figures to 0 when there is no aggregate data", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.stats).toEqual({
      totalQuotations: 0,
      activeProjects: 0,
      totalCustomers: 0,
      totalRevenue: 0,
      totalPaid: 0,
      outstanding: 0,
    });
  });

  it("computes outstanding as revenue minus paid", async () => {
    mockPrisma.quotation.aggregate.mockResolvedValue({ _sum: { grandTotal: 50000 } });
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 30000 } });
    const res = await GET();
    const body = await res.json();
    expect(body.stats.totalRevenue).toBe(50000);
    expect(body.stats.totalPaid).toBe(30000);
    expect(body.stats.outstanding).toBe(20000);
  });

  it("reduces groupBy status counts into a status->count map", async () => {
    mockPrisma.quotation.groupBy.mockResolvedValue([
      { status: "DRAFT", _count: { id: 3 } },
      { status: "SENT", _count: { id: 1 } },
    ]);
    const res = await GET();
    const body = await res.json();
    expect(body.statusCounts).toEqual({ DRAFT: 3, SENT: 1 });
  });

  it("flags items at or below their alert quantity as low stock, sorted ascending by stock", async () => {
    mockPrisma.item.findMany.mockResolvedValue([
      { id: "i1", name: "A", code: "0001", stock: 5, alertQuantity: 10, brand: null, category: { name: "Cat" } },
      { id: "i2", name: "B", code: "0002", stock: 20, alertQuantity: 10, brand: null, category: { name: "Cat" } },
      { id: "i3", name: "C", code: "0003", stock: 2, alertQuantity: 10, brand: null, category: { name: "Cat" } },
    ]);
    const res = await GET();
    const body = await res.json();
    expect(body.lowStockItems.map((i: { id: string }) => i.id)).toEqual(["i3", "i1"]);
  });

  it("only lists quotations with a positive outstanding balance, sorted by balance descending, capped at 10", async () => {
    mockPrisma.quotation.findMany
      .mockResolvedValueOnce([]) // recentQuotations
      .mockResolvedValueOnce([
        { id: "q1", quotationNumber: "A", grandTotal: 1000, status: "APPROVED", customer: {}, payments: [{ amount: 1000 }] },
        { id: "q2", quotationNumber: "B", grandTotal: 1000, status: "APPROVED", customer: {}, payments: [{ amount: 200 }] },
        { id: "q3", quotationNumber: "C", grandTotal: 1000, status: "APPROVED", customer: {}, payments: [{ amount: 900 }] },
      ]);

    const res = await GET();
    const body = await res.json();
    expect(body.outstandingList.map((q: { id: string }) => q.id)).toEqual(["q2", "q3"]);
  });
});
