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

describe("GET /api/customers", () => {
  it("only lists members of type CUSTOMER", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.customer.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/customers"));
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "CUSTOMER" } })
    );
  });

  it("adds a search OR clause when a search term is given", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.customer.count.mockResolvedValue(0);
    await GET(makeRequest("http://localhost/api/customers?search=John"));
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: "CUSTOMER",
          OR: [
            { name: { contains: "John", mode: "insensitive" } },
            { mobile: { contains: "John" } },
            { email: { contains: "John", mode: "insensitive" } },
          ],
        },
      })
    );
  });
});

describe("POST /api/customers", () => {
  const validBody = { name: "John Doe", mobile: "9876543210" };

  it("returns 400 when name or mobile is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/customers", "POST", { name: "John" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name and mobile are required" });
  });

  it("returns 400 for an invalid mobile number", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/customers", "POST", { ...validBody, mobile: "12345" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Enter a valid 10-digit mobile number" });
  });

  it("returns 400 for an invalid email", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/customers", "POST", { ...validBody, email: "not-an-email" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Enter a valid email address" });
  });

  it("returns 400 for an invalid GST number", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/customers", "POST", { ...validBody, gstNumber: "invalid" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Enter a valid 15-character GST number" });
  });

  it("creates a customer with type CUSTOMER", async () => {
    mockPrisma.customer.create.mockResolvedValue({ id: "c1", ...validBody, type: "CUSTOMER" });
    const res = await POST(makeJsonRequest("http://localhost/api/customers", "POST", validBody));
    expect(res.status).toBe(201);
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "CUSTOMER" }) })
    );
  });
});
