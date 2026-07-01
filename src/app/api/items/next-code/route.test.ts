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

describe("GET /api/items/next-code", () => {
  it("returns 0001 when there are no existing items", async () => {
    mockPrisma.item.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(await res.json()).toEqual({ code: "0001" });
  });

  it("returns one past the highest existing numeric code suffix", async () => {
    mockPrisma.item.findMany.mockResolvedValue([{ code: "0005" }, { code: "0012" }, { code: "0003" }]);
    const res = await GET();
    expect(await res.json()).toEqual({ code: "0013" });
  });

  it("ignores codes without a trailing numeric segment", async () => {
    mockPrisma.item.findMany.mockResolvedValue([{ code: "SPEAKER" }, { code: "0007" }]);
    const res = await GET();
    expect(await res.json()).toEqual({ code: "0008" });
  });
});
