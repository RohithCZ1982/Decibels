import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { calculateQuotationTotals, generateQuotationNumber } from "@/lib/quotation-calc";

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
    const {
      customerId, templateId, title, items, notes, terms,
      discount, validUntil,
      quotationNumber: userQuotationNumber,
      billDate,
      includeGst,
      enableRoundOff,
    } = body;

    if (!customerId || !items || items.length === 0) {
      return errorResponse("Customer and at least one item are required");
    }

    const disc = discount ?? 0;
    const calc = calculateQuotationTotals({
      items,
      discount: disc,
      includeGst: includeGst ?? true,
      roundOff: enableRoundOff ?? false,
    });

    let quotationNumber: string;
    if (userQuotationNumber?.trim()) {
      quotationNumber = userQuotationNumber.trim();
      const existing = await prisma.quotation.findUnique({ where: { quotationNumber } });
      if (existing) {
        return errorResponse("This quotation number is already in use");
      }
    } else {
      quotationNumber = generateQuotationNumber();
      const existing = await prisma.quotation.findUnique({ where: { quotationNumber } });
      if (existing) quotationNumber = generateQuotationNumber();
    }

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        title: title || null,
        customerId,
        templateId: templateId || null,
        createdById: session.id,
        subtotal: calc.subtotal,
        gstPercent: 0,
        gstAmount: calc.gstAmount,
        discount: calc.discount,
        grandTotal: calc.grandTotal,
        roundOff: calc.roundOff,
        includeGst: includeGst ?? true,
        billDate: billDate ? new Date(billDate) : new Date(),
        notes,
        terms: terms || "1. Prices are valid for 30 days from the date of quotation.\n2. 50% advance payment required to confirm the order.\n3. Balance payment due before installation.\n4. Installation timeline: 4-6 weeks from order confirmation.\n5. 1-year warranty on all equipment and installation.",
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: {
          create: items.map((item: { name: string; description?: string; hsnCode?: string; quantity: number; unit?: string; unitPrice: number; discount?: number; gstRate?: number; itemId?: string; notes?: string }, idx: number) => ({
            name: item.name,
            description: item.description || null,
            hsnCode: item.hsnCode || null,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || "No",
            unitPrice: Number(item.unitPrice) || 0,
            discount: Number(item.discount) || 0,
            gstRate: Number(item.gstRate) ?? 18,
            total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0) * (1 - (Number(item.discount) || 0) / 100),
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
