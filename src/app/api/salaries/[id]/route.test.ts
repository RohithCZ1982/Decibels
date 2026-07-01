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

describe("PUT /api/salaries/[id]", () => {
  it("returns 400 for a non-numeric amount", async () => {
    const res = await PUT(
      makeJsonRequest("http://localhost/api/salaries/sal_1", "PUT", { amount: "abc" }),
      makeParams({ id: "sal_1" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    mockPrisma.salary.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/salaries/missing", "PUT", { amount: 100 }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the salary record", async () => {
    mockPrisma.salary.findUnique.mockResolvedValue({ id: "sal_1" });
    mockPrisma.salary.update.mockResolvedValue({ id: "sal_1", amount: 35000 });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/salaries/sal_1", "PUT", { amount: 35000 }),
      makeParams({ id: "sal_1" })
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/salaries/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.salary.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/salaries/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("hard-deletes the salary record", async () => {
    mockPrisma.salary.findUnique.mockResolvedValue({ id: "sal_1" });
    mockPrisma.salary.delete.mockResolvedValue({ id: "sal_1" });
    const res = await DELETE(makeRequest("http://localhost/api/salaries/sal_1"), makeParams({ id: "sal_1" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.salary.delete).toHaveBeenCalledWith({ where: { id: "sal_1" } });
  });
});
