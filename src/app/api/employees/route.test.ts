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
import { makeRequest, makeJsonRequest } from "@/test/request";
import { adminSession, staffSession } from "@/test/fixtures";

const mockPrisma = prisma as unknown as MockPrisma;
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(adminSession);
});

describe("GET /api/employees", () => {
  it("defaults to only active employees", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/employees"));
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    );
  });

  it("includes inactive employees when all=true", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/employees?all=true"));
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});

describe("POST /api/employees", () => {
  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/employees", "POST", { name: "Ravi" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/employees", "POST", {}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name is required" });
  });

  it("creates the employee with numeric defaults", async () => {
    mockPrisma.employee.create.mockResolvedValue({ id: "emp_1", name: "Ravi" });
    const res = await POST(makeJsonRequest("http://localhost/api/employees", "POST", { name: "Ravi" }));
    expect(res.status).toBe(201);
    expect(mockPrisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ baseSalary: 0, advanceLimit: 0 }) })
    );
  });
});
