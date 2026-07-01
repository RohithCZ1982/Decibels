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
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("PUT /api/categories/[id]", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/categories/cat_1", "PUT", { name: "New" }),
      makeParams({ id: "cat_1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the category does not exist", async () => {
    mockPrisma.category.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/categories/missing", "PUT", { name: "New" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the category", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat_1" });
    mockPrisma.category.update.mockResolvedValue({ id: "cat_1", name: "New" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/categories/cat_1", "PUT", { name: "New" }),
      makeParams({ id: "cat_1" })
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("returns 404 when the category does not exist", async () => {
    mockPrisma.category.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/categories/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("cascades the soft delete to subcategories and the category itself", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat_1" });
    mockPrisma.subCategory.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.category.update.mockResolvedValue({ id: "cat_1", deleted: true });

    const res = await DELETE(makeRequest("http://localhost/api/categories/cat_1"), makeParams({ id: "cat_1" }));

    expect(res.status).toBe(200);
    expect(mockPrisma.subCategory.updateMany).toHaveBeenCalledWith({
      where: { categoryId: "cat_1" },
      data: { deleted: true },
    });
    expect(mockPrisma.category.update).toHaveBeenCalledWith({
      where: { id: "cat_1" },
      data: { deleted: true },
    });
  });
});
