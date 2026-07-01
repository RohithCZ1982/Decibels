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
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/help-tickets", () => {
  it("lists tickets", async () => {
    mockPrisma.helpTicket.findMany.mockResolvedValue([{ id: "t1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("POST /api/help-tickets", () => {
  it("returns 400 when description is blank", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/help-tickets", "POST", { description: "   " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Description is required" });
  });

  it("trims the description and ties the ticket to the current user", async () => {
    mockPrisma.helpTicket.create.mockResolvedValue({ id: "t1" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/help-tickets", "POST", { description: "  Broken login  " })
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.helpTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: "Broken login", createdById: adminSession.id }) })
    );
  });
});
