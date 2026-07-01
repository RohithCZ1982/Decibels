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

describe("PUT /api/salary-advances/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.salaryAdvance.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/salary-advances/missing", "PUT", { amount: 100 }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the advance", async () => {
    mockPrisma.salaryAdvance.findUnique.mockResolvedValue({ id: "adv_1" });
    mockPrisma.salaryAdvance.update.mockResolvedValue({ id: "adv_1", amount: 6000 });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/salary-advances/adv_1", "PUT", { amount: 6000 }),
      makeParams({ id: "adv_1" })
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/salary-advances/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.salaryAdvance.findUnique.mockResolvedValue(null);
    const res = await DELETE(
      makeRequest("http://localhost/api/salary-advances/missing"),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("hard-deletes the advance", async () => {
    mockPrisma.salaryAdvance.findUnique.mockResolvedValue({ id: "adv_1" });
    mockPrisma.salaryAdvance.delete.mockResolvedValue({ id: "adv_1" });
    const res = await DELETE(makeRequest("http://localhost/api/salary-advances/adv_1"), makeParams({ id: "adv_1" }));
    expect(res.status).toBe(200);
  });
});
