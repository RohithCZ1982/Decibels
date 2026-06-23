import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { amount, notes } = body;

    const salary = await prisma.salary.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: { employee: { select: { name: true } } },
    });
    return jsonResponse(salary);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    await prisma.salary.delete({ where: { id } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
