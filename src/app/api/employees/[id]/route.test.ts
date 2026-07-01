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

describe("GET /api/employees/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/employees/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("returns the employee when found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp_1" });
    const res = await GET(makeRequest("http://localhost/api/employees/emp_1"), makeParams({ id: "emp_1" }));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/employees/[id]", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/employees/emp_1", "PUT", { name: "New" }),
      makeParams({ id: "emp_1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await PUT(
      makeJsonRequest("http://localhost/api/employees/missing", "PUT", { name: "New" }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("updates the employee", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp_1" });
    mockPrisma.employee.update.mockResolvedValue({ id: "emp_1", name: "New" });
    const res = await PUT(
      makeJsonRequest("http://localhost/api/employees/emp_1", "PUT", { name: "New" }),
      makeParams({ id: "emp_1" })
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/employees/[id]", () => {
  it("returns 404 when not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("http://localhost/api/employees/missing"), makeParams({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("soft-deletes by setting active to false", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp_1" });
    mockPrisma.employee.update.mockResolvedValue({ id: "emp_1", active: false });
    const res = await DELETE(makeRequest("http://localhost/api/employees/emp_1"), makeParams({ id: "emp_1" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({ where: { id: "emp_1" }, data: { active: false } });
  });
});
