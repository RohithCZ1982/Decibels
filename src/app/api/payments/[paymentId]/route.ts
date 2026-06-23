import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  return withAuth(async () => {
    const { paymentId } = await params;
    const body = await request.json();
    const { amount, date, mode, transactionId, notes } = body;

    const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) return errorResponse("Payment not found", 404);

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        date: date ? new Date(date) : undefined,
        mode: mode || undefined,
        transactionId: transactionId !== undefined ? transactionId : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: { recordedBy: { select: { name: true } } },
    });

    return jsonResponse(payment);
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  return withAuth(async () => {
    const { paymentId } = await params;

    const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) return errorResponse("Payment not found", 404);

    await prisma.payment.delete({ where: { id: paymentId } });

    return jsonResponse({ success: true });
  });
}
