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
import { POST } from "./route";
import { makeJsonRequest, makeParams } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("POST /api/quotations/[id]/payments", () => {
  const validBody = { amount: 500, date: "2026-01-01", mode: "CASH" };

  it("returns 400 when amount, date, or mode is missing", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/payments", "POST", { amount: 500 }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Amount, date, and payment mode are required" });
  });

  it("returns 400 when amount is not a positive number", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/payments", "POST", { ...validBody, amount: -5 }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Amount must be a valid positive number" });
  });

  it("returns 400 for an invalid date", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/payments", "POST", { ...validBody, date: "nope" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid date format" });
  });

  it("returns 400 for an invalid payment mode", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/payments", "POST", { ...validBody, mode: "BITCOIN" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid payment mode" });
  });

  it("returns 404 when the quotation does not exist", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue(null);
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/missing/payments", "POST", validBody),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("rejects a payment that would push the total paid past the grand total", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({
      id: "q1",
      grandTotal: 1000,
      payments: [{ amount: 600 }],
    });
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/payments", "POST", { ...validBody, amount: 500 }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Payment would exceed total. Grand total: 1000, already paid: 600, remaining: 400",
    });
  });

  it("records a payment that exactly covers the remaining balance", async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({
      id: "q1",
      grandTotal: 1000,
      payments: [{ amount: 600 }],
    });
    mockPrisma.payment.create.mockResolvedValue({ id: "pay_1", amount: 400 });

    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/payments", "POST", { ...validBody, amount: 400 }),
      makeParams({ id: "q1" })
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 400, quotationId: "q1", recordedById: adminSession.id }),
      })
    );
  });
});
