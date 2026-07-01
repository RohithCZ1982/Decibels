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

describe("GET /api/dealers", () => {
  it("only lists members of type DEALER", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.customer.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/dealers"));
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "DEALER" } })
    );
  });
});

describe("POST /api/dealers", () => {
  const validBody = { name: "Acme Distributors", mobile: "9876543210" };

  it("returns 400 when name or mobile is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/dealers", "POST", { name: "Acme" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid mobile", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/dealers", "POST", { ...validBody, mobile: "123" })
    );
    expect(res.status).toBe(400);
  });

  it("creates a customer record with type DEALER", async () => {
    mockPrisma.customer.create.mockResolvedValue({ id: "d1", ...validBody, type: "DEALER" });
    const res = await POST(makeJsonRequest("http://localhost/api/dealers", "POST", validBody));
    expect(res.status).toBe(201);
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "DEALER" }) })
    );
  });
});
