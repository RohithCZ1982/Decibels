import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { amount, interestRate, date, notes } = body;

    const advance = await prisma.salaryAdvance.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(interestRate !== undefined && { interestRate: parseFloat(interestRate) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });
    return jsonResponse(advance);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    await prisma.salaryAdvance.delete({ where: { id } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
