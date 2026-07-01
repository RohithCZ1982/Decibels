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
import { GET } from "./route";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/bank-details/active", () => {
  it("returns null when there is no active bank detail", async () => {
    mockPrisma.bankDetail.findFirst.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns the active bank detail", async () => {
    mockPrisma.bankDetail.findFirst.mockResolvedValue({ id: "b1", active: true });
    const res = await GET();
    expect(await res.json()).toEqual({ id: "b1", active: true });
    expect(mockPrisma.bankDetail.findFirst).toHaveBeenCalledWith({ where: { active: true } });
  });
});
