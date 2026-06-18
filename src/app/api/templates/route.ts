import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const templates = await prisma.template.findMany({
      where: { active: true },
      include: {
        items: { include: { item: { include: { category: true } } } },
        _count: { select: { quotations: true } },
      },
      orderBy: { name: "asc" },
    });
    return jsonResponse(templates);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, description, items } = body;

    if (!name) return errorResponse("Name is required");

    const template = await prisma.template.create({
      data: {
        name,
        description,
        items: {
          create: (items || []).map((i: { itemId: string; quantity: number }) => ({
            itemId: i.itemId,
            quantity: i.quantity || 1,
          })),
        },
      },
      include: {
        items: { include: { item: { include: { category: true } } } },
      },
    });
    return jsonResponse(template, 201);
  }, "ADMIN");
}
