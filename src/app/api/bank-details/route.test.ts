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
import { makeJsonRequest } from "@/test/request";
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/bank-details", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("lists bank details", async () => {
    mockPrisma.bankDetail.findMany.mockResolvedValue([{ id: "b1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("POST /api/bank-details", () => {
  const validBody = { name: "Main", bankName: "HDFC", ifscCode: "HDFC0001234", accountNumber: "123456789" };

  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/bank-details", "POST", validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when a required field is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/bank-details", "POST", { name: "Main" }));
    expect(res.status).toBe(400);
  });

  it("deactivates other active bank details when the new one is set active", async () => {
    mockPrisma.bankDetail.create.mockResolvedValue({ id: "b1", active: true });
    const res = await POST(makeJsonRequest("http://localhost/api/bank-details", "POST", { ...validBody, active: true }));
    expect(res.status).toBe(201);
    expect(mockPrisma.bankDetail.updateMany).toHaveBeenCalledWith({
      where: { active: true },
      data: { active: false },
    });
  });

  it("does not touch other bank details when the new one is not active", async () => {
    mockPrisma.bankDetail.create.mockResolvedValue({ id: "b1", active: false });
    await POST(makeJsonRequest("http://localhost/api/bank-details", "POST", validBody));
    expect(mockPrisma.bankDetail.updateMany).not.toHaveBeenCalled();
  });
});
