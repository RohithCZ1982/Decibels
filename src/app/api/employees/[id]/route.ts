import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return errorResponse("Employee not found", 404);
    return jsonResponse(employee);
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, mobile, email, role, baseSalary, advanceLimit, joinDate, active } = body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(mobile !== undefined && { mobile: mobile || null }),
        ...(email !== undefined && { email: email || null }),
        ...(role !== undefined && { role: role || null }),
        ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) }),
        ...(advanceLimit !== undefined && { advanceLimit: parseFloat(advanceLimit) }),
        ...(joinDate !== undefined && { joinDate: new Date(joinDate) }),
        ...(active !== undefined && { active }),
      },
    });
    return jsonResponse(employee);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    await prisma.employee.update({ where: { id }, data: { active: false } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
