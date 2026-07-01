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

describe("GET /api/salary-deductions", () => {
  it("builds an OR clause matching either the linked salary's month/year or a dateless deduction within range", async () => {
    mockPrisma.salaryDeduction.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/salary-deductions?month=3&year=2026"));
    expect(mockPrisma.salaryDeduction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { salary: { month: 3, year: 2026 } },
            { salaryId: null, date: { gte: new Date(2026, 2, 1), lt: new Date(2026, 3, 1) } },
          ],
        }),
      })
    );
  });

  it("skips the month/year OR clause when salaryId is given", async () => {
    mockPrisma.salaryDeduction.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/salary-deductions?month=3&year=2026&salaryId=sal_1"));
    expect(mockPrisma.salaryDeduction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { salaryId: "sal_1" } })
    );
  });
});

describe("POST /api/salary-deductions", () => {
  const validBody = { employeeId: "emp_1", amount: 500, reason: "Late arrival" };

  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/salary-deductions", "POST", validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when employeeId, amount, or reason is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/salary-deductions", "POST", { employeeId: "emp_1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the employee does not exist", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await POST(makeJsonRequest("http://localhost/api/salary-deductions", "POST", validBody));
    expect(res.status).toBe(404);
  });

  it("rejects a deduction that would exceed the linked salary amount", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp_1" });
    mockPrisma.salary.findUnique.mockResolvedValue({
      id: "sal_1",
      amount: 1000,
      deductions: [{ amount: 700 }],
    });
    const res = await POST(
      makeJsonRequest("http://localhost/api/salary-deductions", "POST", { ...validBody, salaryId: "sal_1", amount: 400 })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Deduction would exceed salary. Salary: 1000, Existing deductions: 700",
    });
  });

  it("allows a deduction that fits within the remaining salary balance", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp_1" });
    mockPrisma.salary.findUnique.mockResolvedValue({
      id: "sal_1",
      amount: 1000,
      deductions: [{ amount: 700 }],
    });
    mockPrisma.salaryDeduction.create.mockResolvedValue({ id: "ded_1" });
    const res = await POST(
      makeJsonRequest("http://localhost/api/salary-deductions", "POST", { ...validBody, salaryId: "sal_1", amount: 300 })
    );
    expect(res.status).toBe(201);
  });

  it("creates a standalone deduction when no salaryId is given", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp_1" });
    mockPrisma.salaryDeduction.create.mockResolvedValue({ id: "ded_2" });
    const res = await POST(makeJsonRequest("http://localhost/api/salary-deductions", "POST", validBody));
    expect(res.status).toBe(201);
    expect(mockPrisma.salary.findUnique).not.toHaveBeenCalled();
  });
});
