import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { amount, reason, date, notes } = body;

    const deduction = await prisma.salaryDeduction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(reason !== undefined && { reason }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });
    return jsonResponse(deduction);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    await prisma.salaryDeduction.delete({ where: { id } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
