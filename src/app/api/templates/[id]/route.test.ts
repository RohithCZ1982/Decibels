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

describe("GET /api/templates/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.template.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/templates/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("returns the template when found", async () => {
    mockPrisma.template.findUnique.mockResolvedValue({ id: "tpl_1" });
    const res = await GET(makeRequest("http://localhost/api/templates/tpl_1"), makeParams({ id: "tpl_1" }));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/templates/[id]", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/templates/tpl_1", "PUT", { name: "New" }),
      makeParams({ id: "tpl_1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when not found", async () => {
    mockPrisma.template.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/templates/missing", "PUT", { name: "New" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("replaces template items by deleting existing ones before recreating", async () => {
    mockPrisma.template.findUnique.mockResolvedValue({ id: "tpl_1" });
    mockPrisma.template.update.mockResolvedValue({ id: "tpl_1" });

    await PUT(
      makeJsonRequest("http://localhost/api/templates/tpl_1", "PUT", {
        items: [{ itemId: "item_1", quantity: 2 }],
      }),
      makeParams({ id: "tpl_1" })
    );

    expect(mockPrisma.templateItem.deleteMany).toHaveBeenCalledWith({ where: { templateId: "tpl_1" } });
    expect(mockPrisma.template.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ items: { create: [{ itemId: "item_1", quantity: 2 }] } }),
      })
    );
  });
});

describe("DELETE /api/templates/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.template.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/templates/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("soft-deletes by setting active to false", async () => {
    mockPrisma.template.findUnique.mockResolvedValue({ id: "tpl_1" });
    mockPrisma.template.update.mockResolvedValue({ id: "tpl_1", active: false });
    const res = await DELETE(makeRequest("http://localhost/api/templates/tpl_1"), makeParams({ id: "tpl_1" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.template.update).toHaveBeenCalledWith({ where: { id: "tpl_1" }, data: { active: false } });
  });
});
