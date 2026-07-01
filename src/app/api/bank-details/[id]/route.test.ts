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

describe("PUT /api/bank-details/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.bankDetail.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/bank-details/missing", "PUT", { name: "New" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("deactivates other active bank details (excluding itself) when set active", async () => {
    mockPrisma.bankDetail.findUnique.mockResolvedValue({ id: "b1" });
    mockPrisma.bankDetail.update.mockResolvedValue({ id: "b1", active: true });

    await PUT(
      makeJsonRequest("http://localhost/api/bank-details/b1", "PUT", { active: true }),
      makeParams({ id: "b1" })
    );

    expect(mockPrisma.bankDetail.updateMany).toHaveBeenCalledWith({
      where: { active: true, id: { not: "b1" } },
      data: { active: false },
    });
  });
});

describe("DELETE /api/bank-details/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.bankDetail.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/bank-details/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("hard-deletes the bank detail", async () => {
    mockPrisma.bankDetail.findUnique.mockResolvedValue({ id: "b1" });
    mockPrisma.bankDetail.delete.mockResolvedValue({ id: "b1" });
    const res = await DELETE(makeRequest("http://localhost/api/bank-details/b1"), makeParams({ id: "b1" }));
    expect(res.status).toBe(200);
  });
});
