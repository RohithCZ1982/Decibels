import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse, generateQuotationNumber } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { mobile: { contains: search } } },
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quotation.count({ where }),
    ]);

    return jsonResponse({ quotations, total, page, totalPages: Math.ceil(total / limit) });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    const body = await request.json();
    const { customerId, templateId, title, items, notes, terms, gstPercent, discount, validUntil } = body;

    if (!customerId || !items || items.length === 0) {
      return errorResponse("Customer and at least one item are required");
    }

    const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    const disc = discount ?? 0;
    const discountRatio = subtotal > 0 ? (subtotal - disc) / subtotal : 1;
    let gstAmount = 0;
    for (const item of items as { quantity: number; unitPrice: number; gstRate?: number }[]) {
      const lineTotal = item.quantity * item.unitPrice;
      const rate = item.gstRate ?? gstPercent ?? 18;
      gstAmount += (lineTotal * discountRatio * rate) / 100;
    }
    gstAmount = Math.round(gstAmount);
    const grandTotal = subtotal - disc + gstAmount;

    let quotationNumber = generateQuotationNumber();
    const existing = await prisma.quotation.findUnique({ where: { quotationNumber } });
    if (existing) quotationNumber = generateQuotationNumber();

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        title: title || null,
        customerId,
        templateId: templateId || null,
        createdById: session.id,
        subtotal,
        gstPercent: 0,
        gstAmount,
        discount: disc,
        grandTotal,
        notes,
        terms: terms || "1. Prices are valid for 30 days from the date of quotation.\n2. 50% advance payment required to confirm the order.\n3. Balance payment due before installation.\n4. Installation timeline: 4-6 weeks from order confirmation.\n5. 1-year warranty on all equipment and installation.",
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: {
          create: items.map((item: { name: string; hsnCode?: string; quantity: number; unit?: string; unitPrice: number; gstRate?: number; itemId?: string; notes?: string }, idx: number) => ({
            name: item.name,
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

    return jsonResponse(quotation, 201);
  });
}
