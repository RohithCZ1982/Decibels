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
import { PUT } from "./route";
import { makeJsonRequest, makeParams } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("PUT /api/divisions/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.division.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/divisions/missing", "PUT", { name: "New" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("normalizes an updated slug", async () => {
    mockPrisma.division.findUnique.mockResolvedValue({ id: "div_1" });
    mockPrisma.division.update.mockResolvedValue({ id: "div_1", slug: "AV" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/divisions/div_1", "PUT", { slug: "av" }),
      makeParams({ id: "div_1" })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.division.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "AV" }) })
    );
  });
});
