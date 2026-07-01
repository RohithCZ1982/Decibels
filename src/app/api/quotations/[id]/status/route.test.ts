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
import { PATCH } from "./route";
import { makeJsonRequest, makeParams } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("PATCH /api/quotations/[id]/status", () => {
  it("returns 404 when the quotation does not exist", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue(null);
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/quotations/q1/status", "PATCH", { status: "SENT" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(404);
  });

  it("rejects a status transition that is not in the allow-list", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "q1", status: "DRAFT", payments: [], items: [] });
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/quotations/q1/status", "PATCH", { status: "COMPLETED" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cannot transition from DRAFT to COMPLETED" });
  });

  it("allows DRAFT -> SENT", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "q1", status: "DRAFT", payments: [], items: [] });
    mockPrisma.quotation.update.mockResolvedValue({ id: "q1", status: "SENT" });
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/quotations/q1/status", "PATCH", { status: "SENT" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "q1" }, data: { status: "SENT" } })
    );
  });

  it("rejects closing a quotation with an outstanding balance", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({
      id: "q1",
      status: "COMPLETED",
      grandTotal: 1000,
      payments: [{ amount: 400 }],
      items: [],
    });
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/quotations/q1/status", "PATCH", { status: "CLOSED" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cannot close: outstanding balance remains" });
  });

  it("allows closing a quotation once fully paid", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({
      id: "q1",
      status: "COMPLETED",
      grandTotal: 1000,
      payments: [{ amount: 600 }, { amount: 400 }],
      items: [],
    });
    mockPrisma.quotation.update.mockResolvedValue({ id: "q1", status: "CLOSED" });
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/quotations/q1/status", "PATCH", { status: "CLOSED" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(200);
  });

  it("stamps completionDate when transitioning to COMPLETED", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({ id: "q1", status: "IN_PRODUCTION", payments: [], items: [] });
    mockPrisma.quotation.update.mockResolvedValue({ id: "q1", status: "COMPLETED" });
    await PATCH(
      makeJsonRequest("http://localhost/api/quotations/q1/status", "PATCH", { status: "COMPLETED" }),
      makeParams({ id: "q1" })
    );
    expect(mockPrisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", completionDate: expect.any(Date) }),
      })
    );
  });

  it("moving to IN_PRODUCTION creates stock-out transactions and decrements stock for managed items only", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({
      id: "q1",
      status: "APPROVED",
      quotationNumber: "DEC-2601-0001",
      payments: [],
      items: [
        { id: "li1", quantity: 3, item: { id: "item_1", manageStock: true, stock: 10 } },
        { id: "li2", quantity: 1, item: { id: "item_2", manageStock: false, stock: 5 } },
        { id: "li3", quantity: 100, item: { id: "item_3", manageStock: true, stock: 2 } },
      ],
    });

    const res = await PATCH(
      makeJsonRequest("http://localhost/api/quotations/q1/status", "PATCH", { status: "IN_PRODUCTION" }),
      makeParams({ id: "q1" })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.stockTransaction.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.stockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemId: "item_1", quantity: 3, type: "SALE_OUT" }) })
    );
    // stock never goes below zero even if the sale exceeds what's on hand
    expect(mockPrisma.item.update).toHaveBeenCalledWith({ where: { id: "item_1" }, data: { stock: 7 } });
    expect(mockPrisma.item.update).toHaveBeenCalledWith({ where: { id: "item_3" }, data: { stock: 0 } });
    expect(mockPrisma.item.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: "item_2" } }));
  });
});
