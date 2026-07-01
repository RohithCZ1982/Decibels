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

describe("GET /api/salary-advances", () => {
  it("filters by employeeId when provided", async () => {
    mockPrisma.salaryAdvance.findMany.mockResolvedValue([]);
    await GET(makeRequest("http://localhost/api/salary-advances?employeeId=emp_1"));
    expect(mockPrisma.salaryAdvance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: "emp_1" } })
    );
  });
});

describe("POST /api/salary-advances", () => {
  const validBody = { employeeId: "emp_1", amount: 5000 };

  it("is admin-only", async () => {
    mockGetSession.mockResolvedValue(staffSession);
    const res = await POST(makeJsonRequest("http://localhost/api/salary-advances", "POST", validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when employeeId or amount is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/salary-advances", "POST", { employeeId: "emp_1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-positive amount", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/salary-advances", "POST", { ...validBody, amount: -100 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid date", async () => {
    const res = await POST(
      makeJsonRequest("http://localhost/api/salary-advances", "POST", { ...validBody, date: "nope" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the employee does not exist", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await POST(makeJsonRequest("http://localhost/api/salary-advances", "POST", validBody));
    expect(res.status).toBe(404);
  });

  it("defaults the interest rate to 2 when not provided", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp_1" });
    mockPrisma.salaryAdvance.create.mockResolvedValue({ id: "adv_1" });
    await POST(makeJsonRequest("http://localhost/api/salary-advances", "POST", validBody));
    expect(mockPrisma.salaryAdvance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ interestRate: 2 }) })
    );
  });
});
