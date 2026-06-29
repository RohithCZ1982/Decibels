import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse, isValidNumber } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: { category: true, subCategory: true, division: true },
    });
    if (!item) return errorResponse("Item not found", 404);
    return jsonResponse(item);
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const {
      code, name, categoryId, unitPrice,
      description, supplier, stock, imageUrl, active, hsnCode, gstRate,
      brand, unit, taxType, subCategoryId,
      purchasePrice, purchasePriceInclTax, profitMargin,
      manageStock, alertQuantity, divisionId,
    } = body;

    if (unitPrice != null && !isValidNumber(unitPrice)) {
      return errorResponse("Unit price must be a valid number");
    }
    if (gstRate !== undefined && !isValidNumber(gstRate)) {
      return errorResponse("GST rate must be a valid number");
    }

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return errorResponse("Item not found", 404);

    if (code && code !== existing.code) {
      const duplicate = await prisma.item.findUnique({ where: { code } });
      if (duplicate) return errorResponse("Item code already exists");
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(categoryId && { categoryId }),
        ...(unitPrice != null && { unitPrice: parseFloat(unitPrice) }),
        ...(description !== undefined && { description: description || null }),
        ...(supplier !== undefined && { supplier: supplier || null }),
        ...(stock !== undefined && { stock: stock ? parseInt(stock) : null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(active !== undefined && { active }),
        ...(hsnCode !== undefined && { hsnCode: hsnCode || null }),
        ...(gstRate !== undefined && { gstRate: parseFloat(gstRate) }),
        ...(brand !== undefined && { brand: brand || null }),
        ...(unit !== undefined && { unit: unit || "Pc(s)" }),
        ...(taxType !== undefined && { taxType }),
        ...(subCategoryId !== undefined && { subCategoryId: subCategoryId || null }),
        ...(purchasePrice !== undefined && { purchasePrice: purchasePrice != null ? parseFloat(purchasePrice) : null }),
        ...(purchasePriceInclTax !== undefined && { purchasePriceInclTax: purchasePriceInclTax != null ? parseFloat(purchasePriceInclTax) : null }),
        ...(profitMargin !== undefined && { profitMargin: profitMargin != null ? parseFloat(profitMargin) : null }),
        ...(manageStock !== undefined && { manageStock }),
        ...(alertQuantity !== undefined && { alertQuantity: alertQuantity ? parseInt(alertQuantity) : 0 }),
        ...(divisionId !== undefined && { divisionId }),
      },
      include: { category: true, subCategory: true, division: true },
    });
    return jsonResponse(item);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return errorResponse("Item not found", 404);
    await prisma.item.update({ where: { id }, data: { active: false } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
