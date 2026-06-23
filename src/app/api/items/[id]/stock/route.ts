import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { StockTransactionType } from "@/generated/prisma/client";

const STOCK_IN_TYPES: StockTransactionType[] = ["PURCHASE_IN", "INITIAL", "RETURN"];
const STOCK_OUT_TYPES: StockTransactionType[] = ["SALE_OUT"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;

    const transactions = await prisma.stockTransaction.findMany({
      where: { itemId: id },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        quotation: { select: { quotationNumber: true } },
      },
      take: 50,
    });

    return jsonResponse(transactions);
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { type, quantity, notes } = body;

    if (!type || !quantity || quantity <= 0) {
      return errorResponse("Type and positive quantity are required");
    }

    const validTypes: StockTransactionType[] = ["PURCHASE_IN", "ADJUSTMENT", "INITIAL", "RETURN"];
    if (!validTypes.includes(type)) {
      return errorResponse("Invalid transaction type for manual adjustment");
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return errorResponse("Item not found", 404);

    const isStockIn = STOCK_IN_TYPES.includes(type) || (type === "ADJUSTMENT" && true);
    const stockDelta = isStockIn ? quantity : -quantity;
    const newStock = (item.stock || 0) + stockDelta;

    const [transaction] = await prisma.$transaction([
      prisma.stockTransaction.create({
        data: {
          type,
          quantity: parseInt(quantity),
          notes: notes || null,
          itemId: id,
          createdById: session.id,
        },
        include: {
          createdBy: { select: { name: true } },
        },
      }),
      prisma.item.update({
        where: { id },
        data: { stock: Math.max(0, newStock) },
      }),
    ]);

    return jsonResponse(transaction, 201);
  }, "ADMIN");
}
