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

describe("PUT /api/subcategories/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.subCategory.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/subcategories/missing", "PUT", { name: "New" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the subcategory", async () => {
    mockPrisma.subCategory.findUnique.mockResolvedValue({ id: "sub_1" });
    mockPrisma.subCategory.update.mockResolvedValue({ id: "sub_1", name: "New" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/subcategories/sub_1", "PUT", { name: "New" }),
      makeParams({ id: "sub_1" })
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/subcategories/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.subCategory.findUnique.mockResolvedValue(null);
    const res = await DELETE(
      makeRequest("http://localhost/api/subcategories/missing"),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("soft-deletes the subcategory", async () => {
    mockPrisma.subCategory.findUnique.mockResolvedValue({ id: "sub_1" });
    mockPrisma.subCategory.update.mockResolvedValue({ id: "sub_1", deleted: true });
    const res = await DELETE(makeRequest("http://localhost/api/subcategories/sub_1"), makeParams({ id: "sub_1" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.subCategory.update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: { deleted: true },
    });
  });
});
