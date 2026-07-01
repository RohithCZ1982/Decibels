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
import { GET, PUT } from "./route";
import { makeRequest, makeJsonRequest, makeParams } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/quotations/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/quotations/q1"), makeParams({ id: "q1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the quotation does not exist", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/quotations/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Quotation not found" });
  });

  it("returns the quotation with its relations when found", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "q1", quotationNumber: "DEC-2601-0001" });
    const res = await GET(makeRequest("http://localhost/api/quotations/q1"), makeParams({ id: "q1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "q1", quotationNumber: "DEC-2601-0001" });
  });
});

describe("PUT /api/quotations/[id]", () => {
  it("returns 404 when the quotation does not exist", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/quotations/missing", "PUT", { notes: "hi" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("rejects edits when the quotation is COMPLETED", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "q1", status: "COMPLETED", discount: 0, includeGst: true, roundOff: 0 });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/quotations/q1", "PUT", { notes: "hi" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cannot edit quotations in COMPLETED or CLOSED status" });
  });

  it("rejects edits when the quotation is CLOSED", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "q1", status: "CLOSED", discount: 0, includeGst: true, roundOff: 0 });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/quotations/q1", "PUT", { notes: "hi" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
  });

  it("updates notes/terms/billDate/includeGst without touching items when items is not provided", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "q1", status: "DRAFT", discount: 0, includeGst: true, roundOff: 0 });
    mockPrisma.quotation.update.mockResolvedValue({ id: "q1", notes: "updated" });

    const res = await PUT(
      makeJsonRequest("http://localhost/api/quotations/q1", "PUT", { notes: "updated", includeGst: false }),
      makeParams({ id: "q1" })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "q1" },
        data: { notes: "updated", includeGst: false },
      })
    );
    expect(mockPrisma.quotationItem.deleteMany).not.toHaveBeenCalled();
  });

  it("recalculates totals and replaces line items in a transaction when items are provided", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({
      id: "q1",
      status: "DRAFT",
      discount: 0,
      includeGst: true,
      roundOff: 0,
    });
    mockPrisma.quotation.update.mockResolvedValue({ id: "q1", grandTotal: 1180 });

    const res = await PUT(
      makeJsonRequest("http://localhost/api/quotations/q1", "PUT", {
        items: [{ name: "Speaker", quantity: 1, unitPrice: 1000, gstRate: 18, divisionId: "div_1" }],
      }),
      makeParams({ id: "q1" })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.quotationItem.deleteMany).toHaveBeenCalledWith({ where: { quotationId: "q1" } });
    expect(mockPrisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "q1" },
        data: expect.objectContaining({ subtotal: 1000, gstAmount: 180, grandTotal: 1180 }),
      })
    );
  });
});
