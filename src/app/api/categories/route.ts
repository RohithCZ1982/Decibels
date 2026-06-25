import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");

    const where: Record<string, unknown> = { deleted: false };
    if (division) where.division = division;

    const categories = await prisma.category.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        _count: { select: { items: true } },
        subCategories: { where: { deleted: false }, orderBy: { name: "asc" }, include: { _count: { select: { items: true } } } },
      },
    });
    return jsonResponse(categories);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, order, hsnCode, division } = body;
    if (!name) return errorResponse("Name is required");

    const category = await prisma.category.create({
      data: { name, order: order || 0, hsnCode: hsnCode || null, division: division || "HOME_THEATER" },
    });
    return jsonResponse(category, 201);
  }, "ADMIN");
}
