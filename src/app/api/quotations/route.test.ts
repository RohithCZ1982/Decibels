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
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/quotations", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/quotations"));
    expect(res.status).toBe(401);
  });

  it("lists quotations with pagination metadata when no filters are given", async () => {
    mockPrisma.quotation.findMany.mockResolvedValue([{ id: "q1" }]);
    mockPrisma.quotation.count.mockResolvedValue(1);

    const res = await GET(makeRequest("http://localhost/api/quotations"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ quotations: [{ id: "q1" }], total: 1, page: 1, totalPages: 1 });
    expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 20 })
    );
  });

  it("rejects an invalid status filter", async () => {
    const res = await GET(makeRequest("http://localhost/api/quotations?status=BOGUS"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid status value" });
  });

  it("filters by a valid status", async () => {
    mockPrisma.quotation.findMany.mockResolvedValue([]);
    mockPrisma.quotation.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/quotations?status=DRAFT"));
    expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "DRAFT" } })
    );
  });

  it("rejects an invalid buyerType filter", async () => {
    const res = await GET(makeRequest("http://localhost/api/quotations?buyerType=BOGUS"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid buyer type value" });
  });

  it("filters by a valid buyerType", async () => {
    mockPrisma.quotation.findMany.mockResolvedValue([]);
    mockPrisma.quotation.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/quotations?buyerType=DEALER"));
    expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customer: { type: "DEALER" } } })
    );
  });

  it("builds a search OR clause across quotation number and customer fields", async () => {
    mockPrisma.quotation.findMany.mockResolvedValue([]);
    mockPrisma.quotation.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/quotations?search=DEC-2601"));
    expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { quotationNumber: { contains: "DEC-2601", mode: "insensitive" } },
            { customer: { name: { contains: "DEC-2601", mode: "insensitive" } } },
            { customer: { mobile: { contains: "DEC-2601" } } },
          ],
        },
      })
    );
  });

  it("clamps an out-of-range limit and applies page offset", async () => {
    mockPrisma.quotation.findMany.mockResolvedValue([]);
    mockPrisma.quotation.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/quotations?page=3&limit=500"));
    expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 200, take: 100 })
    );
  });
});

describe("POST /api/quotations", () => {
  const validItem = { name: "Speaker", quantity: 2, unitPrice: 5000, gstRate: 18, divisionId: "div_1" };

  it("returns 400 when customerId is missing", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", { items: [validItem] })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Customer and at least one item are required" });
  });

  it("returns 400 when items is an empty array", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", { customerId: "cust_1", items: [] })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid billDate", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", {
        customerId: "cust_1",
        items: [validItem],
        billDate: "not-a-date",
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid bill date format" });
  });

  it("returns 400 for an invalid validUntil date", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", {
        customerId: "cust_1",
        items: [validItem],
        validUntil: "not-a-date",
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid valid-until date format" });
  });

  it("rejects a user-supplied quotation number that is already in use", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", {
        customerId: "cust_1",
        items: [validItem],
        quotationNumber: "DEC-2601-0001",
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "This quotation number is already in use" });
    expect(mockPrisma.quotation.create).not.toHaveBeenCalled();
  });

  it("creates the quotation using the trimmed user-supplied number when available", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue(null);
    mockPrisma.quotation.create.mockResolvedValue({ id: "q_new", quotationNumber: "DEC-2601-0002" });

    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", {
        customerId: "cust_1",
        items: [validItem],
        quotationNumber: "  DEC-2601-0002  ",
      })
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.quotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quotationNumber: "DEC-2601-0002", createdById: adminSession.id }),
      })
    );
  });

  it("auto-generates a quotation number matching DEC-YYMM-XXXX when none is supplied", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue(null);
    mockPrisma.quotation.create.mockResolvedValue({ id: "q_auto" });

    await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", {
        customerId: "cust_1",
        items: [validItem],
      })
    );

    expect(mockPrisma.quotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quotationNumber: expect.stringMatching(/^DEC-\d{4}-\d{4}$/) }),
      })
    );
  });

  it("returns 500 after exhausting retries when every generated number collides", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "always-exists" });

    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", {
        customerId: "cust_1",
        items: [validItem],
      })
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Could not generate a unique quotation number. Please try again.",
    });
    expect(mockPrisma.quotation.findUnique).toHaveBeenCalledTimes(5);
    expect(mockPrisma.quotation.create).not.toHaveBeenCalled();
  });

  it("computes totals via calculateQuotationTotals and persists line items with sortOrder", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue(null);
    mockPrisma.quotation.create.mockResolvedValue({ id: "q_calc" });

    await POST(
      makeJsonRequest("http://localhost/api/quotations", "POST", {
        customerId: "cust_1",
        quotationNumber: "DEC-2601-0099",
        items: [
          { name: "Speaker", quantity: 2, unitPrice: 5000, gstRate: 18, divisionId: "div_1" },
          { name: "Cable", quantity: 1, unitPrice: 1000, gstRate: 18, divisionId: "div_1" },
        ],
        discount: 100,
      })
    );

    expect(mockPrisma.quotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 11000,
          discount: 100,
          // gst: 11000 * 18% = 1980
          gstAmount: 1980,
          grandTotal: 11000 + 1980 - 100,
          items: {
            create: [
              expect.objectContaining({ name: "Speaker", sortOrder: 0, total: 10000 }),
              expect.objectContaining({ name: "Cable", sortOrder: 1, total: 1000 }),
            ],
          },
        }),
      })
    );
  });
});
