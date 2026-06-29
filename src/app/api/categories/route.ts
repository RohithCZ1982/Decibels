import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get("divisionId");

    const where: Record<string, unknown> = { deleted: false };
    if (divisionId) where.divisionId = divisionId;

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        division: true,
        _count: { select: { items: { where: { active: true } } } },
        subCategories: { where: { deleted: false }, orderBy: { name: "asc" }, include: { _count: { select: { items: { where: { active: true } } } } } },
      },
    });
    return jsonResponse(categories);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, order, hsnCode, divisionId } = body;
    if (!name || !divisionId) return errorResponse("Name and division are required");

    const category = await prisma.category.create({
      data: { name, order: order || 0, hsnCode: hsnCode || null, divisionId },
      include: { division: true },
    });
    return jsonResponse(category, 201);
  }, "ADMIN");
}
