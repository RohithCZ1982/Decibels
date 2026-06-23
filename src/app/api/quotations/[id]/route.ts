import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { calculateQuotationTotals, EDITABLE_STATUSES } from "@/lib/quotation-calc";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        template: true,
        items: { include: { item: { include: { category: true } } }, orderBy: { sortOrder: "asc" } },
        payments: { orderBy: { date: "desc" }, include: { recordedBy: { select: { name: true } } } },
        projectNotes: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!quotation) return errorResponse("Quotation not found", 404);
    return jsonResponse(quotation);
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { items, notes, terms, discount, validUntil, billDate, includeGst, enableRoundOff } = body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return errorResponse("Quotation not found", 404);
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return errorResponse("Cannot edit quotations in COMPLETED or CLOSED status");
    }

    if (items) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

      const disc = discount ?? existing.discount;
      const gstFlag = includeGst ?? existing.includeGst;
      const calc = calculateQuotationTotals({
        items,
        discount: disc,
        includeGst: gstFlag,
        roundOff: enableRoundOff ?? (existing.roundOff !== 0),
      });

      const quotation = await prisma.quotation.update({
        where: { id },
        data: {
          subtotal: calc.subtotal,
          gstPercent: 0,
          gstAmount: calc.gstAmount,
          discount: calc.discount,
          grandTotal: calc.grandTotal,
          roundOff: calc.roundOff,
          includeGst: gstFlag,
          billDate: billDate ? new Date(billDate) : undefined,
          notes,
          terms,
          validUntil: validUntil ? new Date(validUntil) : undefined,
          items: {
            create: items.map((item: { name: string; description?: string; hsnCode?: string; quantity: number; unit?: string; unitPrice: number; gstRate?: number; itemId?: string; notes?: string }, idx: number) => ({
              name: item.name,
              description: item.description || null,
              hsnCode: item.hsnCode || null,
              quantity: item.quantity,
              unit: item.unit || "No",
              unitPrice: item.unitPrice,
              gstRate: item.gstRate ?? 18,
              total: item.quantity * item.unitPrice,
              itemId: item.itemId || null,
              notes: item.notes || null,
              sortOrder: idx,
            })),
          },
        },
        include: {
          customer: true,
          items: { orderBy: { sortOrder: "asc" } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      return jsonResponse(quotation);
    }

    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (terms !== undefined) updateData.terms = terms;
    if (billDate !== undefined) updateData.billDate = new Date(billDate);
    if (includeGst !== undefined) updateData.includeGst = includeGst;

    const quotation = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
    });
    return jsonResponse(quotation);
  });
}
