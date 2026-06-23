import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const where = all ? {} : { active: true };
    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return jsonResponse(employees);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, mobile, email, role, baseSalary, advanceLimit, joinDate } = body;
    if (!name) return errorResponse("Name is required");

    const employee = await prisma.employee.create({
      data: {
        name,
        mobile: mobile || null,
        email: email || null,
        role: role || null,
        baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
        advanceLimit: advanceLimit ? parseFloat(advanceLimit) : 0,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
      },
    });
    return jsonResponse(employee, 201);
  }, "ADMIN");
}
