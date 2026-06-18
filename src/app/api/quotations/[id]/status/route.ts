import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { QuotationStatus } from "@/generated/prisma/client";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["APPROVED", "DRAFT"],
  APPROVED: ["IN_PRODUCTION"],
  IN_PRODUCTION: ["COMPLETED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const { status } = await request.json();

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { payments: true },
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

    const updated = await prisma.quotation.update({
      where: { id },
      data,
      include: { customer: true },
    });

    return jsonResponse(updated);
  });
}
