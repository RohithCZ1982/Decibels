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

describe("PUT /api/notes/[noteId]", () => {
  it("returns 400 when content is blank or whitespace-only", async () => {
    const res = await PUT(
      makeJsonRequest("http://localhost/api/notes/n1", "PUT", { content: "   " }),
      makeParams({ noteId: "n1" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Content is required" });
  });

  it("returns 404 when the note does not exist", async () => {
    mockPrisma.projectNote.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/notes/missing", "PUT", { content: "updated" }),
      makeParams({ noteId: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the note content", async () => {
    mockPrisma.projectNote.findUnique.mockResolvedValue({ id: "n1", content: "old" });
    mockPrisma.projectNote.update.mockResolvedValue({ id: "n1", content: "new" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/notes/n1", "PUT", { content: "new" }),
      makeParams({ noteId: "n1" })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.projectNote.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "n1" }, data: { content: "new" } })
    );
  });
});

describe("DELETE /api/notes/[noteId]", () => {
  it("returns 404 when the note does not exist", async () => {
    mockPrisma.projectNote.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/notes/missing"), makeParams({ noteId: "missing" }));
    expect(res.status).toBe(404);
  });

  it("deletes an existing note", async () => {
    mockPrisma.projectNote.findUnique.mockResolvedValue({ id: "n1" });
    mockPrisma.projectNote.delete.mockResolvedValue({ id: "n1" });
    const res = await DELETE(makeRequest("http://localhost/api/notes/n1"), makeParams({ noteId: "n1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
