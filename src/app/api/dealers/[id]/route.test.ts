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

describe("GET /api/dealers/[id]", () => {
  it("returns 404 when the record exists but is a CUSTOMER, not a DEALER", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", type: "CUSTOMER" });
    const res = await GET(makeRequest("http://localhost/api/dealers/c1"), makeParams({ id: "c1" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Dealer not found" });
  });

  it("returns the dealer when found", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "d1", type: "DEALER" });
    const res = await GET(makeRequest("http://localhost/api/dealers/d1"), makeParams({ id: "d1" }));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/dealers/[id]", () => {
  it("returns 404 when the record is actually a customer", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", type: "CUSTOMER" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/dealers/c1", "PUT", { name: "New" }),
      makeParams({ id: "c1" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the dealer", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "d1", type: "DEALER" });
    mockPrisma.customer.update.mockResolvedValue({ id: "d1", name: "Updated" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/dealers/d1", "PUT", { name: "Updated" }),
      makeParams({ id: "d1" })
    );
    expect(res.status).toBe(200);
  });
});
