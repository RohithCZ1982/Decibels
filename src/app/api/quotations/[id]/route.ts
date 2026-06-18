import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        template: true,
        items: { include: { item: true }, orderBy: { sortOrder: "asc" } },
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
    const { items, notes, terms, gstPercent, discount, validUntil } = body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return errorResponse("Quotation not found", 404);
    if (existing.status !== "DRAFT") {
      return errorResponse("Can only edit quotations in DRAFT status");
    }

    if (items) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

      const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      const gst = gstPercent ?? existing.gstPercent;
      const disc = discount ?? existing.discount;
      const gstAmount = ((subtotal - disc) * gst) / 100;
      const grandTotal = subtotal - disc + gstAmount;

      const quotation = await prisma.quotation.update({
        where: { id },
        data: {
          subtotal,
          gstPercent: gst,
          gstAmount,
          discount: disc,
          grandTotal,
          notes,
          terms,
          validUntil: validUntil ? new Date(validUntil) : undefined,
          items: {
            create: items.map((item: { name: string; quantity: number; unitPrice: number; itemId?: string; notes?: string }, idx: number) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
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

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { notes, terms },
      include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
    });
    return jsonResponse(quotation);
  });
}
