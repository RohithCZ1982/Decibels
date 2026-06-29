import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse, isValidPositiveNumber, isValidDate } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const salaryId = searchParams.get("salaryId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const all = searchParams.get("all");

    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (salaryId) where.salaryId = salaryId;
    if (month && year && !salaryId && !all) {
      const m = parseInt(month);
      const y = parseInt(year);
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 1);
      where.OR = [
        { salary: { month: m, year: y } },
        { salaryId: null, date: { gte: monthStart, lt: monthEnd } },
      ];
    }

    const deductions = await prisma.salaryDeduction.findMany({
      where,
      include: {
        employee: { select: { name: true, role: true } },
        salary: { select: { month: true, year: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(deductions);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { employeeId, salaryId, amount, reason, date, notes } = body;

    if (!employeeId || !amount || !reason) {
      return errorResponse("Employee, amount, and reason are required");
    }
    if (!isValidPositiveNumber(amount)) {
      return errorResponse("Amount must be a valid positive number");
    }
    if (date && !isValidDate(date)) {
      return errorResponse("Invalid date format");
    }

    const parsedAmount = parseFloat(amount);

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return errorResponse("Employee not found", 404);

    if (salaryId) {
      const salary = await prisma.salary.findUnique({
        where: { id: salaryId },
        include: { deductions: true },
      });
      if (salary) {
        const existingDeductions = salary.deductions.reduce((s, d) => s + d.amount, 0);
        if (existingDeductions + parsedAmount > salary.amount) {
          return errorResponse(`Deduction would exceed salary. Salary: ${salary.amount}, Existing deductions: ${existingDeductions}`);
        }
      }
    }

    const deduction = await prisma.salaryDeduction.create({
      data: {
        employeeId,
        salaryId: salaryId || null,
        amount: parseFloat(amount),
        reason,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
      include: {
        employee: { select: { name: true } },
        salary: { select: { month: true, year: true } },
      },
    });
    return jsonResponse(deduction, 201);
  }, "ADMIN");
}
