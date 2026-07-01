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
import { GET, POST } from "./route";
import { makeJsonRequest } from "@/test/request";
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/templates", () => {
  it("lists only active templates", async () => {
    mockPrisma.template.findMany.mockResolvedValue([]);
    await GET();
    expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    );
  });
});

describe("POST /api/templates", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/templates", "POST", { name: "Atmos 7.2.4" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/templates", "POST", {}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name is required" });
  });

  it("creates a template with an empty item list when items is omitted", async () => {
    mockPrisma.template.create.mockResolvedValue({ id: "tpl_1", name: "Atmos 7.2.4" });
    const res = await POST(makeJsonRequest("http://localhost/api/templates", "POST", { name: "Atmos 7.2.4" }));
    expect(res.status).toBe(201);
    expect(mockPrisma.template.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ items: { create: [] } }) })
    );
  });

  it("defaults an item's quantity to 1 when not provided", async () => {
    mockPrisma.template.create.mockResolvedValue({ id: "tpl_2" });
    await POST(
      makeJsonRequest("http://localhost/api/templates", "POST", {
        name: "Basic Setup",
        items: [{ itemId: "item_1" }],
      })
    );
    expect(mockPrisma.template.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ items: { create: [{ itemId: "item_1", quantity: 1 }] } }),
      })
    );
  });
});
