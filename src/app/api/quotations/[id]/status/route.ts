import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { QuotationStatus } from "@/generated/prisma/client";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["APPROVED", "DRAFT"],
  APPROVED: ["IN_PRODUCTION", "SENT"],
  IN_PRODUCTION: ["COMPLETED", "APPROVED"],
  COMPLETED: ["CLOSED", "IN_PRODUCTION"],
  CLOSED: ["COMPLETED"],
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await params;
    const { status } = await request.json();

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        payments: true,
        items: {
          include: {
            item: { select: { id: true, manageStock: true, stock: true } },
          },
        },
      },
    });
    if (!quotation) return errorResponse("Quotation not found", 404);

    const validNext = VALID_TRANSITIONS[quotation.status];
    if (!validNext?.includes(status)) {
      return errorResponse(`Cannot transition from ${quotation.status} to ${status}`);
    }

    if (status === "CLOSED") {
      const totalPaid = quotation.payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid < quotation.grandTotal) {
        return errorResponse("Cannot close: outstanding balance remains");
      }
    }

    const data: Record<string, unknown> = { status: status as QuotationStatus };
    if (status === "COMPLETED") data.completionDate = new Date();

    if (status === "IN_PRODUCTION") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ops: any[] = [
        prisma.quotation.update({ where: { id }, data }),
      ];

      for (const lineItem of quotation.items) {
        if (!lineItem.item?.manageStock || !lineItem.item.id) continue;

        ops.push(
          prisma.stockTransaction.create({
            data: {
              type: "SALE_OUT",
              quantity: lineItem.quantity,
              notes: `Quotation ${quotation.quotationNumber} moved to production`,
              itemId: lineItem.item.id,
              quotationId: id,
              createdById: session.id,
            },
          })
        );

        const newStock = Math.max(0, (lineItem.item.stock || 0) - lineItem.quantity);
        ops.push(
          prisma.item.update({
            where: { id: lineItem.item.id },
            data: { stock: newStock },
          })
        );
      }

      await prisma.$transaction(ops);

      const updated = await prisma.quotation.findUnique({
        where: { id },
        include: { customer: true },
      });
      return jsonResponse(updated);
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data,
      include: { customer: true },
    });

    return jsonResponse(updated);
  });
}
