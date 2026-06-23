import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = employeeId;

    const salaries = await prisma.salary.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, baseSalary: true, role: true } },
        deductions: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return jsonResponse(salaries);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { employeeId, month, year, amount, notes } = body;

    if (!employeeId || !month || !year || amount == null) {
      return errorResponse("Employee, month, year, and amount are required");
    }

    const existing = await prisma.salary.findUnique({
      where: { employeeId_month_year: { employeeId, month: parseInt(month), year: parseInt(year) } },
    });
    if (existing) return errorResponse("Salary already exists for this month");

    const salary = await prisma.salary.create({
      data: {
        employeeId,
        month: parseInt(month),
        year: parseInt(year),
        amount: parseFloat(amount),
        notes: notes || null,
      },
      include: { employee: { select: { name: true } } },
    });
    return jsonResponse(salary, 201);
  }, "ADMIN");
}
