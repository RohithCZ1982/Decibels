import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const where: Record<string, unknown> = { deleted: false };
    if (categoryId) where.categoryId = categoryId;

    const subCategories = await prisma.subCategory.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { name: "asc" },
    });
    return jsonResponse(subCategories);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, categoryId, hsnCode } = body;
    if (!name || !categoryId) return errorResponse("Name and category are required");

    const subCategory = await prisma.subCategory.create({
      data: { name, categoryId, hsnCode: hsnCode || null },
    });
    return jsonResponse(subCategory, 201);
  }, "ADMIN");
}
