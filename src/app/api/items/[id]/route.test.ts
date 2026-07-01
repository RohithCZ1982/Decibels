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
import { GET, PUT, DELETE } from "./route";
import { makeRequest, makeJsonRequest, makeParams } from "@/test/request";
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/items/[id]", () => {
  it("returns 404 when the item does not exist", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/items/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("returns the item when found", async () => {
    mockPrisma.item.findUnique.mockResolvedValue({ id: "i1", name: "Speaker" });
    const res = await GET(makeRequest("http://localhost/api/items/i1"), makeParams({ id: "i1" }));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/items/[id]", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/items/i1", "PUT", { name: "New" }),
      makeParams({ id: "i1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid unitPrice", async () => {
    const res = await PUT(
      makeJsonRequest("http://localhost/api/items/i1", "PUT", { unitPrice: "abc" }),
      makeParams({ id: "i1" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the item does not exist", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/items/missing", "PUT", { name: "New" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("rejects renaming the code to one already used by another item", async () => {
    mockPrisma.item.findUnique.mockResolvedValueOnce({ id: "i1", code: "0001" });
    mockPrisma.item.findUnique.mockResolvedValueOnce({ id: "i2", code: "0002" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/items/i1", "PUT", { code: "0002" }),
      makeParams({ id: "i1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Item code already exists" });
  });

  it("updates only the fields provided", async () => {
    mockPrisma.item.findUnique.mockResolvedValueOnce({ id: "i1", code: "0001" });
    mockPrisma.item.update.mockResolvedValue({ id: "i1", name: "Updated" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/items/i1", "PUT", { name: "Updated" }),
      makeParams({ id: "i1" })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "i1" }, data: { name: "Updated" } })
    );
  });
});

describe("DELETE /api/items/[id]", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await DELETE(makeRequest("http://localhost/api/items/i1"), makeParams({ id: "i1" }));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the item does not exist", async () => {
    mockPrisma.item.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/items/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("soft-deletes by setting active to false rather than removing the row", async () => {
    mockPrisma.item.findUnique.mockResolvedValue({ id: "i1", active: true });
    mockPrisma.item.update.mockResolvedValue({ id: "i1", active: false });
    const res = await DELETE(makeRequest("http://localhost/api/items/i1"), makeParams({ id: "i1" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.item.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { active: false } });
    expect(mockPrisma.item.delete).not.toHaveBeenCalled();
  });
});
