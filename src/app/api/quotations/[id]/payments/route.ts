import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { amount, date, mode, transactionId, notes } = body;

    if (!amount || !date || !mode) {
      return errorResponse("Amount, date, and payment mode are required");
    }

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) return errorResponse("Quotation not found", 404);

    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        date: new Date(date),
        mode,
        transactionId,
        notes,
        quotationId: id,
        recordedById: session.id,
      },
      include: { recordedBy: { select: { name: true } } },
    });

    return jsonResponse(payment, 201);
  });
}
