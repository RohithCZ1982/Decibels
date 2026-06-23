import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");
    const brand = searchParams.get("brand");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const all = searchParams.get("all") === "true";

    const where: Record<string, unknown> = { active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (brand) where.brand = brand;

    const include = { category: true, subCategory: true };

    if (all) {
      const items = await prisma.item.findMany({
        where,
        include,
        orderBy: { name: "asc" },
      });
      return jsonResponse(items);
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);

    return jsonResponse({ items, total, page, totalPages: Math.ceil(total / limit) });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const {
      code, name, categoryId, unitPrice,
      description, supplier, stock, imageUrl, hsnCode, gstRate,
      brand, unit, taxType, subCategoryId,
      purchasePrice, purchasePriceInclTax, profitMargin,
      manageStock, alertQuantity,
    } = body;

    if (!code || !name || !categoryId || unitPrice == null) {
      return errorResponse("Code, name, category, and unit price are required");
    }

    const existing = await prisma.item.findUnique({ where: { code } });
    if (existing) return errorResponse("Item code already exists");

    const item = await prisma.item.create({
      data: {
        code,
        name,
        categoryId,
        unitPrice: parseFloat(unitPrice),
        description: description || null,
        supplier: supplier || null,
        stock: stock ? parseInt(stock) : null,
        imageUrl: imageUrl || null,
        hsnCode: hsnCode || null,
        gstRate: gstRate != null ? parseFloat(gstRate) : 18,
        brand: brand || null,
        unit: unit || "Pc(s)",
        taxType: taxType || "exclusive",
        subCategoryId: subCategoryId || null,
        purchasePrice: purchasePrice != null ? parseFloat(purchasePrice) : null,
        purchasePriceInclTax: purchasePriceInclTax != null ? parseFloat(purchasePriceInclTax) : null,
        profitMargin: profitMargin != null ? parseFloat(profitMargin) : null,
        manageStock: manageStock ?? false,
        alertQuantity: alertQuantity ? parseInt(alertQuantity) : 0,
      },
      include: { category: true, subCategory: true },
    });
    return jsonResponse(item, 201);
  }, "ADMIN");
}
