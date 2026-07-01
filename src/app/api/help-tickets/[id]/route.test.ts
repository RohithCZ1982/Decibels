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
import { PATCH, DELETE } from "./route";
import { makeJsonRequest, makeRequest, makeParams } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("PATCH /api/help-tickets/[id]", () => {
  it("rejects an invalid status", async () => {
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/help-tickets/t1", "PATCH", { status: "BOGUS" }),
      makeParams({ id: "t1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid status" });
  });

  it("returns 404 when the ticket does not exist", async () => {
    mockPrisma.helpTicket.findUnique.mockResolvedValue(null);
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/help-tickets/missing", "PATCH", { status: "FIXED" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the ticket status", async () => {
    mockPrisma.helpTicket.findUnique.mockResolvedValue({ id: "t1", status: "NEW" });
    mockPrisma.helpTicket.update.mockResolvedValue({ id: "t1", status: "FIXED" });
    const res = await PATCH(
      makeJsonRequest("http://localhost/api/help-tickets/t1", "PATCH", { status: "FIXED" }),
      makeParams({ id: "t1" })
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/help-tickets/[id]", () => {
  it("returns 404 when the ticket does not exist", async () => {
    mockPrisma.helpTicket.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/help-tickets/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("hard-deletes the ticket", async () => {
    mockPrisma.helpTicket.findUnique.mockResolvedValue({ id: "t1" });
    mockPrisma.helpTicket.delete.mockResolvedValue({ id: "t1" });
    const res = await DELETE(makeRequest("http://localhost/api/help-tickets/t1"), makeParams({ id: "t1" }));
    expect(res.status).toBe(200);
  });
});
