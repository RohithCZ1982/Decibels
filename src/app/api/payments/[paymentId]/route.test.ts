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
import { PUT, DELETE } from "./route";
import { makeJsonRequest, makeRequest, makeParams } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("PUT /api/payments/[paymentId]", () => {
  it("returns 400 for an invalid amount", async () => {
    const res = await PUT(
      makeJsonRequest("http://localhost/api/payments/p1", "PUT", { amount: "abc" }),
      makeParams({ paymentId: "p1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Amount must be a valid number" });
  });

  it("returns 400 for an invalid date", async () => {
    const res = await PUT(
      makeJsonRequest("http://localhost/api/payments/p1", "PUT", { date: "nope" }),
      makeParams({ paymentId: "p1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid date format" });
  });

  it("returns 400 for an invalid payment mode", async () => {
    const res = await PUT(
      makeJsonRequest("http://localhost/api/payments/p1", "PUT", { mode: "BITCOIN" }),
      makeParams({ paymentId: "p1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid payment mode" });
  });

  it("returns 404 when the payment does not exist", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/payments/missing", "PUT", { amount: 100 }),
      makeParams({ paymentId: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates only the provided fields", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: "p1", amount: 500 });
    mockPrisma.payment.update.mockResolvedValue({ id: "p1", amount: 750 });

    const res = await PUT(
      makeJsonRequest("http://localhost/api/payments/p1", "PUT", { amount: 750 }),
      makeParams({ paymentId: "p1" })
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ amount: 750, date: undefined, mode: undefined }),
      })
    );
  });
});

describe("DELETE /api/payments/[paymentId]", () => {
  it("returns 404 when the payment does not exist", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/payments/missing"), makeParams({ paymentId: "missing" }));
    expect(res.status).toBe(404);
  });

  it("deletes an existing payment", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: "p1" });
    mockPrisma.payment.delete.mockResolvedValue({ id: "p1" });
    const res = await DELETE(makeRequest("http://localhost/api/payments/p1"), makeParams({ paymentId: "p1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockPrisma.payment.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
