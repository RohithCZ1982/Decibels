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

describe("GET /api/customers/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/customers/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the record exists but is a DEALER, not a CUSTOMER", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", type: "DEALER" });
    const res = await GET(makeRequest("http://localhost/api/customers/c1"), makeParams({ id: "c1" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Customer not found" });
  });

  it("returns the customer when found", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", type: "CUSTOMER" });
    const res = await GET(makeRequest("http://localhost/api/customers/c1"), makeParams({ id: "c1" }));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/customers/[id]", () => {
  it("returns 404 when the customer is actually a dealer", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", type: "DEALER" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/customers/c1", "PUT", { name: "New" }),
      makeParams({ id: "c1" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid mobile on update", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", type: "CUSTOMER" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/customers/c1", "PUT", { mobile: "123" }),
      makeParams({ id: "c1" })
    );
    expect(res.status).toBe(400);
  });

  it("updates the customer", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", type: "CUSTOMER" });
    mockPrisma.customer.update.mockResolvedValue({ id: "c1", name: "Updated" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/customers/c1", "PUT", { name: "Updated" }),
      makeParams({ id: "c1" })
    );
    expect(res.status).toBe(200);
  });
});
