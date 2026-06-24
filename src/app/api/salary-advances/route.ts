import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;

    const advances = await prisma.salaryAdvance.findMany({
      where,
      include: {
        employee: { select: { name: true, role: true } },
      },
      orderBy: { date: "desc" },
    });
    return jsonResponse(advances);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { employeeId, amount, interestRate, date, notes } = body;

    if (!employeeId || !amount) {
      return errorResponse("Employee and amount are required");
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return errorResponse("Employee not found", 404);

    const advance = await prisma.salaryAdvance.create({
      data: {
        employeeId,
        amount: parseFloat(amount),
        interestRate: parseFloat(interestRate) || 2,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
      include: {
        employee: { select: { name: true } },
      },
    });
    return jsonResponse(advance, 201);
  }, "ADMIN");
}
