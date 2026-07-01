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

describe("GET /api/salaries", () => {
  it("filters by month, year, and employeeId when provided", async () => {
    mockPrisma.salary.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/salaries?month=3&year=2026&employeeId=emp_1"));
    expect(mockPrisma.salary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { month: 3, year: 2026, employeeId: "emp_1" } })
    );
  });
});

describe("POST /api/salaries", () => {
  const validBody = { employeeId: "emp_1", month: 3, year: 2026, amount: 30000 };

  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/salaries", "POST", validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/salaries", "POST", { employeeId: "emp_1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-numeric amount", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/salaries", "POST", { ...validBody, amount: "abc" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Amount must be a valid number" });
  });

  it("returns 400 for a month outside 1-12", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/salaries", "POST", { ...validBody, month: 13 })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Month must be between 1 and 12" });
  });

  it("returns 400 when a salary already exists for that employee/month/year", async () => {
    mockPrisma.salary.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(makeJsonRequest("http://localhost/api/salaries", "POST", validBody));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Salary already exists for this month" });
  });

  it("creates the salary record", async () => {
    mockPrisma.salary.findUnique.mockResolvedValue(null);
    mockPrisma.salary.create.mockResolvedValue({ id: "sal_1" });
    const res = await POST(makeJsonRequest("http://localhost/api/salaries", "POST", validBody));
    expect(res.status).toBe(201);
    expect(mockPrisma.salary.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ month: 3, year: 2026, amount: 30000 }) })
    );
  });
});
