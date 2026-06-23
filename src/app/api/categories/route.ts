import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { items: true } },
        subCategories: { orderBy: { name: "asc" } },
      },
    });
    return jsonResponse(categories);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, order } = body;
    if (!name) return errorResponse("Name is required");

    const category = await prisma.category.create({
      data: { name, order: order || 0 },
    });
    return jsonResponse(category, 201);
  }, "ADMIN");
}
