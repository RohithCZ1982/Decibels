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
import { makeRequest } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/reports", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/reports"));
    expect(res.status).toBe(401);
  });

  it("defaults to the monthly report type and buckets quotations by creation month", async () => {
    mockPrisma.quotation.findMany.mockResolvedValue([
      { createdAt: new Date("2026-01-15"), grandTotal: 1000, status: "DRAFT" },
      { createdAt: new Date("2026-01-20"), grandTotal: 2000, status: "APPROVED" },
      { createdAt: new Date("2026-02-01"), grandTotal: 500, status: "APPROVED" },
    ]);
    const res = await GET(makeRequest("http://localhost/api/reports"));
    const body = await res.json();
    expect(body).toEqual([
      { month: "2026-01", label: "Jan 2026", quotations: 2, revenue: 3000, confirmed_revenue: 2000 },
      { month: "2026-02", label: "Feb 2026", quotations: 1, revenue: 500, confirmed_revenue: 500 },
    ]);
  });

  it("returns the top items grouped by name for type=items", async () => {
    mockPrisma.quotationItem.groupBy.mockResolvedValue([{ name: "Speaker", _sum: { quantity: 10, total: 50000 }, _count: { id: 4 } }]);
    const res = await GET(makeRequest("http://localhost/api/reports?type=items"));
    const body = await res.json();
    expect(body).toEqual([{ name: "Speaker", _sum: { quantity: 10, total: 50000 }, _count: { id: 4 } }]);
  });

  it("returns active templates with usage counts for type=templates", async () => {
    mockPrisma.template.findMany.mockResolvedValue([{ id: "tpl_1", _count: { quotations: 5 } }]);
    const res = await GET(makeRequest("http://localhost/api/reports?type=templates"));
    expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    );
  });

  it("buckets payments by month for type=payments", async () => {
    mockPrisma.payment.findMany.mockResolvedValue([
      { date: new Date("2026-03-05"), amount: 1000 },
      { date: new Date("2026-03-10"), amount: 500 },
    ]);
    const res = await GET(makeRequest("http://localhost/api/reports?type=payments"));
    const body = await res.json();
    expect(body).toEqual([{ month: "2026-03", label: "Mar 2026", total: 1500, count: 2 }]);
  });

  it("returns an empty array for an unrecognized type", async () => {
    const res = await GET(makeRequest("http://localhost/api/reports?type=bogus"));
    expect(await res.json()).toEqual([]);
  });
});
