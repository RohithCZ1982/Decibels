import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse, isValidPositiveNumber, isValidDate, validateEnum } from "@/lib/api-helpers";
import { PaymentMode } from "@/generated/prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { amount, date, mode, transactionId, notes } = body;

    if (!amount || !date || !mode) {
      return errorResponse("Amount, date, and payment mode are required");
    }
    if (!isValidPositiveNumber(amount)) {
      return errorResponse("Amount must be a valid positive number");
    }
    if (!isValidDate(date)) {
      return errorResponse("Invalid date format");
    }
    if (!validateEnum(mode, Object.values(PaymentMode))) {
      return errorResponse("Invalid payment mode");
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { payments: { select: { amount: true } } },
    });
    if (!quotation) return errorResponse("Quotation not found", 404);

    const parsedAmount = parseFloat(amount);
    const totalPaid = quotation.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid + parsedAmount > quotation.grandTotal) {
      return errorResponse(
        `Payment would exceed total. Grand total: ${quotation.grandTotal}, already paid: ${totalPaid}, remaining: ${quotation.grandTotal - totalPaid}`
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amount: parsedAmount,
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
