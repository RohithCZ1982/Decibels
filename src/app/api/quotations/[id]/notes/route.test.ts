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
import { POST } from "./route";
import { makeJsonRequest, makeParams } from "@/test/request";
import { adminSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("POST /api/quotations/[id]/notes", () => {
  it("returns 400 when content is missing", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/notes", "POST", {}),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Content is required" });
  });

  it("creates a project note tied to the quotation and current user", async () => {
    mockPrisma.projectNote.create.mockResolvedValue({ id: "note_1", content: "Installed rack" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/quotations/q1/notes", "POST", { content: "Installed rack" }),
      makeParams({ id: "q1" })
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.projectNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: "Installed rack", quotationId: "q1", createdById: adminSession.id }),
      })
    );
  });
});
